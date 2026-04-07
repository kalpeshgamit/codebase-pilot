import { existsSync, readFileSync, appendFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface PackRun {
  date: string;         // ISO 8601
  project: string;      // project name
  projectPath: string;  // absolute path
  tokensRaw: number;    // before compression
  tokensPacked: number; // after compression (= tokensRaw if no compress)
  files: number;
  agent?: string;
  compressed: boolean;
  command: string;       // which command generated this: pack, tokens, etc.
  // Git context (added v0.4.0)
  branch?: string;       // current git branch
  commit?: string;       // last commit message (short)
  commitHash?: string;   // short commit hash
  dirty?: number;        // number of uncommitted changes
  duration?: number;     // pack duration in ms
}

/** Collect git context by reading .git/ files directly — zero child_process. */
export function getGitContext(root: string): { branch?: string; commit?: string; commitHash?: string; dirty?: number } {
  try {
    const gitDir = join(root, '.git');
    if (!existsSync(gitDir)) return {};

    // Branch: read .git/HEAD
    let branch: string | undefined;
    const head = readFileSync(join(gitDir, 'HEAD'), 'utf8').trim();
    if (head.startsWith('ref: refs/heads/')) {
      branch = head.slice(16);
    }

    // Commit hash: resolve HEAD ref to full hash, take first 7 chars
    let commitHash: string | undefined;
    let commit: string | undefined;
    if (branch) {
      const refPath = join(gitDir, 'refs', 'heads', branch);
      if (existsSync(refPath)) {
        commitHash = readFileSync(refPath, 'utf8').trim().slice(0, 7);
      }
    } else if (/^[0-9a-f]{40}$/.test(head)) {
      commitHash = head.slice(0, 7);
    }

    // Commit message: parse .git/COMMIT_EDITMSG or last line of reflog
    const commitMsgPath = join(gitDir, 'COMMIT_EDITMSG');
    if (existsSync(commitMsgPath)) {
      commit = readFileSync(commitMsgPath, 'utf8').trim().split('\n')[0].slice(0, 100);
    } else {
      // Fallback: read reflog for last commit message
      const reflogPath = join(gitDir, 'logs', 'HEAD');
      if (existsSync(reflogPath)) {
        const lines = readFileSync(reflogPath, 'utf8').trim().split('\n');
        const last = lines[lines.length - 1] || '';
        const msgMatch = last.match(/\t(.+)$/);
        if (msgMatch) commit = msgMatch[1].replace(/^commit[^:]*: /, '').slice(0, 100);
      }
    }

    // Dirty count: not available without git CLI, estimate from index mtime
    // We skip dirty count to avoid child_process — it's a nice-to-have, not critical
    return { branch, commit, commitHash };
  } catch {
    return {};
  }
}

export interface UsageStats {
  sessions: number;
  tokensSaved: number;
  tokensUsed: number;
}

export interface ProjectSummary {
  project: string;
  projectPath: string;
  sessions: number;
  tokensSaved: number;
  tokensUsed: number;
  lastUsed: string;
}

// ---------------------------------------------------------------------------
// Global config directory: ~/.codebase-pilot/
// ---------------------------------------------------------------------------

function getGlobalDir(): string {
  const dir = join(homedir(), '.codebase-pilot');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function getGlobalLogPath(): string {
  return join(getGlobalDir(), 'history.jsonl');
}

// ---------------------------------------------------------------------------
// Logging (writes to both project + global)
// ---------------------------------------------------------------------------

export function logPackRun(root: string, run: PackRun): void {
  // Project-level log
  const projectDir = join(root, '.codebase-pilot');
  if (!existsSync(projectDir)) mkdirSync(projectDir, { recursive: true });
  appendFileSync(join(projectDir, 'usage-log.jsonl'), JSON.stringify(run) + '\n', 'utf8');

  // Global log
  appendFileSync(getGlobalLogPath(), JSON.stringify(run) + '\n', 'utf8');
}

// ---------------------------------------------------------------------------
// Reading logs
// ---------------------------------------------------------------------------

function readJsonl(path: string): PackRun[] {
  if (!existsSync(path)) return [];
  try {
    return readFileSync(path, 'utf8')
      .split('\n')
      .filter(l => l.trim())
      .map(l => JSON.parse(l) as PackRun);
  } catch {
    return [];
  }
}

export function readPackLogs(root: string): PackRun[] {
  return readJsonl(join(root, '.codebase-pilot', 'usage-log.jsonl'));
}

export function readGlobalLogs(): PackRun[] {
  return readJsonl(getGlobalLogPath());
}

// ---------------------------------------------------------------------------
// Prompt log (actual user prompts from Claude Code hooks)
// ---------------------------------------------------------------------------

export interface PromptEntry {
  date: string;
  type: 'prompt';
  project: string;
  projectPath: string;
  sessionId?: string;
  prompt: string;
  promptLength: number;
  branch?: string;
}

export function readPromptLogs(): PromptEntry[] {
  const path = join(getGlobalDir(), 'prompts.jsonl');
  if (!existsSync(path)) return [];
  try {
    return readFileSync(path, 'utf8')
      .split('\n')
      .filter(l => l.trim())
      .map(l => JSON.parse(l) as PromptEntry);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Stats computation
// ---------------------------------------------------------------------------

/** Sanitize a log entry — guard every numeric field against undefined/NaN */
function safe(l: PackRun): { raw: number; packed: number } {
  const raw = Number(l.tokensRaw) || 0;
  const packed = Number(l.tokensPacked) || 0;
  return { raw, packed };
}

export function getStats(logs: PackRun[], days: number): UsageStats {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const recent = logs.filter(l => new Date(l.date) >= cutoff);
  return {
    sessions: recent.length,
    tokensSaved: recent.reduce((sum, l) => { const s = safe(l); return sum + Math.max(0, s.raw - s.packed); }, 0),
    tokensUsed: recent.reduce((sum, l) => sum + safe(l).packed, 0),
  };
}

export function getProjectSummaries(logs: PackRun[]): ProjectSummary[] {
  const byProject = new Map<string, PackRun[]>();

  for (const log of logs) {
    const key = log.projectPath || log.project;
    if (!byProject.has(key)) byProject.set(key, []);
    byProject.get(key)!.push(log);
  }

  const summaries: ProjectSummary[] = [];
  for (const [, runs] of byProject) {
    runs.sort((a, b) => b.date.localeCompare(a.date));
    summaries.push({
      project: runs[0].project,
      projectPath: runs[0].projectPath,
      sessions: runs.length,
      tokensSaved: runs.reduce((sum, l) => { const s = safe(l); return sum + Math.max(0, s.raw - s.packed); }, 0),
      tokensUsed: runs.reduce((sum, l) => sum + safe(l).packed, 0),
      lastUsed: runs[0].date,
    });
  }

  summaries.sort((a, b) => b.lastUsed.localeCompare(a.lastUsed));
  return summaries;
}

export function getRecentRuns(logs: PackRun[], limit: number): PackRun[] {
  return [...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

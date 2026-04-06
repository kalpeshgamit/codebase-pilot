import { existsSync, readFileSync, appendFileSync, mkdirSync } from 'node:fs';
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
// Stats computation
// ---------------------------------------------------------------------------

export function getStats(logs: PackRun[], days: number): UsageStats {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const recent = logs.filter(l => new Date(l.date) >= cutoff);
  return {
    sessions: recent.length,
    tokensSaved: recent.reduce((sum, l) => sum + (l.tokensRaw - l.tokensPacked), 0),
    tokensUsed: recent.reduce((sum, l) => sum + l.tokensPacked, 0),
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
  for (const [key, runs] of byProject) {
    runs.sort((a, b) => b.date.localeCompare(a.date));
    summaries.push({
      project: runs[0].project,
      projectPath: runs[0].projectPath,
      sessions: runs.length,
      tokensSaved: runs.reduce((sum, l) => sum + (l.tokensRaw - l.tokensPacked), 0),
      tokensUsed: runs.reduce((sum, l) => sum + l.tokensPacked, 0),
      lastUsed: runs[0].date,
    });
  }

  summaries.sort((a, b) => b.lastUsed.localeCompare(a.lastUsed));
  return summaries;
}

export function getRecentRuns(logs: PackRun[], limit: number): PackRun[] {
  return [...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

import { existsSync, readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export interface PackRun {
  date: string;       // ISO 8601
  tokensRaw: number;  // before compression
  tokensPacked: number; // after compression (= tokensRaw if no compress)
  files: number;
  agent?: string;
  compressed: boolean;
}

export interface UsageStats {
  sessions: number;
  tokensSaved: number;
}

export function logPackRun(root: string, run: PackRun): void {
  const dir = join(root, '.codebase-pilot');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  appendFileSync(join(dir, 'usage-log.jsonl'), JSON.stringify(run) + '\n', 'utf8');
}

export function readPackLogs(root: string): PackRun[] {
  const logPath = join(root, '.codebase-pilot', 'usage-log.jsonl');
  if (!existsSync(logPath)) return [];
  try {
    return readFileSync(logPath, 'utf8')
      .split('\n')
      .filter(l => l.trim())
      .map(l => JSON.parse(l) as PackRun);
  } catch {
    return [];
  }
}

export function getStats(logs: PackRun[], days: number): UsageStats {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const recent = logs.filter(l => new Date(l.date) >= cutoff);
  return {
    sessions: recent.length,
    tokensSaved: recent.reduce((sum, l) => sum + (l.tokensRaw - l.tokensPacked), 0),
  };
}

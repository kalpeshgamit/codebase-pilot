import { spawnSync } from 'node:child_process';
import { tokenizeTask } from './task-selector.js';

export interface GitSignals {
  stagedFiles: string[];
  unstagedFiles: string[];
  branchName: string;
  commitMessages: string[];
  hasUsefulSignals: boolean;
}

export const GENERIC_BRANCHES = new Set([
  'main', 'master', 'dev', 'develop', 'development',
  'staging', 'production', 'release', 'hotfix', 'HEAD', '',
]);

function git(root: string, args: string[]): string {
  try {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
    if (result.status !== 0 || result.error) return '';
    return result.stdout ?? '';
  } catch {
    return '';
  }
}

function parseLines(output: string): string[] {
  return output.split('\n').map(l => l.trim()).filter(Boolean);
}

export function extractGitSignals(root: string): GitSignals {
  try {
    const stagedRaw = git(root, ['diff', '--cached', '--name-only']);
    const unstagedRaw = git(root, ['diff', 'HEAD', '--name-only']);
    const branchName = git(root, ['branch', '--show-current']).trim();
    const logRaw = git(root, ['log', '-5', '--format=%s']);

    const stagedSet = new Set(parseLines(stagedRaw));
    const allUnstaged = parseLines(unstagedRaw);

    // Deduplicate — unstaged diff may include staged files
    const unstagedFiles = allUnstaged.filter(f => !stagedSet.has(f));
    const stagedFiles = [...stagedSet];
    const commitMessages = parseLines(logRaw);

    const hasUsefulSignals =
      stagedFiles.length > 0 ||
      unstagedFiles.length > 0 ||
      (!GENERIC_BRANCHES.has(branchName) && branchName.length > 0) ||
      commitMessages.some(m => tokenizeTask(m).length > 0);

    return { stagedFiles, unstagedFiles, branchName, commitMessages, hasUsefulSignals };
  } catch {
    return {
      stagedFiles: [],
      unstagedFiles: [],
      branchName: '',
      commitMessages: [],
      hasUsefulSignals: false,
    };
  }
}

export function synthesizeQuery(signals: GitSignals): string {
  const tokens: string[] = [];

  // Branch name — tokenize on separators
  if (!GENERIC_BRANCHES.has(signals.branchName) && signals.branchName.length > 0) {
    const branchTokens = tokenizeTask(signals.branchName.replace(/[/_-]/g, ' '));
    tokens.push(...branchTokens);
  }

  // Commit messages
  for (const msg of signals.commitMessages) {
    tokens.push(...tokenizeTask(msg));
  }

  // Deduplicate and filter purely numeric tokens (JIRA-1234 → skip '1234')
  const unique = [...new Set(tokens)].filter(t => !/^\d+$/.test(t));
  return unique.join(' OR ');
}

export function inferTaskDescription(signals: GitSignals): string {
  const tokens: string[] = [];

  if (!GENERIC_BRANCHES.has(signals.branchName) && signals.branchName.length > 0) {
    tokens.push(...tokenizeTask(signals.branchName.replace(/[/_-]/g, ' ')));
  }

  for (const msg of signals.commitMessages) {
    tokens.push(...tokenizeTask(msg));
  }

  const unique = [...new Set(tokens)].filter(t => !/^\d+$/.test(t));
  if (unique.length === 0) return '(no description — diff files only)';

  const desc = unique.join(' ');
  return desc.length > 60 ? desc.slice(0, 57) + '...' : desc;
}

export function buildSignalSummary(signals: GitSignals): string {
  const parts: string[] = [];
  if (signals.stagedFiles.length > 0) parts.push(`${signals.stagedFiles.length} staged`);
  if (signals.unstagedFiles.length > 0) parts.push(`${signals.unstagedFiles.length} unstaged`);
  if (signals.branchName && !GENERIC_BRANCHES.has(signals.branchName)) {
    parts.push(`branch "${signals.branchName}"`);
  }
  if (signals.commitMessages.length > 0) {
    parts.push(`${signals.commitMessages.length} commit${signals.commitMessages.length !== 1 ? 's' : ''}`);
  }
  return parts.join(', ');
}

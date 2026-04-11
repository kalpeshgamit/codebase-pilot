import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { collectFiles } from '../packer/collector.js';
import { countTokens, formatTokenCount, estimateCost } from '../packer/token-counter.js';
import { readPackLogs, getStats } from '../packer/usage-logger.js';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AgentsConfig } from '../types.js';

interface TokensCommandOptions {
  dir: string;
  sort: string;
  limit: string;
  agent?: string;
  fix?: boolean;
}

export async function tokensCommand(options: TokensCommandOptions): Promise<void> {
  const root = resolve(options.dir);
  const sortBy = options.sort === 'name' ? 'name' : 'size';
  const limit = parseInt(options.limit, 10) || 20;

  console.log('');

  // Resolve agent context if specified
  let agentContextPaths: string[] | undefined;
  if (options.agent) {
    agentContextPaths = resolveAgentPaths(root, options.agent) ?? undefined;
    if (!agentContextPaths) {
      console.log(`  Error: Agent "${options.agent}" not found in .codebase-pilot/agents.json`);
      console.log('');
      process.exitCode = 1;
      return;
    }
    console.log(`  Token count for agent: ${options.agent}`);
  } else {
    console.log('  Token count by file:');
  }
  console.log('');

  const files = collectFiles(root, { agentContextPaths });

  if (files.length === 0) {
    console.log('  No files found.');
    console.log('');
    return;
  }

  // Sort
  const sorted = [...files];
  if (sortBy === 'size') {
    sorted.sort((a, b) => b.tokens - a.tokens);
  } else {
    sorted.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  }

  const totalTokens = files.reduce((sum, f) => sum + f.tokens, 0);
  const display = sorted.slice(0, limit);
  const maxPathLen = Math.min(40, Math.max(...display.map(f => f.relativePath.length)));
  const maxTokens = display[0]?.tokens || 1;

  for (const file of display) {
    const pct = totalTokens > 0 ? Math.round((file.tokens / totalTokens) * 100) : 0;
    const barLen = Math.round((file.tokens / maxTokens) * 16);
    const bar = '\u2588'.repeat(barLen) + '\u2591'.repeat(16 - barLen);
    const path = file.relativePath.padEnd(maxPathLen);
    const tokens = formatTokenCount(file.tokens).padStart(8);
    console.log(`    ${path}  ${tokens} tokens  ${bar}  ${pct}%`);
  }

  if (files.length > limit) {
    console.log(`    ... and ${files.length - limit} more files`);
  }

  console.log('');
  console.log(`  Total: ${formatTokenCount(totalTokens)} tokens across ${files.length} files`);

  // Savings estimate
  const compressedEstimate = Math.round(totalTokens * 0.4);
  const savingsEstimate = totalTokens - compressedEstimate;
  console.log('');
  console.log('  Savings estimate (per session):');
  console.log(`    Without codebase-pilot:   ~${formatTokenCount(totalTokens)} tokens  (manual file reads)`);
  console.log(`    With pack --compress:      ~${formatTokenCount(compressedEstimate)} tokens`);
  console.log(`    Pilot saves:              ~${formatTokenCount(savingsEstimate)} tokens per session`);

  // Usage stats from pack log
  const logs = readPackLogs(root);
  if (logs.length > 0) {
    const today = getStats(logs, 1);
    const week = getStats(logs, 7);
    console.log('');
    console.log('  Your savings (from pack runs):');
    console.log(`    Today:      ${today.sessions} session${today.sessions !== 1 ? 's' : ''}  — ~${formatTokenCount(today.tokensSaved)} tokens saved`);
    console.log(`    This week:  ${week.sessions} session${week.sessions !== 1 ? 's' : ''}  — ~${formatTokenCount(week.tokensSaved)} tokens saved`);
  }

  // CLAUDE.md audit
  await auditClaudeMd(root);

  // Prompt caching candidates — high tokens, rarely changed files
  await showCachingCandidates(root, files);

  // --fix: actionable suggestions
  if (options.fix) {
    showFixSuggestions(root, files, totalTokens);
  }

  console.log('');
}

async function auditClaudeMd(root: string): Promise<void> {
  const PROMPTS_PER_DAY = 200;
  const PRICE_PER_M = 3; // Claude Sonnet input $/1M tokens
  const HIGH_THRESHOLD = 500;

  // Find all CLAUDE.md files in the project
  const candidates = [
    join(root, 'CLAUDE.md'),
    join(root, '.claude', 'CLAUDE.md'),
  ];

  // Also check monorepo packages
  for (const dir of ['packages', 'apps', 'services']) {
    const base = join(root, dir);
    if (existsSync(base)) {
      try {
        const entries = (await import('node:fs')).readdirSync(base, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            candidates.push(join(base, entry.name, 'CLAUDE.md'));
          }
        }
      } catch { /* ignore */ }
    }
  }

  const found: Array<{ path: string; rel: string; tokens: number }> = [];
  for (const p of candidates) {
    if (existsSync(p)) {
      const content = readFileSync(p, 'utf8');
      const tokens = countTokens(content);
      const rel = p.replace(root + '/', '');
      found.push({ path: p, rel, tokens });
    }
  }

  if (found.length === 0) return;

  console.log('');
  console.log('  CLAUDE.md audit (loads on every prompt):');
  console.log('');

  let hasWarning = false;
  for (const f of found.sort((a, b) => b.tokens - a.tokens)) {
    const weekly = Math.round((f.tokens / 1_000_000) * PRICE_PER_M * PROMPTS_PER_DAY * 7 * 100) / 100;
    const flag = f.tokens > HIGH_THRESHOLD ? '\x1b[33m⚠\x1b[0m' : '\x1b[32m✓\x1b[0m';
    const cost = weekly < 0.01 ? '<$0.01' : `$${weekly.toFixed(2)}`;
    console.log(`    ${flag}  ${f.rel.padEnd(32)}  ${formatTokenCount(f.tokens).padStart(6)} tokens  ~${cost}/week`);
    if (f.tokens > HIGH_THRESHOLD) hasWarning = true;
  }

  if (hasWarning) {
    console.log('');
    console.log('  \x1b[33mTips to reduce CLAUDE.md tokens:\x1b[0m');
    console.log('    → Replace prose paragraphs with bullet points');
    console.log('    → Remove code examples (link to files instead)');
    console.log('    → Delete commented-out sections and TODO notes');
    console.log('    → Keep only facts: stack, rules, paths — no explanations');
  }
}

// Issue #6: Prompt caching candidates — static files with high token cost
async function showCachingCandidates(
  root: string,
  files: Array<{ relativePath: string; tokens: number }>,
): Promise<void> {
  const HIGH_TOKEN_THRESHOLD = 2000;
  const MAX_COMMITS_STABLE = 3;

  let commitCounts: Map<string, number> | null = null;
  try {
    const result = spawnSync(
      'git',
      ['log', '--since=90 days ago', '--name-only', '--format='],
      { cwd: root, encoding: 'utf8' },
    );
    if (result.status === 0 && result.stdout) {
      commitCounts = new Map<string, number>();
      for (const line of result.stdout.split('\n')) {
        const f = line.trim();
        if (f) commitCounts.set(f, (commitCounts.get(f) ?? 0) + 1);
      }
    }
  } catch { /* not a git repo — skip */ }

  if (!commitCounts) return;

  const candidates = files
    .filter(f => f.tokens >= HIGH_TOKEN_THRESHOLD && (commitCounts!.get(f.relativePath) ?? 0) <= MAX_COMMITS_STABLE)
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 5);

  if (candidates.length === 0) return;

  console.log('');
  console.log('  Prompt caching candidates (stable + high-token):');
  console.log('');
  for (const f of candidates) {
    const commits = commitCounts.get(f.relativePath) ?? 0;
    const changeLabel = commits === 0 ? 'never changed' : `${commits} commit${commits !== 1 ? 's' : ''} in 90d`;
    console.log(`    \x1b[36m◆\x1b[0m  ${f.relativePath.padEnd(40)}  ${formatTokenCount(f.tokens).padStart(6)} tokens  ${changeLabel}`);
  }
  console.log('');
  console.log('  \x1b[36mTip:\x1b[0m Claude API prompt caching saves ~90% on repeated reads of stable files.');
  console.log('       Add these to a dedicated context file and enable cache_control: ephemeral.');
}

// Issue #4: Actionable fix suggestions
function showFixSuggestions(
  root: string,
  files: Array<{ relativePath: string; tokens: number }>,
  totalTokens: number,
): void {
  const IGNORE_THRESHOLD = 1000;
  const PRUNE_THRESHOLD = 3000;
  const SPLIT_THRESHOLD = 10000;

  const NON_SOURCE_EXTS = new Set(['.md', '.json', '.yaml', '.yml', '.toml', '.txt', '.csv', '.lock', '.html', '.svg']);

  const ignoreTargets: typeof files = [];
  const pruneTargets: typeof files = [];
  const splitTargets: typeof files = [];

  for (const f of files) {
    const ext = f.relativePath.includes('.') ? '.' + f.relativePath.split('.').pop()! : '';
    if (f.tokens >= SPLIT_THRESHOLD) {
      splitTargets.push(f);
    } else if (f.tokens >= PRUNE_THRESHOLD) {
      pruneTargets.push(f);
    } else if (f.tokens >= IGNORE_THRESHOLD && NON_SOURCE_EXTS.has(ext)) {
      ignoreTargets.push(f);
    }
  }

  const hasSuggestions = ignoreTargets.length > 0 || pruneTargets.length > 0 || splitTargets.length > 0;
  if (!hasSuggestions) {
    console.log('');
    console.log('  \x1b[32m✓ No fix suggestions — token usage looks optimal\x1b[0m');
    return;
  }

  console.log('');
  console.log('  Fix suggestions:');

  if (ignoreTargets.length > 0) {
    console.log('');
    console.log('  \x1b[33mAdd to .claudeignore\x1b[0m (non-source files consuming tokens):');
    for (const f of ignoreTargets.slice(0, 5)) {
      console.log(`    ${formatTokenCount(f.tokens).padStart(6)} tokens  ${f.relativePath}`);
    }
    console.log('');
    console.log('  \x1b[36mRun:\x1b[0m');
    for (const f of ignoreTargets.slice(0, 5)) {
      console.log(`    echo "${f.relativePath}" >> .claudeignore`);
    }
  }

  if (pruneTargets.length > 0) {
    console.log('');
    console.log('  \x1b[33mConsider --prune\x1b[0m (large files — pack only their dependants):');
    for (const f of pruneTargets.slice(0, 3)) {
      console.log(`    ${formatTokenCount(f.tokens).padStart(6)} tokens  ${f.relativePath}`);
      console.log(`             \x1b[36mcodebase-pilot pack --prune ${f.relativePath}\x1b[0m`);
    }
  }

  if (splitTargets.length > 0) {
    console.log('');
    console.log('  \x1b[33mConsider splitting\x1b[0m (very large files — likely doing too much):');
    for (const f of splitTargets.slice(0, 3)) {
      console.log(`    ${formatTokenCount(f.tokens).padStart(6)} tokens  ${f.relativePath}  \x1b[90m(>10k tokens — split into modules)\x1b[0m`);
    }
  }

  const fixableTokens = [...ignoreTargets, ...pruneTargets.slice(0, 3)].reduce((s, f) => s + f.tokens, 0);
  if (fixableTokens > 0) {
    const pct = Math.round((fixableTokens / totalTokens) * 100);
    console.log('');
    console.log(`  Potential savings: ~${formatTokenCount(fixableTokens)} tokens (${pct}% of total)`);
  }
}

function resolveAgentPaths(root: string, agentName: string): string[] | null {
  const agentsPath = join(root, '.codebase-pilot', 'agents.json');
  if (!existsSync(agentsPath)) return null;
  try {
    const config: AgentsConfig = JSON.parse(readFileSync(agentsPath, 'utf8'));
    const agent = config.agents[agentName];
    if (!agent) return null;
    return agent.context.filter(
      p => p !== 'ALL agent outputs' && p !== 'Agent execution logs',
    );
  } catch {
    return null;
  }
}

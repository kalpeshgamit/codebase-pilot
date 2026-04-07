import { resolve, basename } from 'node:path';
import { collectFiles } from '../packer/collector.js';
import { countTokens, formatTokenCount, estimateCost } from '../packer/token-counter.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface CompareOptions {
  dir: string;
  base?: string;
}

function getGitDiff(root: string, base: string): string[] {
  try {
    // Read .git/HEAD for current branch, then use merge-base via file reads
    // Fallback: list all tracked files and compare
    const head = readFileSync(join(root, '.git', 'HEAD'), 'utf8').trim();
    const branch = head.startsWith('ref: refs/heads/') ? head.slice(16) : 'HEAD';

    // Try to read diff using reflog — compare current vs base
    // Since we avoid child_process, we compare file hashes instead
    return [];
  } catch {
    return [];
  }
}

export async function compareCommand(options: CompareOptions): Promise<void> {
  const root = resolve(options.dir);
  const project = basename(root);
  const base = options.base || 'main';

  console.log('');
  console.log(`  Comparing: current state vs ${base}`);
  console.log(`  Project:   ${project}`);
  console.log('');

  // Collect current files and compute tokens
  const files = collectFiles(root, {});
  const totalTokens = files.reduce((s, f) => s + f.tokens, 0);
  const totalFiles = files.length;

  // Try to load previous hash state for comparison
  const hashPath = join(root, '.codebase-pilot', 'file-hashes.json');
  let prevHashes: Map<string, { path: string; hash: string; size: number }> = new Map();
  try {
    const data = JSON.parse(readFileSync(hashPath, 'utf8')) as Array<{ path: string; hash: string; size: number }>;
    prevHashes = new Map(data.map(h => [h.path, h]));
  } catch { /* no previous state */ }

  if (prevHashes.size === 0) {
    console.log('  No previous state found. Run `codebase-pilot pack --affected` first to index.');
    console.log('');
    console.log(`  Current state: ${totalFiles} files, ~${formatTokenCount(totalTokens)} tokens (~${estimateCost(totalTokens)}/prompt)`);
    console.log('');
    return;
  }

  // Compute diffs
  const added: typeof files = [];
  const modified: typeof files = [];
  const unchanged: typeof files = [];
  const deleted: string[] = [];
  const currentPaths = new Set<string>();

  for (const f of files) {
    currentPaths.add(f.relativePath);
    const prev = prevHashes.get(f.relativePath);
    if (!prev) {
      added.push(f);
    } else {
      const { createHash } = await import('node:crypto');
      const hash = createHash('sha256').update(f.content).digest('hex').slice(0, 16);
      if (prev.hash !== hash) {
        modified.push(f);
      } else {
        unchanged.push(f);
      }
    }
  }

  for (const [path] of prevHashes) {
    if (!currentPaths.has(path)) deleted.push(path);
  }

  const addedTokens = added.reduce((s, f) => s + f.tokens, 0);
  const modifiedTokens = modified.reduce((s, f) => s + f.tokens, 0);
  const prevModifiedTokens = modified.reduce((s, f) => s + (prevHashes.get(f.relativePath)?.size ? Math.ceil(prevHashes.get(f.relativePath)!.size / 4) : 0), 0);
  const tokenDelta = addedTokens + (modifiedTokens - prevModifiedTokens);

  // Output
  console.log('  Changes:');
  if (added.length > 0) console.log(`    \x1b[32m+ ${added.length} added\x1b[0m (${formatTokenCount(addedTokens)} tokens)`);
  if (modified.length > 0) console.log(`    \x1b[33m~ ${modified.length} modified\x1b[0m (${formatTokenCount(modifiedTokens)} tokens now, was ${formatTokenCount(prevModifiedTokens)})`);
  if (deleted.length > 0) console.log(`    \x1b[31m- ${deleted.length} deleted\x1b[0m`);
  console.log(`    = ${unchanged.length} unchanged`);
  console.log('');

  // Token impact
  const direction = tokenDelta > 0 ? '\x1b[31m+' : tokenDelta < 0 ? '\x1b[32m' : '';
  const sign = tokenDelta > 0 ? '+' : '';
  console.log(`  Token impact: ${direction}${sign}${formatTokenCount(tokenDelta)}\x1b[0m tokens (${sign}${estimateCost(Math.abs(tokenDelta))} per prompt)`);
  console.log(`  Total now:    ${formatTokenCount(totalTokens)} tokens (~${estimateCost(totalTokens)}/prompt)`);
  console.log('');

  // Top changes by token impact
  if (added.length + modified.length > 0) {
    const allChanged = [...added.map(f => ({ ...f, type: 'added' })), ...modified.map(f => ({ ...f, type: 'modified' }))];
    allChanged.sort((a, b) => b.tokens - a.tokens);
    console.log('  Top changes by tokens:');
    for (const f of allChanged.slice(0, 8)) {
      const badge = f.type === 'added' ? '\x1b[32m+\x1b[0m' : '\x1b[33m~\x1b[0m';
      console.log(`    ${badge} ${formatTokenCount(f.tokens).padStart(8)} tokens  ${f.relativePath}`);
    }
    console.log('');
  }
}

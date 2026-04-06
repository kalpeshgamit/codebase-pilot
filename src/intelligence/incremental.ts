import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { collectFiles } from '../packer/collector.js';

export interface FileHash {
  path: string;
  hash: string;
  size: number;
}

export interface IncrementalResult {
  added: string[];
  modified: string[];
  deleted: string[];
  unchanged: number;
  isFirstRun: boolean;
}

const HASH_FILE = 'file-hashes.json';

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function getHashPath(root: string): string {
  return join(root, '.codebase-pilot', HASH_FILE);
}

function loadHashes(root: string): Map<string, FileHash> {
  const hashPath = getHashPath(root);
  if (!existsSync(hashPath)) return new Map();

  try {
    const data: FileHash[] = JSON.parse(readFileSync(hashPath, 'utf8'));
    return new Map(data.map(h => [h.path, h]));
  } catch {
    return new Map();
  }
}

function saveHashes(root: string, hashes: Map<string, FileHash>): void {
  const dir = join(root, '.codebase-pilot');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(getHashPath(root), JSON.stringify([...hashes.values()], null, 2), 'utf8');
}

export function detectChanges(root: string): IncrementalResult {
  const previousHashes = loadHashes(root);
  const isFirstRun = previousHashes.size === 0;

  const files = collectFiles(root, {});
  const currentHashes = new Map<string, FileHash>();

  const added: string[] = [];
  const modified: string[] = [];
  let unchanged = 0;

  for (const file of files) {
    const hash = hashContent(file.content);
    const entry: FileHash = { path: file.relativePath, hash, size: file.content.length };
    currentHashes.set(file.relativePath, entry);

    const prev = previousHashes.get(file.relativePath);
    if (!prev) {
      added.push(file.relativePath);
    } else if (prev.hash !== hash) {
      modified.push(file.relativePath);
    } else {
      unchanged++;
    }
  }

  // Detect deletions
  const deleted: string[] = [];
  for (const [path] of previousHashes) {
    if (!currentHashes.has(path)) {
      deleted.push(path);
    }
  }

  // Save current state
  saveHashes(root, currentHashes);

  return { added, modified, deleted, unchanged, isFirstRun };
}

export function hasChanges(root: string): boolean {
  const result = detectChanges(root);
  return result.added.length > 0 || result.modified.length > 0 || result.deleted.length > 0;
}

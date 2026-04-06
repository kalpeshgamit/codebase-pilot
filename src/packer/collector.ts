import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname, basename } from 'node:path';
import { getSkipDirs, getLanguageByExt } from '../registry/index.js';
import { toPosix } from '../utils.js';

export interface CollectedFile {
  relativePath: string;
  content: string;
  language: string | null;
  tokens: number;
}

export interface CollectOptions {
  agentContextPaths?: string[];
  claudeignorePatterns?: string[];
}

// Max file size: 1MB — prevents hangs on minified files (#975, #903 fix)
const MAX_FILE_SIZE = 1_048_576;

// Skipped file tracking for warnings (#752 fix — never silently skip)
const skippedFiles: Array<{ path: string; reason: string }> = [];

export function getSkippedFiles(): Array<{ path: string; reason: string }> {
  return skippedFiles;
}

export function collectFiles(root: string, options: CollectOptions): CollectedFile[] {
  const skipDirs = getSkipDirs();
  const claudeignore = loadClaudeignore(root);
  const files: CollectedFile[] = [];

  function walk(dir: string, depth: number): void {
    if (depth > 10) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.startsWith('.') && entry !== '.') {
        // Allow .claudeignore itself to be read but skip dot dirs/files
        continue;
      }
      if (skipDirs.has(entry)) continue;

      const fullPath = join(dir, entry);
      const relPath = toPosix(relative(root, fullPath));

      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        walk(fullPath, depth + 1);
      } else if (stat.isFile()) {
        // Skip .env files
        if (basename(entry) === '.env' || basename(entry).startsWith('.env.')) continue;

        // Skip by .claudeignore patterns
        if (matchesClaudeignore(relPath, claudeignore)) continue;

        // Skip if agent scoping is active and file is outside context
        if (options.agentContextPaths && options.agentContextPaths.length > 0) {
          const inScope = options.agentContextPaths.some(ctx => {
            // Normalize: strip leading ./ from context paths
            const normalized = ctx.replace(/^\.\//, '');
            return relPath.startsWith(normalized) || relPath === normalized.replace(/\/$/, '');
          });
          if (!inScope) continue;
        }

        // Skip binary files by extension
        if (isBinaryExt(extname(entry))) {
          skippedFiles.push({ path: relPath, reason: 'binary extension' });
          continue;
        }

        // Skip files exceeding size limit (#975 fix — prevents hang on minified files)
        if (stat.size > MAX_FILE_SIZE) {
          skippedFiles.push({ path: relPath, reason: `exceeds ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB limit (${(stat.size / 1024 / 1024).toFixed(1)}MB)` });
          continue;
        }

        // Skip empty files gracefully (#869 fix)
        if (stat.size === 0) continue;

        try {
          const content = readFileSync(fullPath, 'utf8');

          // Skip files with binary content (null bytes = binary, #752 fix)
          if (content.includes('\0')) {
            skippedFiles.push({ path: relPath, reason: 'binary content (null bytes)' });
            continue;
          }

          const ext = extname(entry);
          const lang = getLanguageByExt(ext) || getLanguageByExt(ext.toLowerCase());

          files.push({
            relativePath: relPath,
            content,
            language: lang?.name ?? null,
            tokens: Math.ceil(content.length / 4),
          });
        } catch {
          // File can't be read as UTF-8 — warn, don't silently skip (#752 fix)
          skippedFiles.push({ path: relPath, reason: 'not valid UTF-8' });
        }
      }
    }
  }

  walk(root, 0);
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function loadClaudeignore(root: string): string[] {
  const patterns: string[] = [];

  // Load .claudeignore
  const ignorePath = join(root, '.claudeignore');
  if (existsSync(ignorePath)) {
    try {
      const lines = readFileSync(ignorePath, 'utf8')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'));
      patterns.push(...lines);
    } catch { /* ignore */ }
  }

  // Load .gitignore (#776 fix — respect gitignore when scanning)
  const gitignorePath = join(root, '.gitignore');
  if (existsSync(gitignorePath)) {
    try {
      const lines = readFileSync(gitignorePath, 'utf8')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'));
      patterns.push(...lines);
    } catch { /* ignore */ }
  }

  // Load .git/info/exclude (#375 fix — often used for local-only ignores)
  const excludePath = join(root, '.git', 'info', 'exclude');
  if (existsSync(excludePath)) {
    try {
      const lines = readFileSync(excludePath, 'utf8')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'));
      patterns.push(...lines);
    } catch { /* ignore */ }
  }

  return patterns;
}

function matchesClaudeignore(filePath: string, patterns: string[]): boolean {
  const segments = filePath.split('/');

  for (const pattern of patterns) {
    if (pattern.endsWith('/')) {
      // Directory pattern — match ANY segment, not just prefix (#91 fix)
      const dirName = pattern.slice(0, -1);
      if (segments.some(s => s === dirName)) return true;
      // Also match as path prefix
      if (filePath.startsWith(pattern) || filePath.includes('/' + pattern)) return true;
    } else if (pattern.startsWith('*.')) {
      // Extension pattern
      if (filePath.endsWith(pattern.slice(1))) return true;
    } else if (pattern.startsWith('**/')) {
      // Recursive glob — match anywhere in path
      const rest = pattern.slice(3);
      if (rest.endsWith('/')) {
        const dirName = rest.slice(0, -1);
        if (segments.some(s => s === dirName)) return true;
      } else if (rest.includes('*')) {
        const regex = new RegExp(rest.replace(/\*/g, '[^/]*'));
        if (segments.some(s => regex.test(s))) return true;
      } else {
        if (segments.some(s => s === rest)) return true;
      }
    } else if (pattern.includes('*')) {
      // Wildcard glob
      const regex = new RegExp('^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$');
      if (regex.test(filePath)) return true;
    } else {
      // Exact match or path prefix
      if (filePath === pattern || filePath.startsWith(pattern + '/')) return true;
      // Segment match — e.g. "bin" matches "packages/api/bin/foo.js"
      if (!pattern.includes('/') && segments.some(s => s === pattern)) return true;
    }
  }
  return false;
}

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.exe', '.dll', '.so', '.dylib', '.o', '.a',
  '.mp3', '.mp4', '.wav', '.avi', '.mov',
  '.sqlite', '.db', '.wasm',
]);

function isBinaryExt(ext: string): boolean {
  return BINARY_EXTENSIONS.has(ext.toLowerCase());
}

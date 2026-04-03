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

        // Skip binary files (simple heuristic)
        if (isBinaryExt(extname(entry))) continue;

        try {
          const content = readFileSync(fullPath, 'utf8');
          const ext = extname(entry);
          const lang = getLanguageByExt(ext) || getLanguageByExt(ext.toLowerCase());

          files.push({
            relativePath: relPath,
            content,
            language: lang?.name ?? null,
            tokens: Math.ceil(content.length / 4),
          });
        } catch {
          // Skip files that can't be read as utf8
        }
      }
    }
  }

  walk(root, 0);
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function loadClaudeignore(root: string): string[] {
  const ignorePath = join(root, '.claudeignore');
  if (!existsSync(ignorePath)) return [];
  try {
    return readFileSync(ignorePath, 'utf8')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));
  } catch {
    return [];
  }
}

function matchesClaudeignore(filePath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    // Simple glob matching
    if (pattern.endsWith('/')) {
      // Directory pattern
      if (filePath.startsWith(pattern) || filePath.includes('/' + pattern)) return true;
    } else if (pattern.startsWith('*.')) {
      // Extension pattern
      if (filePath.endsWith(pattern.slice(1))) return true;
    } else if (pattern.includes('*')) {
      // Simple wildcard
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      if (regex.test(filePath)) return true;
    } else {
      // Exact match or path prefix
      if (filePath === pattern || filePath.startsWith(pattern + '/')) return true;
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

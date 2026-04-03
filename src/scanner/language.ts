import { readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import type { LanguageInfo } from '../types.js';

const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.py': 'Python',
  '.go': 'Go',
  '.rs': 'Rust',
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.cs': 'C#',
  '.cpp': 'C++',
  '.c': 'C',
  '.swift': 'Swift',
  '.dart': 'Dart',
  '.scala': 'Scala',
  '.ex': 'Elixir',
  '.exs': 'Elixir',
  '.zig': 'Zig',
  '.lua': 'Lua',
  '.r': 'R',
  '.R': 'R',
};

const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'build', 'out', '.git', '.next', '.nuxt',
  '__pycache__', '.venv', 'venv', 'target', 'vendor', 'coverage',
  '.turbo', '.cache', '.codebase-pilot',
]);

export function detectLanguages(root: string): LanguageInfo[] {
  const counts: Record<string, { extensions: Set<string>; count: number }> = {};
  let total = 0;

  function walk(dir: string, depth = 0): void {
    if (depth > 6) return;

    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.startsWith('.') && entry !== '.') continue;
      if (SKIP_DIRS.has(entry)) continue;

      const fullPath = join(dir, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        walk(fullPath, depth + 1);
      } else if (stat.isFile()) {
        const ext = extname(entry).toLowerCase();
        const lang = LANGUAGE_MAP[ext];
        if (lang) {
          if (!counts[lang]) counts[lang] = { extensions: new Set(), count: 0 };
          counts[lang].extensions.add(ext);
          counts[lang].count++;
          total++;
        }
      }
    }
  }

  walk(root);

  if (total === 0) return [];

  return Object.entries(counts)
    .map(([name, { extensions, count }]) => ({
      name,
      extensions: [...extensions],
      percentage: Math.round((count / total) * 100),
      fileCount: count,
    }))
    .sort((a, b) => b.fileCount - a.fileCount);
}

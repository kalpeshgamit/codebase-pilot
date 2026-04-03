import { readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import type { LanguageInfo } from '../types.js';
import { getLanguageByExt, getSkipDirs } from '../registry/index.js';

const SKIP_DIRS = getSkipDirs();

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
        const ext = extname(entry);
        const lang = getLanguageByExt(ext) || getLanguageByExt(ext.toLowerCase());
        if (lang) {
          if (!counts[lang.name]) counts[lang.name] = { extensions: new Set(), count: 0 };
          counts[lang.name].extensions.add(ext);
          counts[lang.name].count++;
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

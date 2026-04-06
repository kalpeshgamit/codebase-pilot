import { resolve } from 'node:path';
import { createSearchIndex } from '../intelligence/search.js';

interface SearchOptions {
  dir: string;
  rebuild: boolean;
  limit: string;
}

export async function searchCommand(
  query: string,
  options: SearchOptions,
): Promise<void> {
  const root = resolve(options.dir);
  const limit = parseInt(options.limit, 10) || 20;

  console.log('');

  const index = createSearchIndex(root);

  try {
    if (options.rebuild) {
      console.log('  Rebuilding search index...');
      const result = index.rebuild();
      console.log(`  Indexed ${result.files} files in ${result.duration}ms`);
      console.log('');
    }

    if (!query) {
      console.log('  Usage: codebase-pilot search <query>');
      console.log('');
      return;
    }

    const results = index.search(query, limit);

    if (results.length === 0) {
      console.log(`  No results for "${query}"`);
      console.log('');
      return;
    }

    console.log(`  Results for "${query}" (${results.length} matches):`);
    console.log('');

    for (const result of results) {
      const lang = result.language ? ` (${result.language})` : '';
      const score = result.score.toFixed(2);
      console.log(`  ${result.path}:${result.line}${lang}  score=${score}`);

      const snippet = result.snippet
        .replace(/>>>/g, '\x1b[33m')
        .replace(/<<</g, '\x1b[0m');
      console.log(`    ${snippet}`);
      console.log('');
    }
  } finally {
    index.close();
  }
}

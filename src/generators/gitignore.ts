import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ENTRIES = [
  '',
  '# codebase-pilot (local only)',
  '.codebase-pilot/',
  'CLAUDE.md',
  '.claudeignore',
];

export function updateGitignore(root: string): void {
  const path = join(root, '.gitignore');

  if (!existsSync(path)) {
    writeFileSync(path, ENTRIES.join('\n') + '\n', 'utf8');
    return;
  }

  const existing = readFileSync(path, 'utf8');

  if (existing.includes('.codebase-pilot/')) return;

  const additions = ENTRIES.filter(
    (entry) => entry === '' || !existing.includes(entry),
  );

  if (additions.length <= 1) return;

  writeFileSync(path, existing.trimEnd() + '\n' + additions.join('\n') + '\n', 'utf8');
}

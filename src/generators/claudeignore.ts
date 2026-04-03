import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ProjectScan } from '../types.js';

const BASE_CLAUDEIGNORE = `# Dependencies
node_modules/
vendor/
.venv/
__pycache__/

# Build output
dist/
build/
out/
*.min.js
*.min.css
*.bundle.js
target/

# Lock files
package-lock.json
yarn.lock
pnpm-lock.yaml
poetry.lock
Gemfile.lock
Cargo.lock
go.sum

# Compiled / generated
*.pyc
*.class
*.o
*.so

# Logs & temp files
*.log
*.tmp
*.cache
.DS_Store

# Large data files
*.csv
*.parquet
*.sqlite
*.db

# Coverage & test artifacts
coverage/
.nyc_output/
htmlcov/

# IDE / editor
.idea/
.vscode/
*.swp

# codebase-pilot index
.codebase-pilot/
`;

export function generateClaudeignore(
  root: string,
  scan: ProjectScan,
): { created: boolean; merged: boolean } {
  const outputPath = join(root, '.claudeignore');

  if (scan.existing.claudeignore && scan.existing.claudeignorePath) {
    const existing = readFileSync(scan.existing.claudeignorePath, 'utf8');
    const merged = mergeClaudeignore(existing);
    writeFileSync(scan.existing.claudeignorePath, merged, 'utf8');
    return { created: false, merged: true };
  }

  writeFileSync(outputPath, BASE_CLAUDEIGNORE, 'utf8');
  return { created: true, merged: false };
}

function mergeClaudeignore(existing: string): string {
  const lines = existing.split('\n');
  const additions: string[] = [];

  if (!existing.includes('.codebase-pilot/')) {
    additions.push('', '# codebase-pilot index', '.codebase-pilot/');
  }

  if (additions.length === 0) return existing;
  return existing.trimEnd() + '\n' + additions.join('\n') + '\n';
}

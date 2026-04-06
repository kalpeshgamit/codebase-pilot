import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ProjectScan } from '../types.js';

const BASE_CLAUDEIGNORE = `# Dependencies — all ecosystems (#91 fix: segment-based matching)
node_modules/
vendor/
.venv/
__pycache__/
.bundle/
bower_components/
jspm_packages/
pip-wheel-metadata/
eggs/
.eggs/

# Build output
dist/
build/
out/
*.min.js
*.min.css
*.bundle.js
target/
_build/
cmake-build-*/
.output/
.next/
.nuxt/
.svelte-kit/

# Platform-specific deps & build (#91 fix: nested dirs in monorepos)
.gradle/
.maven/
bin/
obj/
.dart_tool/
.pub-cache/
.pub/
Pods/
.swiftpm/
_deps/
zig-cache/
zig-out/
.stack-work/
.cabal-sandbox/
mix.lock
_opam/
node_modules/.cache/

# Lock files
package-lock.json
yarn.lock
pnpm-lock.yaml
poetry.lock
Gemfile.lock
Cargo.lock
go.sum
composer.lock
pubspec.lock
Podfile.lock
flake.lock

# Compiled / generated
*.pyc
*.pyo
*.class
*.o
*.so
*.dylib
*.dll
*.a
*.obj
*.beam
*.hi

# Logs & temp files
*.log
*.tmp
*.cache
*.swp
*.swo
.DS_Store
Thumbs.db
desktop.ini

# Large data files
*.csv
*.parquet
*.sqlite
*.db
*.sql.gz

# Coverage & test artifacts
coverage/
.nyc_output/
htmlcov/
.tox/
.pytest_cache/
__snapshots__/

# IDE / editor
.idea/
.vscode/
*.swp
*.code-workspace
.project
.classpath
.settings/

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

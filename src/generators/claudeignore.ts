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

// Framework-specific patterns to suggest when detected
const FRAMEWORK_PATTERNS: Record<string, { patterns: string[]; label: string }> = {
  'Next.js': {
    label: 'Next.js',
    patterns: ['.next/', 'out/', 'public/images/', '*.svg', 'next-env.d.ts'],
  },
  'Nuxt': {
    label: 'Nuxt',
    patterns: ['.nuxt/', '.output/', 'public/'],
  },
  'SvelteKit': {
    label: 'SvelteKit',
    patterns: ['.svelte-kit/', 'static/'],
  },
  'Vite': {
    label: 'Vite',
    patterns: ['dist/', '.vite/'],
  },
  'React': {
    label: 'React (CRA)',
    patterns: ['build/', 'public/'],
  },
  'Django': {
    label: 'Django',
    patterns: ['staticfiles/', 'mediafiles/', '*.pyc', 'db.sqlite3'],
  },
  'FastAPI': {
    label: 'FastAPI',
    patterns: ['__pycache__/', '.pytest_cache/', '*.pyc'],
  },
  'Rails': {
    label: 'Rails',
    patterns: ['tmp/', 'log/', 'public/assets/', 'public/packs/', 'storage/'],
  },
  'Laravel': {
    label: 'Laravel',
    patterns: ['storage/', 'bootstrap/cache/', 'public/storage/'],
  },
  'Spring Boot': {
    label: 'Spring Boot',
    patterns: ['target/', '*.class', '*.jar', '*.war'],
  },
  'Gin': {
    label: 'Gin / Go',
    patterns: ['vendor/', '*.test', 'tmp/'],
  },
  'Axum': {
    label: 'Axum / Rust',
    patterns: ['target/', 'Cargo.lock'],
  },
  'Actix': {
    label: 'Actix / Rust',
    patterns: ['target/', 'Cargo.lock'],
  },
};

export function getFrameworkSuggestions(
  scan: ProjectScan,
  existingContent: string,
): Array<{ label: string; missing: string[] }> {
  const results: Array<{ label: string; missing: string[] }> = [];
  if (!scan.framework) return results;

  const entry = FRAMEWORK_PATTERNS[scan.framework];
  if (!entry) return results;

  const missing = entry.patterns.filter(p => !existingContent.includes(p));
  if (missing.length > 0) {
    results.push({ label: entry.label, missing });
  }
  return results;
}

export function generateClaudeignore(
  root: string,
  scan: ProjectScan,
): { created: boolean; merged: boolean; suggestions: Array<{ label: string; missing: string[] }> } {
  const outputPath = join(root, '.claudeignore');

  if (scan.existing.claudeignore && scan.existing.claudeignorePath) {
    const existing = readFileSync(scan.existing.claudeignorePath, 'utf8');
    const merged = mergeClaudeignore(existing);
    writeFileSync(scan.existing.claudeignorePath, merged, 'utf8');
    const suggestions = getFrameworkSuggestions(scan, merged);
    return { created: false, merged: true, suggestions };
  }

  writeFileSync(outputPath, BASE_CLAUDEIGNORE, 'utf8');
  const suggestions = getFrameworkSuggestions(scan, BASE_CLAUDEIGNORE);
  return { created: true, merged: false, suggestions };
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

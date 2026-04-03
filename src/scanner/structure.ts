import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import type { PackageInfo, LanguageInfo } from '../types.js';
import { getSkipDirs } from '../registry/index.js';

const SKIP_DIRS = getSkipDirs();

export function detectStructure(
  root: string,
  languages: LanguageInfo[],
): { type: 'monorepo' | 'single-package'; packages: PackageInfo[] } {
  const isMonorepo = checkMonorepo(root);

  if (isMonorepo) {
    const packages = discoverPackages(root, languages);
    return { type: 'monorepo', packages };
  }

  const primaryLang = languages[0]?.name || 'unknown';
  const fileCount = countSourceFiles(root);
  const pkgType = inferPackageType(root, root);

  return {
    type: 'single-package',
    packages: [
      {
        name: basename(root),
        path: '.',
        type: pkgType,
        language: primaryLang,
        entryPoint: findEntryPoint(root),
        fileCount,
      },
    ],
  };
}

function checkMonorepo(root: string): boolean {
  if (existsSync(join(root, 'pnpm-workspace.yaml'))) return true;
  if (existsSync(join(root, 'lerna.json'))) return true;
  if (existsSync(join(root, 'nx.json'))) return true;
  if (existsSync(join(root, 'turbo.json'))) return true;

  const pkgPath = join(root, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      if (pkg.workspaces) return true;
    } catch {}
  }

  for (const dir of ['packages', 'apps', 'libs', 'modules']) {
    const dirPath = join(root, dir);
    if (existsSync(dirPath) && statSync(dirPath).isDirectory()) {
      const children = readdirSync(dirPath).filter(
        (f) => !f.startsWith('.') && statSync(join(dirPath, f)).isDirectory(),
      );
      if (children.length >= 2) return true;
    }
  }

  return false;
}

function discoverPackages(root: string, languages: LanguageInfo[]): PackageInfo[] {
  const packages: PackageInfo[] = [];
  const primaryLang = languages[0]?.name || 'unknown';

  for (const dir of ['packages', 'apps', 'libs', 'modules', 'services']) {
    const dirPath = join(root, dir);
    if (!existsSync(dirPath)) continue;

    let children: string[];
    try {
      children = readdirSync(dirPath).filter(
        (f) => !f.startsWith('.') && !SKIP_DIRS.has(f) && statSync(join(dirPath, f)).isDirectory(),
      );
    } catch {
      continue;
    }

    for (const child of children) {
      const pkgPath = join(dirPath, child);
      const relativePath = `${dir}/${child}`;

      packages.push({
        name: child,
        path: relativePath,
        type: inferPackageType(pkgPath, root),
        language: primaryLang,
        entryPoint: findEntryPoint(pkgPath),
        fileCount: countSourceFiles(pkgPath),
      });
    }
  }

  return packages;
}

function inferPackageType(
  pkgPath: string,
  _root: string,
): PackageInfo['type'] {
  const name = basename(pkgPath).toLowerCase();

  // 1. Check bin field in package.json → CLI
  const pkg = readPkgJsonSafe(pkgPath);
  if (pkg?.bin) return 'cli';

  // 2. Check CLI framework dependencies
  const cliDeps = ['commander', 'yargs', 'meow', 'clipanion', 'oclif', 'cac', 'citty'];
  if (pkg && hasAnyDep(pkg, cliDeps)) return 'cli';

  // Go CLI frameworks
  if (hasGoDep(pkgPath, 'github.com/spf13/cobra') || hasGoDep(pkgPath, 'github.com/urfave/cli')) return 'cli';

  // Rust CLI frameworks
  if (hasRustDep(pkgPath, 'clap')) return 'cli';

  // Python CLI frameworks
  if (hasPythonDep(pkgPath, 'click') || hasPythonDep(pkgPath, 'typer')) return 'cli';

  // 3. Check server framework deps → API
  const serverDeps = ['express', 'fastify', 'hono', 'koa', '@nestjs/core', '@hapi/hapi'];
  if (pkg && hasAnyDep(pkg, serverDeps)) return 'api';

  // 4. Check frontend framework deps → web
  const frontendDeps = ['react', 'vue', 'svelte', '@angular/core', 'next', 'nuxt'];
  if (pkg && hasAnyDep(pkg, frontendDeps)) return 'web';

  // 5. Name-based inference (existing logic)
  if (name.includes('api') || name.includes('server') || name.includes('backend') || name === 'core') return 'api';
  if (name.includes('web') || name.includes('app') || name.includes('frontend') || name.includes('ui') || name.includes('client')) {
    if (name === 'ui' || name.includes('kit') || name.includes('shared')) return 'lib';
    return 'web';
  }
  if (name.includes('cli') || name.includes('cmd')) return 'cli';
  if (name.includes('plugin') || name.includes('extension') || name.includes('addon')) return 'plugin';
  if (name.includes('db') || name.includes('database') || name.includes('migration')) return 'database';
  if (name.includes('lib') || name.includes('util') || name.includes('common') || name.includes('shared')) return 'lib';

  // 6. Directory structure inference
  if (existsSync(join(pkgPath, 'src', 'routes')) || existsSync(join(pkgPath, 'src', 'api'))) return 'api';
  if (existsSync(join(pkgPath, 'src', 'components')) || existsSync(join(pkgPath, 'src', 'pages'))) return 'web';
  if (existsSync(join(pkgPath, 'src', 'commands')) || existsSync(join(pkgPath, 'src', 'cli'))) return 'cli';

  return 'unknown';
}

function findEntryPoint(pkgPath: string): string | null {
  const candidates = [
    'src/index.ts', 'src/index.js', 'src/main.ts', 'src/main.js',
    'src/app.ts', 'src/app.js', 'src/server.ts', 'src/server.js',
    'index.ts', 'index.js', 'main.py', 'app.py', 'main.go', 'cmd/main.go',
    'src/main.rs', 'src/lib.rs',
  ];
  for (const candidate of candidates) {
    if (existsSync(join(pkgPath, candidate))) return candidate;
  }
  return null;
}

function countSourceFiles(dir: string, depth = 0): number {
  if (depth > 5) return 0;
  let count = 0;
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return 0;
  }
  for (const entry of entries) {
    if (entry.startsWith('.') || SKIP_DIRS.has(entry)) continue;
    const fullPath = join(dir, entry);
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        count += countSourceFiles(fullPath, depth + 1);
      } else if (stat.isFile()) {
        count++;
      }
    } catch {}
  }
  return count;
}

function readPkgJsonSafe(root: string): Record<string, unknown> | null {
  const path = join(root, 'package.json');
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}

function hasAnyDep(pkg: Record<string, unknown>, deps: string[]): boolean {
  const allDeps = { ...(pkg.dependencies as Record<string, string> || {}), ...(pkg.devDependencies as Record<string, string> || {}) };
  return deps.some(d => d in allDeps);
}

function hasGoDep(root: string, dep: string): boolean {
  const goMod = join(root, 'go.mod');
  if (!existsSync(goMod)) return false;
  try { return readFileSync(goMod, 'utf8').includes(dep); } catch { return false; }
}

function hasRustDep(root: string, dep: string): boolean {
  const cargo = join(root, 'Cargo.toml');
  if (!existsSync(cargo)) return false;
  try { return readFileSync(cargo, 'utf8').includes(dep); } catch { return false; }
}

function hasPythonDep(root: string, dep: string): boolean {
  for (const f of ['requirements.txt', 'Pipfile', 'pyproject.toml']) {
    const path = join(root, f);
    if (existsSync(path)) {
      try { if (readFileSync(path, 'utf8').includes(dep)) return true; } catch {}
    }
  }
  return false;
}

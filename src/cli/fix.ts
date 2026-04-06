import { resolve, join, dirname, basename, extname, relative } from 'node:path';
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import type { AgentsConfig } from '../types.js';
import { toPosix } from '../utils.js';
import { getAllLanguages } from '../registry/index.js';

interface FixOptions {
  dir: string;
}

export async function fixCommand(options: FixOptions): Promise<void> {
  const root = resolve(options.dir);

  console.log('');
  console.log('  Checking for drift...');

  const agentsPath = join(root, '.codebase-pilot', 'agents.json');
  if (!existsSync(agentsPath)) {
    console.log('  ✗ No agents.json found. Run "codebase-pilot init" first.');
    console.log('');
    return;
  }

  const config: AgentsConfig = JSON.parse(readFileSync(agentsPath, 'utf8'));
  const detectedLangs = detectProjectLanguages(root);
  let fixes = 0;

  for (const [name, agent] of Object.entries(config.agents)) {
    for (let i = 0; i < agent.context.length; i++) {
      const ctxPath = agent.context[i];
      if (ctxPath === 'ALL agent outputs' || ctxPath === 'Agent execution logs') continue;

      const fullPath = join(root, ctxPath);
      if (!existsSync(fullPath)) {
        const resolved = resolveMovedPath(root, ctxPath, detectedLangs);
        if (resolved) {
          console.log(`    ${name}: ${ctxPath} → ${resolved}  ✓ auto-fixed`);
          agent.context[i] = resolved;
          fixes++;
        } else {
          console.log(`    ${name}: ${ctxPath}  ✗ NOT FOUND (manual fix needed)`);
        }
      }
    }
  }

  if (fixes > 0) {
    writeFileSync(agentsPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
    console.log('');
    console.log(`  ✓ ${fixes} fix${fixes > 1 ? 'es' : ''} applied to agents.json`);
  } else {
    console.log('  ✓ No drift detected. All paths valid.');
  }
  console.log('');
}

export function resolveMovedPath(root: string, stalePath: string, languages: string[]): string | null {
  const fullPath = join(root, stalePath);

  // If path already exists, no fix needed
  if (existsSync(fullPath)) return null;

  // Strategy 1: Directory → file (src/types/ → src/types.ts)
  if (stalePath.endsWith('/')) {
    const withoutSlash = stalePath.slice(0, -1);
    const extensions = getExtensionsForLanguages(languages);
    for (const ext of extensions) {
      const candidate = withoutSlash + ext;
      if (existsSync(join(root, candidate))) return candidate;
    }
  }

  // Strategy 2: File → directory (src/types.ts → src/types/)
  if (!stalePath.endsWith('/') && extname(stalePath)) {
    const withoutExt = stalePath.replace(/\.[^.]+$/, '');
    const dirCandidate = toPosix(withoutExt + '/');
    if (existsSync(join(root, dirCandidate)) && statSync(join(root, dirCandidate)).isDirectory()) {
      return dirCandidate;
    }
  }

  // Strategy 3: Fuzzy search in parent directory
  const dir = dirname(stalePath);
  const name = basename(stalePath).replace(/\/$/, '').replace(/\.[^.]+$/, '');
  const parentFull = join(root, dir);

  if (existsSync(parentFull)) {
    try {
      const entries = readdirSync(parentFull);
      const match = entries.find(e => {
        const eName = e.replace(/\.[^.]+$/, '');
        return eName.toLowerCase() === name.toLowerCase();
      });
      if (match) {
        const matchPath = dir === '.' ? match : toPosix(`${dir}/${match}`);
        const matchFull = join(root, matchPath);
        try {
          if (statSync(matchFull).isDirectory()) return toPosix(matchPath + '/');
        } catch {}
        return matchPath;
      }
    } catch {}
  }

  // Strategy 4: Common directory aliases (src ↔ lib, docs ↔ doc)
  const ALIASES: Record<string, string[]> = {
    'src': ['lib', 'source', 'app', 'packages'],
    'lib': ['src', 'source', 'app'],
    'docs': ['doc', 'documentation'],
    'doc': ['docs', 'documentation'],
    'test': ['tests', 'spec', 'specs', '__tests__'],
    'tests': ['test', 'spec', 'specs', '__tests__'],
  };

  const cleanName = name.toLowerCase();
  const aliases = ALIASES[cleanName] || [];
  for (const alias of aliases) {
    const aliasPath = stalePath.replace(new RegExp(`(^|/)${name}(/|$)`), `$1${alias}$2`);
    if (existsSync(join(root, aliasPath))) {
      return toPosix(aliasPath);
    }
  }

  // Strategy 5: For files like README.md, search in subdirectories
  if (!stalePath.includes('/') && extname(stalePath)) {
    const skipDirsSet = new Set(['node_modules', 'dist', 'build', '.git', 'target', 'vendor', 'venv', '.venv', '__pycache__']);
    try {
      for (const entry of readdirSync(root)) {
        if (entry.startsWith('.') || skipDirsSet.has(entry)) continue;
        const full = join(root, entry);
        try { if (!statSync(full).isDirectory()) continue; } catch { continue; }
        const candidate = toPosix(`${entry}/${stalePath}`);
        if (existsSync(join(root, candidate))) return candidate;
      }
    } catch {}
  }

  // Strategy 6: Search deeper for the name
  const found = findByName(root, name, 0);
  return found;
}

function getExtensionsForLanguages(languages: string[]): string[] {
  const allLangs = getAllLanguages();
  const extensions: string[] = [];
  for (const langName of languages) {
    const lang = allLangs.find(l => l.name === langName);
    if (lang) extensions.push(...lang.extensions);
  }
  if (extensions.length === 0) {
    extensions.push('.ts', '.js', '.py', '.go', '.rs', '.java', '.rb', '.php');
  }
  return extensions;
}

function detectProjectLanguages(root: string): string[] {
  const langs: string[] = [];
  if (existsSync(join(root, 'package.json')) || existsSync(join(root, 'tsconfig.json'))) langs.push('TypeScript', 'JavaScript');
  if (existsSync(join(root, 'pyproject.toml')) || existsSync(join(root, 'requirements.txt'))) langs.push('Python');
  if (existsSync(join(root, 'go.mod'))) langs.push('Go');
  if (existsSync(join(root, 'Cargo.toml'))) langs.push('Rust');
  if (existsSync(join(root, 'pom.xml')) || existsSync(join(root, 'build.gradle'))) langs.push('Java');
  if (existsSync(join(root, 'Gemfile'))) langs.push('Ruby');
  if (existsSync(join(root, 'composer.json'))) langs.push('PHP');
  return langs.length > 0 ? langs : ['TypeScript', 'JavaScript', 'Python'];
}

function findByName(dir: string, name: string, depth: number): string | null {
  if (depth > 4) return null;
  const skipDirs = new Set(['node_modules', 'dist', 'build', '.git', 'target', 'vendor']);
  try {
    for (const entry of readdirSync(dir)) {
      if (entry.startsWith('.') || skipDirs.has(entry)) continue;
      const full = join(dir, entry);
      try {
        if (!statSync(full).isDirectory()) continue;
      } catch { continue; }

      if (entry === name) {
        return toPosix(relative(dir, full) + '/');
      }

      const found = findByName(full, name, depth + 1);
      if (found) return toPosix(entry + '/' + found);
    }
  } catch {}
  return null;
}

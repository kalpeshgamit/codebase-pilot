# Language Expansion & Public Plugin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand codebase-pilot from 23 to 50+ languages with a data-driven registry, fix self-test issues (fix command, package type detection), add comprehensive test suite, and prepare for npm publish.

**Architecture:** Refactor all hardcoded detection maps into a `src/registry/` module with typed data files. Scanners become thin orchestrators that read from the registry. Tier 1 languages (15) get full ecosystem detection. Tier 2 (20) get package manager + test runner. Tier 3 (15+) get extension-only. Fix command gains smart file↔directory resolution. Package type inference gains dependency-based CLI detection.

**Tech Stack:** TypeScript, Vitest, Node.js fs APIs

---

## Task 1: Registry Types & Index

**Files:**
- Create: `src/registry/types.ts`
- Create: `src/registry/index.ts`

- [ ] **Step 1: Write failing test for registry types**

Create `tests/registry/index.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getLanguageByExt, getAllLanguages, getSkipDirs, getEntryPoints } from '../../src/registry/index.js';

describe('registry index', () => {
  it('returns language for known extension', () => {
    expect(getLanguageByExt('.ts')).toBeDefined();
    expect(getLanguageByExt('.ts')!.name).toBe('TypeScript');
  });

  it('returns undefined for unknown extension', () => {
    expect(getLanguageByExt('.xyz123')).toBeUndefined();
  });

  it('returns all languages', () => {
    const all = getAllLanguages();
    expect(all.length).toBeGreaterThanOrEqual(50);
  });

  it('returns languages by tier', () => {
    const all = getAllLanguages();
    const tier1 = all.filter(l => l.tier === 1);
    const tier2 = all.filter(l => l.tier === 2);
    const tier3 = all.filter(l => l.tier === 3);
    expect(tier1.length).toBeGreaterThanOrEqual(15);
    expect(tier2.length).toBeGreaterThanOrEqual(15);
    expect(tier3.length).toBeGreaterThanOrEqual(10);
  });

  it('has no duplicate extensions across languages', () => {
    const all = getAllLanguages();
    const seen = new Map<string, string>();
    for (const lang of all) {
      for (const ext of lang.extensions) {
        if (seen.has(ext)) {
          // Only allow documented conflicts (.v, .fs, .pl)
          const conflicts = ['.v', '.fs', '.pl'];
          if (!conflicts.includes(ext)) {
            throw new Error(`Duplicate extension ${ext}: ${seen.get(ext)} and ${lang.name}`);
          }
        }
        seen.set(ext, lang.name);
      }
    }
  });

  it('returns skip dirs including language-specific ones', () => {
    const dirs = getSkipDirs();
    expect(dirs.has('node_modules')).toBe(true);
    expect(dirs.has('__pycache__')).toBe(true);
    expect(dirs.has('target')).toBe(true);
    expect(dirs.has('.git')).toBe(true);
  });

  it('returns entry points for a language', () => {
    const ts = getEntryPoints('TypeScript');
    expect(ts).toContain('src/index.ts');
    const py = getEntryPoints('Python');
    expect(py).toContain('main.py');
    const go = getEntryPoints('Go');
    expect(go).toContain('main.go');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/registry/index.test.ts`
Expected: FAIL — modules don't exist yet

- [ ] **Step 3: Create registry types**

Create `src/registry/types.ts`:

```typescript
export type Tier = 1 | 2 | 3;

export interface LanguageEntry {
  name: string;
  extensions: string[];
  tier: Tier;
  skipDirs: string[];
  entryPoints: string[];
  packageFiles: string[];
}

export interface FrameworkDetector {
  name: string;
  language: string;
  detect: (root: string) => boolean;
  category: 'backend' | 'frontend' | 'fullstack' | 'mobile' | 'desktop';
}

export interface TestRunnerDetector {
  name: string;
  language: string;
  detect: (root: string) => boolean;
  command: string;
}

export interface OrmDetector {
  name: string;
  language: string;
  detect: (root: string) => string | null;
  schemaPaths: string[];
}

export interface PackageManagerEntry {
  name: string;
  language: string;
  lockFile: string | null;
  configFile: string;
  detect: (root: string) => boolean;
}
```

- [ ] **Step 4: Create registry index with helper functions**

Create `src/registry/index.ts`:

```typescript
import type { LanguageEntry } from './types.js';
import { LANGUAGES } from './languages.js';
import { FRAMEWORK_DETECTORS } from './frameworks.js';
import { TEST_RUNNER_DETECTORS } from './testing.js';
import { ORM_DETECTORS } from './databases.js';

const extMap = new Map<string, LanguageEntry>();
for (const lang of LANGUAGES) {
  for (const ext of lang.extensions) {
    // First language to claim an extension wins (Tier 1 > 2 > 3)
    if (!extMap.has(ext)) {
      extMap.set(ext, lang);
    }
  }
}

const allSkipDirs = new Set<string>([
  'node_modules', 'dist', 'build', 'out', '.git', '.next', '.nuxt',
  '__pycache__', '.venv', 'venv', 'target', 'vendor', 'coverage',
  '.turbo', '.cache', '.codebase-pilot', '.svelte-kit',
  '.parcel-cache', '.angular', '.gradle', '.mvn', '_build', 'deps',
  'zig-cache', 'zig-out', '.stack-work', '.cabal', '_opam',
  'nimcache', '.shards', 'elm-stuff', 'bin', 'obj',
]);

for (const lang of LANGUAGES) {
  for (const dir of lang.skipDirs) {
    allSkipDirs.add(dir);
  }
}

export function getLanguageByExt(ext: string): LanguageEntry | undefined {
  return extMap.get(ext) || extMap.get(ext.toLowerCase());
}

export function getAllLanguages(): LanguageEntry[] {
  return LANGUAGES;
}

export function getSkipDirs(): Set<string> {
  return allSkipDirs;
}

export function getEntryPoints(languageName: string): string[] {
  const lang = LANGUAGES.find(l => l.name === languageName);
  return lang?.entryPoints ?? [];
}

export function getFrameworkDetectors(languageName?: string) {
  if (languageName) {
    return FRAMEWORK_DETECTORS.filter(d => d.language === languageName);
  }
  return FRAMEWORK_DETECTORS;
}

export function getTestRunnerDetectors(languageName?: string) {
  if (languageName) {
    return TEST_RUNNER_DETECTORS.filter(d => d.language === languageName);
  }
  return TEST_RUNNER_DETECTORS;
}

export function getOrmDetectors(languageName?: string) {
  if (languageName) {
    return ORM_DETECTORS.filter(d => d.language === languageName);
  }
  return ORM_DETECTORS;
}

export { LANGUAGES } from './languages.js';
export { FRAMEWORK_DETECTORS } from './frameworks.js';
export { TEST_RUNNER_DETECTORS } from './testing.js';
export { ORM_DETECTORS } from './databases.js';
export type { LanguageEntry, FrameworkDetector, TestRunnerDetector, OrmDetector, PackageManagerEntry, Tier } from './types.js';
```

- [ ] **Step 5: Commit**

```bash
git add src/registry/types.ts src/registry/index.ts tests/registry/index.test.ts
git commit -m "feat: add registry types and index module"
```

---

## Task 2: Languages Registry (50+ languages)

**Files:**
- Create: `src/registry/languages.ts`

- [ ] **Step 1: Write failing test for language count and structure**

Create `tests/registry/languages.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { LANGUAGES } from '../../src/registry/languages.js';

describe('languages registry', () => {
  it('has 50+ languages', () => {
    expect(LANGUAGES.length).toBeGreaterThanOrEqual(50);
  });

  it('every entry has required fields', () => {
    for (const lang of LANGUAGES) {
      expect(lang.name).toBeTruthy();
      expect(lang.extensions.length).toBeGreaterThan(0);
      expect([1, 2, 3]).toContain(lang.tier);
      expect(Array.isArray(lang.skipDirs)).toBe(true);
      expect(Array.isArray(lang.entryPoints)).toBe(true);
      expect(Array.isArray(lang.packageFiles)).toBe(true);
    }
  });

  it('tier 1 languages have package files', () => {
    const tier1 = LANGUAGES.filter(l => l.tier === 1);
    for (const lang of tier1) {
      expect(lang.packageFiles.length, `${lang.name} missing packageFiles`).toBeGreaterThan(0);
    }
  });

  it('tier 1+2 languages have entry points', () => {
    const tier12 = LANGUAGES.filter(l => l.tier <= 2);
    for (const lang of tier12) {
      expect(lang.entryPoints.length, `${lang.name} missing entryPoints`).toBeGreaterThan(0);
    }
  });

  it('includes all original 23 languages', () => {
    const names = LANGUAGES.map(l => l.name);
    for (const orig of ['TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java', 'Kotlin', 'Ruby', 'PHP', 'C#', 'C++', 'C', 'Swift', 'Dart', 'Scala', 'Elixir', 'Zig', 'Lua', 'R']) {
      expect(names, `Missing original language: ${orig}`).toContain(orig);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/registry/languages.test.ts`
Expected: FAIL — module doesn't exist

- [ ] **Step 3: Create languages registry with all 50+ languages**

Create `src/registry/languages.ts`:

```typescript
import type { LanguageEntry } from './types.js';

export const LANGUAGES: LanguageEntry[] = [
  // ═══════════════════════════════════════════
  // TIER 1 — Full Ecosystem (16 entries, TS+JS separate)
  // ═══════════════════════════════════════════
  {
    name: 'TypeScript',
    extensions: ['.ts', '.tsx', '.mts', '.cts'],
    tier: 1,
    skipDirs: ['node_modules', 'dist', 'build', 'out', '.next', '.nuxt', '.svelte-kit', '.turbo', '.cache', '.parcel-cache'],
    entryPoints: ['src/index.ts', 'src/main.ts', 'src/app.ts', 'src/server.ts', 'index.ts', 'main.ts'],
    packageFiles: ['package.json', 'tsconfig.json'],
  },
  {
    name: 'JavaScript',
    extensions: ['.js', '.jsx', '.mjs', '.cjs'],
    tier: 1,
    skipDirs: ['node_modules', 'dist', 'build', 'out', '.next', '.nuxt', '.svelte-kit', '.turbo', '.cache', '.parcel-cache'],
    entryPoints: ['src/index.js', 'src/main.js', 'src/app.js', 'src/server.js', 'index.js', 'main.js'],
    packageFiles: ['package.json'],
  },
  {
    name: 'Python',
    extensions: ['.py', '.pyw', '.pyi'],
    tier: 1,
    skipDirs: ['__pycache__', '.venv', 'venv', '.mypy_cache', '.pytest_cache', '.tox', 'htmlcov', '.eggs', '*.egg-info'],
    entryPoints: ['main.py', 'app.py', 'src/main.py', 'src/app.py', 'manage.py'],
    packageFiles: ['pyproject.toml', 'setup.py', 'setup.cfg', 'requirements.txt', 'Pipfile'],
  },
  {
    name: 'Go',
    extensions: ['.go'],
    tier: 1,
    skipDirs: ['vendor'],
    entryPoints: ['main.go', 'cmd/main.go', 'cmd/server/main.go'],
    packageFiles: ['go.mod'],
  },
  {
    name: 'Rust',
    extensions: ['.rs'],
    tier: 1,
    skipDirs: ['target'],
    entryPoints: ['src/main.rs', 'src/lib.rs'],
    packageFiles: ['Cargo.toml'],
  },
  {
    name: 'Java',
    extensions: ['.java'],
    tier: 1,
    skipDirs: ['target', '.gradle', '.mvn', 'bin', 'out'],
    entryPoints: ['src/main/java/Main.java', 'src/main/java/App.java', 'src/main/java/Application.java'],
    packageFiles: ['pom.xml', 'build.gradle', 'build.gradle.kts'],
  },
  {
    name: 'Kotlin',
    extensions: ['.kt', '.kts'],
    tier: 1,
    skipDirs: ['target', '.gradle', 'bin', 'out'],
    entryPoints: ['src/main/kotlin/Main.kt', 'src/main/kotlin/App.kt', 'src/main/kotlin/Application.kt'],
    packageFiles: ['build.gradle.kts', 'build.gradle', 'pom.xml'],
  },
  {
    name: 'Ruby',
    extensions: ['.rb', '.rake', '.gemspec'],
    tier: 1,
    skipDirs: ['vendor', '.bundle'],
    entryPoints: ['app.rb', 'main.rb', 'config.ru', 'lib/main.rb'],
    packageFiles: ['Gemfile'],
  },
  {
    name: 'PHP',
    extensions: ['.php'],
    tier: 1,
    skipDirs: ['vendor'],
    entryPoints: ['index.php', 'public/index.php', 'artisan'],
    packageFiles: ['composer.json'],
  },
  {
    name: 'C#',
    extensions: ['.cs', '.csx'],
    tier: 1,
    skipDirs: ['bin', 'obj', '.vs'],
    entryPoints: ['Program.cs', 'src/Program.cs'],
    packageFiles: ['*.csproj', '*.sln'],
  },
  {
    name: 'Swift',
    extensions: ['.swift'],
    tier: 1,
    skipDirs: ['.build', '.swiftpm', 'DerivedData'],
    entryPoints: ['Sources/main.swift', 'Sources/App/main.swift', 'main.swift'],
    packageFiles: ['Package.swift'],
  },
  {
    name: 'Dart',
    extensions: ['.dart'],
    tier: 1,
    skipDirs: ['.dart_tool', 'build', '.flutter-plugins'],
    entryPoints: ['lib/main.dart', 'bin/main.dart'],
    packageFiles: ['pubspec.yaml'],
  },
  {
    name: 'Elixir',
    extensions: ['.ex', '.exs'],
    tier: 1,
    skipDirs: ['_build', 'deps', '.elixir_ls'],
    entryPoints: ['lib/application.ex', 'lib/app.ex'],
    packageFiles: ['mix.exs'],
  },
  {
    name: 'Scala',
    extensions: ['.scala', '.sc'],
    tier: 1,
    skipDirs: ['target', '.bsp', '.metals', 'project/target'],
    entryPoints: ['src/main/scala/Main.scala', 'src/main/scala/App.scala'],
    packageFiles: ['build.sbt', 'build.sc'],
  },
  {
    name: 'C++',
    extensions: ['.cpp', '.hpp', '.cc', '.cxx', '.hxx', '.h'],
    tier: 1,
    skipDirs: ['build', 'cmake-build-debug', 'cmake-build-release'],
    entryPoints: ['src/main.cpp', 'main.cpp', 'src/main.cc'],
    packageFiles: ['CMakeLists.txt', 'Makefile', 'conanfile.txt', 'vcpkg.json'],
  },
  {
    name: 'C',
    extensions: ['.c'],
    tier: 1,
    skipDirs: ['build', 'cmake-build-debug', 'cmake-build-release'],
    entryPoints: ['src/main.c', 'main.c'],
    packageFiles: ['CMakeLists.txt', 'Makefile'],
  },
  {
    name: 'Zig',
    extensions: ['.zig'],
    tier: 1,
    skipDirs: ['zig-cache', 'zig-out'],
    entryPoints: ['src/main.zig', 'src/root.zig'],
    packageFiles: ['build.zig', 'build.zig.zon'],
  },

  // ═══════════════════════════════════════════
  // TIER 2 — Package Manager + Test Runner (20)
  // ═══════════════════════════════════════════
  {
    name: 'Haskell',
    extensions: ['.hs', '.lhs'],
    tier: 2,
    skipDirs: ['.stack-work', '.cabal', 'dist-newstyle'],
    entryPoints: ['app/Main.hs', 'src/Main.hs', 'Main.hs'],
    packageFiles: ['package.yaml', '*.cabal', 'stack.yaml'],
  },
  {
    name: 'Clojure',
    extensions: ['.clj', '.cljs', '.cljc', '.edn'],
    tier: 2,
    skipDirs: ['target', '.cpcache', '.clj-kondo'],
    entryPoints: ['src/core.clj', 'src/main.clj'],
    packageFiles: ['project.clj', 'deps.edn', 'build.clj'],
  },
  {
    name: 'F#',
    extensions: ['.fs', '.fsi', '.fsx'],
    tier: 2,
    skipDirs: ['bin', 'obj', '.vs'],
    entryPoints: ['Program.fs', 'src/Program.fs'],
    packageFiles: ['*.fsproj', '*.sln'],
  },
  {
    name: 'OCaml',
    extensions: ['.ml', '.mli'],
    tier: 2,
    skipDirs: ['_build', '_opam'],
    entryPoints: ['bin/main.ml', 'lib/main.ml'],
    packageFiles: ['dune-project', '*.opam'],
  },
  {
    name: 'Nim',
    extensions: ['.nim', '.nims', '.nimble'],
    tier: 2,
    skipDirs: ['nimcache'],
    entryPoints: ['src/main.nim', 'main.nim'],
    packageFiles: ['*.nimble'],
  },
  {
    name: 'Crystal',
    extensions: ['.cr'],
    tier: 2,
    skipDirs: ['.shards', 'lib'],
    entryPoints: ['src/main.cr', 'src/app.cr'],
    packageFiles: ['shard.yml'],
  },
  {
    name: 'Julia',
    extensions: ['.jl'],
    tier: 2,
    skipDirs: [],
    entryPoints: ['src/main.jl', 'main.jl'],
    packageFiles: ['Project.toml'],
  },
  {
    name: 'Perl',
    extensions: ['.pl', '.pm', '.t'],
    tier: 2,
    skipDirs: ['blib', '.build'],
    entryPoints: ['script/main.pl', 'bin/main.pl', 'main.pl'],
    packageFiles: ['Makefile.PL', 'Build.PL', 'cpanfile', 'dist.ini'],
  },
  {
    name: 'Lua',
    extensions: ['.lua'],
    tier: 2,
    skipDirs: ['lua_modules', '.luarocks'],
    entryPoints: ['main.lua', 'init.lua', 'src/main.lua'],
    packageFiles: ['*.rockspec'],
  },
  {
    name: 'R',
    extensions: ['.r', '.R', '.Rmd', '.Rnw'],
    tier: 2,
    skipDirs: ['renv'],
    entryPoints: ['main.R', 'app.R', 'R/main.R'],
    packageFiles: ['DESCRIPTION', 'renv.lock'],
  },
  {
    name: 'Erlang',
    extensions: ['.erl', '.hrl'],
    tier: 2,
    skipDirs: ['_build', '_checkouts'],
    entryPoints: ['src/app.erl', 'src/main.erl'],
    packageFiles: ['rebar.config', 'rebar.lock'],
  },
  {
    name: 'Groovy',
    extensions: ['.groovy', '.gvy', '.gy'],
    tier: 2,
    skipDirs: ['.gradle', 'build'],
    entryPoints: ['src/main/groovy/Main.groovy', 'src/main/groovy/App.groovy'],
    packageFiles: ['build.gradle'],
  },
  {
    name: 'V',
    extensions: ['.v'],
    tier: 2,
    skipDirs: [],
    entryPoints: ['main.v', 'src/main.v'],
    packageFiles: ['v.mod'],
  },
  {
    name: 'Objective-C',
    extensions: ['.m', '.mm'],
    tier: 2,
    skipDirs: ['build', 'DerivedData', 'Pods'],
    entryPoints: ['main.m', 'Sources/main.m'],
    packageFiles: ['Podfile', '*.xcodeproj'],
  },
  {
    name: 'D',
    extensions: ['.d'],
    tier: 2,
    skipDirs: ['.dub'],
    entryPoints: ['source/app.d', 'source/main.d', 'src/main.d'],
    packageFiles: ['dub.json', 'dub.sdl'],
  },
  {
    name: 'Ada',
    extensions: ['.adb', '.ads'],
    tier: 2,
    skipDirs: ['obj'],
    entryPoints: ['src/main.adb', 'main.adb'],
    packageFiles: ['*.gpr', 'alire.toml'],
  },
  {
    name: 'Fortran',
    extensions: ['.f90', '.f95', '.f03', '.f08', '.f'],
    tier: 2,
    skipDirs: ['build'],
    entryPoints: ['src/main.f90', 'app/main.f90'],
    packageFiles: ['fpm.toml'],
  },
  {
    name: 'COBOL',
    extensions: ['.cob', '.cbl', '.cpy'],
    tier: 2,
    skipDirs: [],
    entryPoints: ['src/main.cob'],
    packageFiles: [],
  },
  {
    name: 'Hack',
    extensions: ['.hack', '.hh'],
    tier: 2,
    skipDirs: [],
    entryPoints: ['src/main.hack'],
    packageFiles: ['.hhconfig'],
  },
  {
    name: 'Gleam',
    extensions: ['.gleam'],
    tier: 2,
    skipDirs: ['build'],
    entryPoints: ['src/main.gleam', 'src/app.gleam'],
    packageFiles: ['gleam.toml'],
  },

  // ═══════════════════════════════════════════
  // TIER 3 — Extension Only (18)
  // ═══════════════════════════════════════════
  {
    name: 'Lisp',
    extensions: ['.lisp', '.lsp', '.cl', '.asd'],
    tier: 3,
    skipDirs: [],
    entryPoints: [],
    packageFiles: [],
  },
  {
    name: 'Scheme',
    extensions: ['.scm', '.ss'],
    tier: 3,
    skipDirs: [],
    entryPoints: [],
    packageFiles: [],
  },
  {
    name: 'Racket',
    extensions: ['.rkt'],
    tier: 3,
    skipDirs: [],
    entryPoints: [],
    packageFiles: [],
  },
  {
    name: 'Prolog',
    extensions: ['.pro'],
    tier: 3,
    skipDirs: [],
    entryPoints: [],
    packageFiles: [],
  },
  {
    name: 'Forth',
    extensions: ['.fth', '.4th'],
    tier: 3,
    skipDirs: [],
    entryPoints: [],
    packageFiles: [],
  },
  {
    name: 'APL',
    extensions: ['.apl', '.dyalog'],
    tier: 3,
    skipDirs: [],
    entryPoints: [],
    packageFiles: [],
  },
  {
    name: 'VHDL',
    extensions: ['.vhd', '.vhdl'],
    tier: 3,
    skipDirs: [],
    entryPoints: [],
    packageFiles: [],
  },
  {
    name: 'Verilog',
    extensions: ['.sv', '.svh'],
    tier: 3,
    skipDirs: [],
    entryPoints: [],
    packageFiles: [],
  },
  {
    name: 'Tcl',
    extensions: ['.tcl'],
    tier: 3,
    skipDirs: [],
    entryPoints: [],
    packageFiles: [],
  },
  {
    name: 'Shell',
    extensions: ['.sh', '.bash', '.zsh'],
    tier: 3,
    skipDirs: [],
    entryPoints: [],
    packageFiles: [],
  },
  {
    name: 'PowerShell',
    extensions: ['.ps1', '.psm1', '.psd1'],
    tier: 3,
    skipDirs: [],
    entryPoints: [],
    packageFiles: [],
  },
  {
    name: 'Terraform',
    extensions: ['.tf', '.hcl'],
    tier: 3,
    skipDirs: ['.terraform'],
    entryPoints: [],
    packageFiles: [],
  },
  {
    name: 'Solidity',
    extensions: ['.sol'],
    tier: 3,
    skipDirs: ['artifacts', 'cache'],
    entryPoints: [],
    packageFiles: [],
  },
  {
    name: 'Move',
    extensions: ['.move'],
    tier: 3,
    skipDirs: [],
    entryPoints: [],
    packageFiles: [],
  },
  {
    name: 'Cairo',
    extensions: ['.cairo'],
    tier: 3,
    skipDirs: [],
    entryPoints: [],
    packageFiles: [],
  },
  {
    name: 'GraphQL',
    extensions: ['.graphql', '.gql'],
    tier: 3,
    skipDirs: [],
    entryPoints: [],
    packageFiles: [],
  },
  {
    name: 'Protobuf',
    extensions: ['.proto'],
    tier: 3,
    skipDirs: [],
    entryPoints: [],
    packageFiles: [],
  },
  {
    name: 'SQL',
    extensions: ['.sql'],
    tier: 3,
    skipDirs: [],
    entryPoints: [],
    packageFiles: [],
  },
];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/registry/languages.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/registry/languages.ts tests/registry/languages.test.ts
git commit -m "feat: add 55-language registry across 3 tiers"
```

---

## Task 3: Framework Detectors Registry

**Files:**
- Create: `src/registry/frameworks.ts`

This task extracts the existing hardcoded detectors from `src/scanner/framework.ts` into the registry and adds new Tier 1 framework detectors.

- [ ] **Step 1: Write failing test**

Create `tests/registry/frameworks.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { FRAMEWORK_DETECTORS } from '../../src/registry/frameworks.js';

describe('frameworks registry', () => {
  it('has detectors for all tier 1 languages with frameworks', () => {
    const languages = new Set(FRAMEWORK_DETECTORS.map(d => d.language));
    // All tier 1 languages that should have framework detectors
    for (const lang of ['TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java', 'Kotlin', 'Ruby', 'PHP', 'C#', 'Swift', 'Dart', 'Elixir', 'Scala']) {
      expect(languages, `Missing framework detectors for ${lang}`).toContain(lang);
    }
  });

  it('every detector has required fields', () => {
    for (const d of FRAMEWORK_DETECTORS) {
      expect(d.name).toBeTruthy();
      expect(d.language).toBeTruthy();
      expect(typeof d.detect).toBe('function');
      expect(['backend', 'frontend', 'fullstack', 'mobile', 'desktop']).toContain(d.category);
    }
  });

  it('has 40+ framework detectors', () => {
    expect(FRAMEWORK_DETECTORS.length).toBeGreaterThanOrEqual(40);
  });

  it('includes all original frameworks', () => {
    const names = FRAMEWORK_DETECTORS.map(d => d.name);
    for (const orig of ['Next.js', 'Express', 'Django', 'FastAPI', 'Gin', 'Actix', 'Spring Boot', 'React', 'Vue', 'Angular']) {
      expect(names, `Missing original framework: ${orig}`).toContain(orig);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/registry/frameworks.test.ts`
Expected: FAIL

- [ ] **Step 3: Create frameworks registry**

Create `src/registry/frameworks.ts` — extract all detectors from `src/scanner/framework.ts` (lines 9-46) and add new ones. Keep the helper functions (`hasDepIn`, `hasPythonDep`, `hasGoDep`, `hasRustDep`, `fileContains`) as local helpers in this file since they're used by detectors:

```typescript
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FrameworkDetector } from './types.js';

export const FRAMEWORK_DETECTORS: FrameworkDetector[] = [
  // ── TypeScript/JavaScript ──────────────────────
  { name: 'Next.js', language: 'TypeScript', category: 'fullstack', detect: (r) => hasDepIn(r, 'next') || existsSync(join(r, 'next.config.js')) || existsSync(join(r, 'next.config.mjs')) || existsSync(join(r, 'next.config.ts')) },
  { name: 'Nuxt', language: 'TypeScript', category: 'fullstack', detect: (r) => hasDepIn(r, 'nuxt') || existsSync(join(r, 'nuxt.config.ts')) },
  { name: 'SvelteKit', language: 'TypeScript', category: 'fullstack', detect: (r) => hasDepIn(r, '@sveltejs/kit') || existsSync(join(r, 'svelte.config.js')) },
  { name: 'Remix', language: 'TypeScript', category: 'fullstack', detect: (r) => hasDepIn(r, '@remix-run/node') },
  { name: 'Astro', language: 'TypeScript', category: 'fullstack', detect: (r) => hasDepIn(r, 'astro') || existsSync(join(r, 'astro.config.mjs')) },
  { name: 'Express', language: 'JavaScript', category: 'backend', detect: (r) => hasDepIn(r, 'express') },
  { name: 'Fastify', language: 'JavaScript', category: 'backend', detect: (r) => hasDepIn(r, 'fastify') },
  { name: 'Hono', language: 'TypeScript', category: 'backend', detect: (r) => hasDepIn(r, 'hono') },
  { name: 'NestJS', language: 'TypeScript', category: 'backend', detect: (r) => hasDepIn(r, '@nestjs/core') },
  { name: 'Koa', language: 'JavaScript', category: 'backend', detect: (r) => hasDepIn(r, 'koa') },
  { name: 'React', language: 'TypeScript', category: 'frontend', detect: (r) => hasDepIn(r, 'react') && !hasDepIn(r, 'next') && !hasDepIn(r, '@remix-run/node') },
  { name: 'Vue', language: 'TypeScript', category: 'frontend', detect: (r) => hasDepIn(r, 'vue') && !hasDepIn(r, 'nuxt') },
  { name: 'Angular', language: 'TypeScript', category: 'frontend', detect: (r) => hasDepIn(r, '@angular/core') },
  { name: 'Svelte', language: 'TypeScript', category: 'frontend', detect: (r) => hasDepIn(r, 'svelte') && !hasDepIn(r, '@sveltejs/kit') },

  // ── Python ─────────────────────────────────────
  { name: 'Django', language: 'Python', category: 'fullstack', detect: (r) => existsSync(join(r, 'manage.py')) || hasPythonDep(r, 'django') },
  { name: 'FastAPI', language: 'Python', category: 'backend', detect: (r) => hasPythonDep(r, 'fastapi') },
  { name: 'Flask', language: 'Python', category: 'backend', detect: (r) => hasPythonDep(r, 'flask') },
  { name: 'Starlette', language: 'Python', category: 'backend', detect: (r) => hasPythonDep(r, 'starlette') && !hasPythonDep(r, 'fastapi') },
  { name: 'Tornado', language: 'Python', category: 'backend', detect: (r) => hasPythonDep(r, 'tornado') },
  { name: 'Sanic', language: 'Python', category: 'backend', detect: (r) => hasPythonDep(r, 'sanic') },

  // ── Go ─────────────────────────────────────────
  { name: 'Gin', language: 'Go', category: 'backend', detect: (r) => hasGoDep(r, 'github.com/gin-gonic/gin') },
  { name: 'Echo', language: 'Go', category: 'backend', detect: (r) => hasGoDep(r, 'github.com/labstack/echo') },
  { name: 'Fiber', language: 'Go', category: 'backend', detect: (r) => hasGoDep(r, 'github.com/gofiber/fiber') },
  { name: 'Chi', language: 'Go', category: 'backend', detect: (r) => hasGoDep(r, 'github.com/go-chi/chi') },
  { name: 'Gorilla', language: 'Go', category: 'backend', detect: (r) => hasGoDep(r, 'github.com/gorilla/mux') },

  // ── Rust ───────────────────────────────────────
  { name: 'Actix', language: 'Rust', category: 'backend', detect: (r) => hasRustDep(r, 'actix-web') },
  { name: 'Axum', language: 'Rust', category: 'backend', detect: (r) => hasRustDep(r, 'axum') },
  { name: 'Rocket', language: 'Rust', category: 'backend', detect: (r) => hasRustDep(r, 'rocket') },
  { name: 'Warp', language: 'Rust', category: 'backend', detect: (r) => hasRustDep(r, 'warp') },
  { name: 'Tide', language: 'Rust', category: 'backend', detect: (r) => hasRustDep(r, 'tide') },

  // ── Java ───────────────────────────────────────
  { name: 'Spring Boot', language: 'Java', category: 'backend', detect: (r) => fileContains(join(r, 'pom.xml'), 'spring-boot') || fileContains(join(r, 'build.gradle'), 'spring-boot') || fileContains(join(r, 'build.gradle.kts'), 'spring-boot') },
  { name: 'Quarkus', language: 'Java', category: 'backend', detect: (r) => fileContains(join(r, 'pom.xml'), 'quarkus') || fileContains(join(r, 'build.gradle'), 'quarkus') },
  { name: 'Micronaut', language: 'Java', category: 'backend', detect: (r) => fileContains(join(r, 'pom.xml'), 'micronaut') || fileContains(join(r, 'build.gradle'), 'micronaut') },
  { name: 'Vert.x', language: 'Java', category: 'backend', detect: (r) => fileContains(join(r, 'pom.xml'), 'vertx') || fileContains(join(r, 'build.gradle'), 'vertx') },

  // ── Kotlin ─────────────────────────────────────
  { name: 'Ktor', language: 'Kotlin', category: 'backend', detect: (r) => fileContains(join(r, 'build.gradle.kts'), 'ktor') || fileContains(join(r, 'build.gradle'), 'ktor') },

  // ── Ruby ───────────────────────────────────────
  { name: 'Rails', language: 'Ruby', category: 'fullstack', detect: (r) => existsSync(join(r, 'config', 'routes.rb')) || hasRubyDep(r, 'rails') },
  { name: 'Sinatra', language: 'Ruby', category: 'backend', detect: (r) => hasRubyDep(r, 'sinatra') },
  { name: 'Hanami', language: 'Ruby', category: 'fullstack', detect: (r) => hasRubyDep(r, 'hanami') },

  // ── PHP ────────────────────────────────────────
  { name: 'Laravel', language: 'PHP', category: 'fullstack', detect: (r) => existsSync(join(r, 'artisan')) || hasComposerDep(r, 'laravel/framework') },
  { name: 'Symfony', language: 'PHP', category: 'backend', detect: (r) => hasComposerDep(r, 'symfony/framework-bundle') },
  { name: 'Slim', language: 'PHP', category: 'backend', detect: (r) => hasComposerDep(r, 'slim/slim') },
  { name: 'Lumen', language: 'PHP', category: 'backend', detect: (r) => hasComposerDep(r, 'laravel/lumen-framework') },

  // ── C# ─────────────────────────────────────────
  { name: 'ASP.NET Core', language: 'C#', category: 'backend', detect: (r) => csprojContains(r, 'Microsoft.AspNetCore') },
  { name: 'Blazor', language: 'C#', category: 'fullstack', detect: (r) => csprojContains(r, 'Microsoft.AspNetCore.Components') },
  { name: 'MAUI', language: 'C#', category: 'mobile', detect: (r) => csprojContains(r, 'Microsoft.Maui') },

  // ── Swift ──────────────────────────────────────
  { name: 'Vapor', language: 'Swift', category: 'backend', detect: (r) => fileContains(join(r, 'Package.swift'), 'vapor') },
  { name: 'Hummingbird', language: 'Swift', category: 'backend', detect: (r) => fileContains(join(r, 'Package.swift'), 'hummingbird') },

  // ── Dart ───────────────────────────────────────
  { name: 'Flutter', language: 'Dart', category: 'mobile', detect: (r) => fileContains(join(r, 'pubspec.yaml'), 'flutter') && existsSync(join(r, 'lib', 'main.dart')) },
  { name: 'Dart Frog', language: 'Dart', category: 'backend', detect: (r) => hasPubDep(r, 'dart_frog') },
  { name: 'Serverpod', language: 'Dart', category: 'backend', detect: (r) => hasPubDep(r, 'serverpod') },

  // ── Elixir ─────────────────────────────────────
  { name: 'Phoenix', language: 'Elixir', category: 'fullstack', detect: (r) => fileContains(join(r, 'mix.exs'), 'phoenix') },
  { name: 'Plug', language: 'Elixir', category: 'backend', detect: (r) => fileContains(join(r, 'mix.exs'), ':plug') && !fileContains(join(r, 'mix.exs'), 'phoenix') },

  // ── Scala ──────────────────────────────────────
  { name: 'Play', language: 'Scala', category: 'fullstack', detect: (r) => fileContains(join(r, 'build.sbt'), 'PlayScala') || existsSync(join(r, 'conf', 'routes')) },
  { name: 'Akka HTTP', language: 'Scala', category: 'backend', detect: (r) => fileContains(join(r, 'build.sbt'), 'akka-http') },
  { name: 'http4s', language: 'Scala', category: 'backend', detect: (r) => fileContains(join(r, 'build.sbt'), 'http4s') },
  { name: 'ZIO HTTP', language: 'Scala', category: 'backend', detect: (r) => fileContains(join(r, 'build.sbt'), 'zio-http') },

  // ── C/C++ ──────────────────────────────────────
  { name: 'Qt', language: 'C++', category: 'desktop', detect: (r) => existsSync(join(r, '*.pro')) || fileContains(join(r, 'CMakeLists.txt'), 'Qt') },
  { name: 'Drogon', language: 'C++', category: 'backend', detect: (r) => fileContains(join(r, 'CMakeLists.txt'), 'Drogon') },
];

// ── Helper functions ────────────────────────────

function readFileSafe(path: string): string {
  try { return readFileSync(path, 'utf8'); } catch { return ''; }
}

function fileContains(path: string, text: string): boolean {
  if (!existsSync(path)) return false;
  return readFileSafe(path).includes(text);
}

function readPkgJson(root: string): Record<string, unknown> | null {
  const path = join(root, 'package.json');
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}

function hasDepIn(root: string, dep: string): boolean {
  const pkg = readPkgJson(root);
  if (!pkg) return false;
  const deps = { ...(pkg.dependencies as Record<string, string> || {}), ...(pkg.devDependencies as Record<string, string> || {}) };
  return dep in deps;
}

function hasPythonDep(root: string, dep: string): boolean {
  for (const file of ['requirements.txt', 'Pipfile', 'pyproject.toml', 'setup.py']) {
    const path = join(root, file);
    if (existsSync(path) && readFileSafe(path).includes(dep)) return true;
  }
  return false;
}

function hasGoDep(root: string, dep: string): boolean {
  return fileContains(join(root, 'go.mod'), dep);
}

function hasRustDep(root: string, dep: string): boolean {
  return fileContains(join(root, 'Cargo.toml'), dep);
}

function hasRubyDep(root: string, dep: string): boolean {
  return fileContains(join(root, 'Gemfile'), dep);
}

function hasComposerDep(root: string, dep: string): boolean {
  const path = join(root, 'composer.json');
  if (!existsSync(path)) return false;
  try {
    const json = JSON.parse(readFileSync(path, 'utf8'));
    const deps = { ...(json.require || {}), ...(json['require-dev'] || {}) };
    return dep in deps;
  } catch { return false; }
}

function csprojContains(root: string, text: string): boolean {
  try {
    const { readdirSync } = require('node:fs');
    const files = readdirSync(root).filter((f: string) => f.endsWith('.csproj'));
    return files.some((f: string) => fileContains(join(root, f), text));
  } catch { return false; }
}

function hasPubDep(root: string, dep: string): boolean {
  return fileContains(join(root, 'pubspec.yaml'), dep);
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/registry/frameworks.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/registry/frameworks.ts tests/registry/frameworks.test.ts
git commit -m "feat: add 55+ framework detectors across 14 languages"
```

---

## Task 4: Test Runner & ORM Registries

**Files:**
- Create: `src/registry/testing.ts`
- Create: `src/registry/databases.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/registry/testing.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { TEST_RUNNER_DETECTORS } from '../../src/registry/testing.js';

describe('test runner registry', () => {
  it('has 20+ test runner detectors', () => {
    expect(TEST_RUNNER_DETECTORS.length).toBeGreaterThanOrEqual(20);
  });

  it('every detector has required fields', () => {
    for (const d of TEST_RUNNER_DETECTORS) {
      expect(d.name).toBeTruthy();
      expect(d.language).toBeTruthy();
      expect(typeof d.detect).toBe('function');
      expect(d.command).toBeTruthy();
    }
  });

  it('covers all tier 1 languages', () => {
    const languages = new Set(TEST_RUNNER_DETECTORS.map(d => d.language));
    for (const lang of ['TypeScript', 'Python', 'Go', 'Rust', 'Java', 'Ruby', 'PHP', 'C#', 'Swift', 'Elixir']) {
      expect(languages, `Missing test runner for ${lang}`).toContain(lang);
    }
  });
});
```

Create `tests/registry/databases.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { ORM_DETECTORS } from '../../src/registry/databases.js';

describe('ORM registry', () => {
  it('has 15+ ORM detectors', () => {
    expect(ORM_DETECTORS.length).toBeGreaterThanOrEqual(15);
  });

  it('every detector has required fields', () => {
    for (const d of ORM_DETECTORS) {
      expect(d.name).toBeTruthy();
      expect(d.language).toBeTruthy();
      expect(typeof d.detect).toBe('function');
      expect(Array.isArray(d.schemaPaths)).toBe(true);
    }
  });

  it('includes all original ORMs', () => {
    const names = ORM_DETECTORS.map(d => d.name);
    for (const orig of ['Prisma', 'Drizzle', 'TypeORM', 'SQLAlchemy', 'GORM', 'Diesel']) {
      expect(names, `Missing original ORM: ${orig}`).toContain(orig);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/registry/testing.test.ts tests/registry/databases.test.ts`
Expected: FAIL

- [ ] **Step 3: Create test runner registry**

Create `src/registry/testing.ts`:

```typescript
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TestRunnerDetector } from './types.js';

export const TEST_RUNNER_DETECTORS: TestRunnerDetector[] = [
  // ── TypeScript/JavaScript ──────────────────
  { name: 'Vitest', language: 'TypeScript', command: 'npx vitest run', detect: (r) => existsSync(join(r, 'vitest.config.ts')) || existsSync(join(r, 'vitest.config.js')) || hasNodeDep(r, 'vitest') },
  { name: 'Jest', language: 'TypeScript', command: 'npx jest', detect: (r) => existsSync(join(r, 'jest.config.ts')) || existsSync(join(r, 'jest.config.js')) || hasNodeDep(r, 'jest') },
  { name: 'Mocha', language: 'JavaScript', command: 'npx mocha', detect: (r) => existsSync(join(r, '.mocharc.yml')) || existsSync(join(r, '.mocharc.json')) || hasNodeDep(r, 'mocha') },

  // ── Python ─────────────────────────────────
  { name: 'pytest', language: 'Python', command: 'pytest', detect: (r) => existsSync(join(r, 'pytest.ini')) || hasPytestConfig(r) || hasPythonDep(r, 'pytest') },
  { name: 'unittest', language: 'Python', command: 'python -m unittest', detect: (r) => existsSync(join(r, 'tests')) && !hasPythonDep(r, 'pytest') },

  // ── Go ─────────────────────────────────────
  { name: 'Go test', language: 'Go', command: 'go test ./...', detect: (r) => existsSync(join(r, 'go.mod')) },

  // ── Rust ───────────────────────────────────
  { name: 'Cargo test', language: 'Rust', command: 'cargo test', detect: (r) => existsSync(join(r, 'Cargo.toml')) },

  // ── Java ───────────────────────────────────
  { name: 'JUnit', language: 'Java', command: 'mvn test', detect: (r) => existsSync(join(r, 'pom.xml')) || existsSync(join(r, 'build.gradle')) || existsSync(join(r, 'build.gradle.kts')) },
  { name: 'TestNG', language: 'Java', command: 'mvn test', detect: (r) => fileContains(join(r, 'pom.xml'), 'testng') },

  // ── Kotlin ─────────────────────────────────
  { name: 'Kotest', language: 'Kotlin', command: 'gradle test', detect: (r) => fileContains(join(r, 'build.gradle.kts'), 'kotest') },

  // ── Ruby ───────────────────────────────────
  { name: 'RSpec', language: 'Ruby', command: 'bundle exec rspec', detect: (r) => existsSync(join(r, '.rspec')) || existsSync(join(r, 'spec')) },
  { name: 'Minitest', language: 'Ruby', command: 'ruby -Itest', detect: (r) => existsSync(join(r, 'test')) && !existsSync(join(r, '.rspec')) },

  // ── PHP ────────────────────────────────────
  { name: 'PHPUnit', language: 'PHP', command: 'vendor/bin/phpunit', detect: (r) => existsSync(join(r, 'phpunit.xml')) || existsSync(join(r, 'phpunit.xml.dist')) },
  { name: 'Pest', language: 'PHP', command: 'vendor/bin/pest', detect: (r) => hasComposerDep(r, 'pestphp/pest') },

  // ── C# ─────────────────────────────────────
  { name: 'xUnit', language: 'C#', command: 'dotnet test', detect: (r) => csprojContains(r, 'xunit') },
  { name: 'NUnit', language: 'C#', command: 'dotnet test', detect: (r) => csprojContains(r, 'NUnit') },
  { name: 'MSTest', language: 'C#', command: 'dotnet test', detect: (r) => csprojContains(r, 'MSTest') },

  // ── Swift ──────────────────────────────────
  { name: 'XCTest', language: 'Swift', command: 'swift test', detect: (r) => existsSync(join(r, 'Package.swift')) },
  { name: 'Quick', language: 'Swift', command: 'swift test', detect: (r) => fileContains(join(r, 'Package.swift'), 'Quick') },

  // ── Dart ───────────────────────────────────
  { name: 'flutter_test', language: 'Dart', command: 'flutter test', detect: (r) => fileContains(join(r, 'pubspec.yaml'), 'flutter_test') },
  { name: 'dart test', language: 'Dart', command: 'dart test', detect: (r) => existsSync(join(r, 'pubspec.yaml')) && existsSync(join(r, 'test')) },

  // ── Elixir ─────────────────────────────────
  { name: 'ExUnit', language: 'Elixir', command: 'mix test', detect: (r) => existsSync(join(r, 'mix.exs')) },

  // ── Scala ──────────────────────────────────
  { name: 'ScalaTest', language: 'Scala', command: 'sbt test', detect: (r) => fileContains(join(r, 'build.sbt'), 'scalatest') },
  { name: 'MUnit', language: 'Scala', command: 'sbt test', detect: (r) => fileContains(join(r, 'build.sbt'), 'munit') },

  // ── C/C++ ──────────────────────────────────
  { name: 'GoogleTest', language: 'C++', command: 'ctest', detect: (r) => fileContains(join(r, 'CMakeLists.txt'), 'GTest') || fileContains(join(r, 'CMakeLists.txt'), 'gtest') },
  { name: 'Catch2', language: 'C++', command: 'ctest', detect: (r) => fileContains(join(r, 'CMakeLists.txt'), 'Catch2') },
  { name: 'CTest', language: 'C', command: 'ctest', detect: (r) => fileContains(join(r, 'CMakeLists.txt'), 'enable_testing') },

  // ── Zig ────────────────────────────────────
  { name: 'zig test', language: 'Zig', command: 'zig build test', detect: (r) => existsSync(join(r, 'build.zig')) },

  // ── Tier 2 languages ──────────────────────
  { name: 'HSpec', language: 'Haskell', command: 'stack test', detect: (r) => fileContains(join(r, 'package.yaml'), 'hspec') || fileContains(join(r, 'stack.yaml'), 'hspec') },
  { name: 'clojure.test', language: 'Clojure', command: 'lein test', detect: (r) => existsSync(join(r, 'project.clj')) || existsSync(join(r, 'deps.edn')) },
  { name: 'OUnit', language: 'OCaml', command: 'dune test', detect: (r) => existsSync(join(r, 'dune-project')) },
  { name: 'Gleam test', language: 'Gleam', command: 'gleam test', detect: (r) => existsSync(join(r, 'gleam.toml')) },
  { name: 'EUnit', language: 'Erlang', command: 'rebar3 eunit', detect: (r) => existsSync(join(r, 'rebar.config')) },
  { name: 'crystal spec', language: 'Crystal', command: 'crystal spec', detect: (r) => existsSync(join(r, 'shard.yml')) },
  { name: 'nim test', language: 'Nim', command: 'nimble test', detect: (r) => existsSync(join(r, 'tests')) && existsAnyNimble(r) },
];

// ── Helper functions ──────────────────────────

function readFileSafe(path: string): string {
  try { return readFileSync(path, 'utf8'); } catch { return ''; }
}

function fileContains(path: string, text: string): boolean {
  if (!existsSync(path)) return false;
  return readFileSafe(path).includes(text);
}

function hasNodeDep(root: string, dep: string): boolean {
  const path = join(root, 'package.json');
  if (!existsSync(path)) return false;
  try {
    const pkg = JSON.parse(readFileSync(path, 'utf8'));
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    return dep in deps;
  } catch { return false; }
}

function hasPythonDep(root: string, dep: string): boolean {
  for (const file of ['requirements.txt', 'Pipfile', 'pyproject.toml']) {
    if (fileContains(join(root, file), dep)) return true;
  }
  return false;
}

function hasPytestConfig(root: string): boolean {
  const pyproject = join(root, 'pyproject.toml');
  if (!existsSync(pyproject)) return false;
  const content = readFileSafe(pyproject);
  return content.includes('[tool.pytest]') || content.includes('pytest');
}

function hasComposerDep(root: string, dep: string): boolean {
  const path = join(root, 'composer.json');
  if (!existsSync(path)) return false;
  try {
    const json = JSON.parse(readFileSync(path, 'utf8'));
    const deps = { ...(json.require || {}), ...(json['require-dev'] || {}) };
    return dep in deps;
  } catch { return false; }
}

function csprojContains(root: string, text: string): boolean {
  try {
    const { readdirSync } = require('node:fs');
    const files = readdirSync(root).filter((f: string) => f.endsWith('.csproj'));
    return files.some((f: string) => fileContains(join(root, f), text));
  } catch { return false; }
}

function existsAnyNimble(root: string): boolean {
  try {
    const { readdirSync } = require('node:fs');
    return readdirSync(root).some((f: string) => f.endsWith('.nimble'));
  } catch { return false; }
}
```

- [ ] **Step 4: Create ORM registry**

Create `src/registry/databases.ts`:

```typescript
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { OrmDetector } from './types.js';

export const ORM_DETECTORS: OrmDetector[] = [
  // ── TypeScript/JavaScript ──────────────────
  {
    name: 'Prisma', language: 'TypeScript',
    schemaPaths: ['prisma/schema.prisma'],
    detect: (r) => {
      const schema = join(r, 'prisma', 'schema.prisma');
      if (!existsSync(schema)) return null;
      const content = readFileSafe(schema);
      if (content.includes('postgresql')) return 'PostgreSQL';
      if (content.includes('mysql')) return 'MySQL';
      if (content.includes('sqlite')) return 'SQLite';
      if (content.includes('mongodb')) return 'MongoDB';
      return 'unknown';
    },
  },
  {
    name: 'Drizzle', language: 'TypeScript',
    schemaPaths: ['src/database/schema.ts', 'src/db/schema.ts', 'drizzle/schema.ts', 'src/schema.ts'],
    detect: (r) => {
      for (const f of ['drizzle.config.ts', 'drizzle.config.js']) {
        const path = join(r, f);
        if (existsSync(path)) {
          const content = readFileSafe(path);
          if (content.includes('pg') || content.includes('postgres')) return 'PostgreSQL';
          if (content.includes('mysql')) return 'MySQL';
          if (content.includes('sqlite') || content.includes('better-sqlite')) return 'SQLite';
          return 'unknown';
        }
      }
      return null;
    },
  },
  { name: 'TypeORM', language: 'TypeScript', schemaPaths: ['src/entity/', 'src/entities/'], detect: (r) => hasNodeDep(r, 'typeorm') ? 'auto' : null },
  { name: 'Sequelize', language: 'JavaScript', schemaPaths: ['src/models/'], detect: (r) => hasNodeDep(r, 'sequelize') ? 'auto' : null },
  { name: 'Mongoose', language: 'JavaScript', schemaPaths: ['src/models/'], detect: (r) => hasNodeDep(r, 'mongoose') ? 'MongoDB' : null },

  // ── Python ─────────────────────────────────
  { name: 'SQLAlchemy', language: 'Python', schemaPaths: ['models.py', 'src/models/'], detect: (r) => hasPythonImport(r, 'sqlalchemy') ? 'auto' : null },
  { name: 'Django ORM', language: 'Python', schemaPaths: ['models.py'], detect: (r) => existsSync(join(r, 'manage.py')) ? 'auto' : null },
  { name: 'Tortoise', language: 'Python', schemaPaths: ['models.py'], detect: (r) => hasPythonImport(r, 'tortoise') ? 'auto' : null },
  { name: 'Peewee', language: 'Python', schemaPaths: ['models.py'], detect: (r) => hasPythonImport(r, 'peewee') ? 'auto' : null },

  // ── Go ─────────────────────────────────────
  { name: 'GORM', language: 'Go', schemaPaths: ['models/', 'internal/models/'], detect: (r) => hasGoDep(r, 'gorm.io/gorm') ? 'auto' : null },
  { name: 'sqlx', language: 'Go', schemaPaths: ['migrations/'], detect: (r) => hasGoDep(r, 'github.com/jmoiron/sqlx') ? 'auto' : null },
  { name: 'ent', language: 'Go', schemaPaths: ['ent/schema/'], detect: (r) => hasGoDep(r, 'entgo.io/ent') ? 'auto' : null },
  { name: 'sqlc', language: 'Go', schemaPaths: ['sqlc/', 'sql/'], detect: (r) => existsSync(join(r, 'sqlc.yaml')) || existsSync(join(r, 'sqlc.yml')) ? 'auto' : null },

  // ── Rust ───────────────────────────────────
  { name: 'Diesel', language: 'Rust', schemaPaths: ['migrations/', 'src/schema.rs'], detect: (r) => hasRustDep(r, 'diesel') ? 'auto' : null },
  { name: 'SeaORM', language: 'Rust', schemaPaths: ['migration/', 'src/entities/'], detect: (r) => hasRustDep(r, 'sea-orm') ? 'auto' : null },
  { name: 'sqlx-rust', language: 'Rust', schemaPaths: ['migrations/'], detect: (r) => hasRustDep(r, 'sqlx') ? 'auto' : null },

  // ── Java ───────────────────────────────────
  { name: 'Hibernate', language: 'Java', schemaPaths: ['src/main/java/entity/', 'src/main/java/model/'], detect: (r) => fileContains(join(r, 'pom.xml'), 'hibernate') ? 'auto' : null },
  { name: 'jOOQ', language: 'Java', schemaPaths: ['src/main/java/jooq/'], detect: (r) => fileContains(join(r, 'pom.xml'), 'jooq') ? 'auto' : null },
  { name: 'MyBatis', language: 'Java', schemaPaths: ['src/main/resources/mapper/'], detect: (r) => fileContains(join(r, 'pom.xml'), 'mybatis') ? 'auto' : null },

  // ── Ruby ───────────────────────────────────
  { name: 'ActiveRecord', language: 'Ruby', schemaPaths: ['db/schema.rb', 'db/migrate/'], detect: (r) => existsSync(join(r, 'db', 'schema.rb')) ? 'auto' : null },
  { name: 'Sequel', language: 'Ruby', schemaPaths: ['db/migrations/'], detect: (r) => hasRubyDep(r, 'sequel') ? 'auto' : null },

  // ── PHP ────────────────────────────────────
  { name: 'Eloquent', language: 'PHP', schemaPaths: ['database/migrations/'], detect: (r) => existsSync(join(r, 'database', 'migrations')) ? 'auto' : null },
  { name: 'Doctrine', language: 'PHP', schemaPaths: ['src/Entity/'], detect: (r) => hasComposerDep(r, 'doctrine/orm') ? 'auto' : null },

  // ── C# ─────────────────────────────────────
  { name: 'Entity Framework', language: 'C#', schemaPaths: ['Migrations/', 'Data/'], detect: (r) => csprojContains(r, 'EntityFramework') || csprojContains(r, 'Microsoft.EntityFrameworkCore') ? 'auto' : null },
  { name: 'Dapper', language: 'C#', schemaPaths: [], detect: (r) => csprojContains(r, 'Dapper') ? 'auto' : null },

  // ── Elixir ─────────────────────────────────
  { name: 'Ecto', language: 'Elixir', schemaPaths: ['priv/repo/migrations/', 'lib/app/schema/'], detect: (r) => fileContains(join(r, 'mix.exs'), 'ecto') ? 'auto' : null },

  // ── Swift ──────────────────────────────────
  { name: 'Fluent', language: 'Swift', schemaPaths: ['Sources/App/Migrations/'], detect: (r) => fileContains(join(r, 'Package.swift'), 'fluent') ? 'auto' : null },

  // ── Dart ───────────────────────────────────
  { name: 'Drift', language: 'Dart', schemaPaths: ['lib/database/'], detect: (r) => hasPubDep(r, 'drift') ? 'auto' : null },

  // ── Scala ──────────────────────────────────
  { name: 'Slick', language: 'Scala', schemaPaths: ['src/main/scala/tables/'], detect: (r) => fileContains(join(r, 'build.sbt'), 'slick') ? 'auto' : null },
  { name: 'Doobie', language: 'Scala', schemaPaths: [], detect: (r) => fileContains(join(r, 'build.sbt'), 'doobie') ? 'auto' : null },
];

// ── Helper functions ──────────────────────────

function readFileSafe(path: string): string {
  try { return readFileSync(path, 'utf8'); } catch { return ''; }
}

function fileContains(path: string, text: string): boolean {
  if (!existsSync(path)) return false;
  return readFileSafe(path).includes(text);
}

function hasNodeDep(root: string, dep: string): boolean {
  const path = join(root, 'package.json');
  if (!existsSync(path)) return false;
  try {
    const pkg = JSON.parse(readFileSync(path, 'utf8'));
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    return dep in deps;
  } catch { return false; }
}

function hasPythonImport(root: string, pkg: string): boolean {
  for (const f of ['requirements.txt', 'Pipfile', 'pyproject.toml']) {
    if (fileContains(join(root, f), pkg)) return true;
  }
  return false;
}

function hasGoDep(root: string, dep: string): boolean {
  return fileContains(join(root, 'go.mod'), dep);
}

function hasRustDep(root: string, dep: string): boolean {
  return fileContains(join(root, 'Cargo.toml'), dep);
}

function hasRubyDep(root: string, dep: string): boolean {
  return fileContains(join(root, 'Gemfile'), dep);
}

function hasComposerDep(root: string, dep: string): boolean {
  const path = join(root, 'composer.json');
  if (!existsSync(path)) return false;
  try {
    const json = JSON.parse(readFileSync(path, 'utf8'));
    const deps = { ...(json.require || {}), ...(json['require-dev'] || {}) };
    return dep in deps;
  } catch { return false; }
}

function csprojContains(root: string, text: string): boolean {
  try {
    const { readdirSync } = require('node:fs');
    const files = readdirSync(root).filter((f: string) => f.endsWith('.csproj'));
    return files.some((f: string) => fileContains(join(root, f), text));
  } catch { return false; }
}

function hasPubDep(root: string, dep: string): boolean {
  return fileContains(join(root, 'pubspec.yaml'), dep);
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/registry/testing.test.ts tests/registry/databases.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/registry/testing.ts src/registry/databases.ts tests/registry/testing.test.ts tests/registry/databases.test.ts
git commit -m "feat: add test runner (35+) and ORM (30+) registries"
```

---

## Task 5: Refactor Scanners to Use Registry

**Files:**
- Modify: `src/scanner/language.ts` (rewrite to use registry)
- Modify: `src/scanner/framework.ts` (rewrite to use registry)
- Modify: `src/scanner/database.ts` (rewrite to use registry)
- Modify: `src/scanner/testing.ts` (rewrite to use registry)
- Modify: `src/scanner/structure.ts` (add skip dirs from registry)

- [ ] **Step 1: Write integration test for scanner using registry**

Create `tests/scanner/language.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectLanguages } from '../../src/scanner/language.js';

describe('detectLanguages', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'codebase-pilot-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects TypeScript files', () => {
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeFileSync(join(tmpDir, 'src', 'index.ts'), 'export {}');
    writeFileSync(join(tmpDir, 'src', 'app.ts'), 'export {}');

    const result = detectLanguages(tmpDir);
    expect(result[0].name).toBe('TypeScript');
    expect(result[0].fileCount).toBe(2);
    expect(result[0].percentage).toBe(100);
  });

  it('detects Python files', () => {
    writeFileSync(join(tmpDir, 'main.py'), 'print("hi")');
    writeFileSync(join(tmpDir, 'app.py'), 'print("hi")');

    const result = detectLanguages(tmpDir);
    expect(result[0].name).toBe('Python');
  });

  it('detects Go files', () => {
    writeFileSync(join(tmpDir, 'main.go'), 'package main');

    const result = detectLanguages(tmpDir);
    expect(result[0].name).toBe('Go');
  });

  it('detects multiple languages with correct percentages', () => {
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeFileSync(join(tmpDir, 'src', 'a.ts'), '');
    writeFileSync(join(tmpDir, 'src', 'b.ts'), '');
    writeFileSync(join(tmpDir, 'src', 'c.ts'), '');
    writeFileSync(join(tmpDir, 'main.py'), '');

    const result = detectLanguages(tmpDir);
    expect(result[0].name).toBe('TypeScript');
    expect(result[0].percentage).toBe(75);
    expect(result[1].name).toBe('Python');
    expect(result[1].percentage).toBe(25);
  });

  it('skips node_modules', () => {
    mkdirSync(join(tmpDir, 'node_modules', 'foo'), { recursive: true });
    writeFileSync(join(tmpDir, 'node_modules', 'foo', 'index.js'), '');
    writeFileSync(join(tmpDir, 'src.ts'), '');

    const result = detectLanguages(tmpDir);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('TypeScript');
  });

  it('detects Tier 2 language (Haskell)', () => {
    writeFileSync(join(tmpDir, 'Main.hs'), 'main = putStrLn "hi"');

    const result = detectLanguages(tmpDir);
    expect(result[0].name).toBe('Haskell');
  });

  it('detects Tier 3 language (Solidity)', () => {
    writeFileSync(join(tmpDir, 'Token.sol'), 'pragma solidity ^0.8.0;');

    const result = detectLanguages(tmpDir);
    expect(result[0].name).toBe('Solidity');
  });

  it('returns empty for empty directory', () => {
    const result = detectLanguages(tmpDir);
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/scanner/language.test.ts`
Expected: FAIL — some new languages won't be detected yet

- [ ] **Step 3: Rewrite language scanner to use registry**

Replace contents of `src/scanner/language.ts`:

```typescript
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
```

- [ ] **Step 4: Rewrite framework scanner to use registry**

Replace contents of `src/scanner/framework.ts`:

```typescript
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { getFrameworkDetectors } from '../registry/index.js';

export function detectFramework(root: string): string | null {
  const detectors = getFrameworkDetectors();

  // Check root first
  for (const detector of detectors) {
    if (detector.detect(root)) return detector.name;
  }

  // Check workspace packages (monorepo — backend packages first)
  const backendNames = ['core', 'server', 'api', 'backend', 'app'];
  for (const dir of ['packages', 'apps', 'services']) {
    const dirPath = join(root, dir);
    if (!existsSync(dirPath)) continue;
    try {
      const children = readdirSync(dirPath).filter((f) => {
        try { return statSync(join(dirPath, f)).isDirectory(); } catch { return false; }
      });
      children.sort((a, b) => {
        const aIsBackend = backendNames.some((n) => a.toLowerCase().includes(n)) ? 0 : 1;
        const bIsBackend = backendNames.some((n) => b.toLowerCase().includes(n)) ? 0 : 1;
        return aIsBackend - bIsBackend;
      });
      for (const child of children) {
        const pkgPath = join(dirPath, child);
        for (const detector of detectors) {
          if (detector.detect(pkgPath)) return detector.name;
        }
      }
    } catch {}
  }

  return null;
}
```

- [ ] **Step 5: Rewrite database scanner to use registry**

Replace contents of `src/scanner/database.ts`:

```typescript
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readdirSync, statSync } from 'node:fs';
import type { DatabaseInfo } from '../types.js';
import { getOrmDetectors } from '../registry/index.js';

export function detectDatabase(root: string): DatabaseInfo | null {
  const detectors = getOrmDetectors();

  // Check root first
  for (const detector of detectors) {
    const result = detector.detect(root);
    if (result) {
      const schemaPath = findSchemaPath(root, detector.schemaPaths);
      return { orm: detector.name, type: result === 'auto' ? 'auto' : result, schemaPath };
    }
  }

  // Check workspace packages (monorepo)
  for (const dir of ['packages', 'apps', 'services']) {
    const dirPath = join(root, dir);
    if (!existsSync(dirPath)) continue;
    try {
      const children = readdirSync(dirPath).filter((f) => {
        try { return statSync(join(dirPath, f)).isDirectory(); } catch { return false; }
      });
      for (const child of children) {
        const pkgPath = join(dirPath, child);
        for (const detector of detectors) {
          const result = detector.detect(pkgPath);
          if (result) {
            const schemaPath = findSchemaPath(pkgPath, detector.schemaPaths);
            const relativePath = schemaPath ? `${dir}/${child}/${schemaPath}` : null;
            return { orm: detector.name, type: result === 'auto' ? 'auto' : result, schemaPath: relativePath };
          }
        }
      }
    } catch {}
  }

  return null;
}

function findSchemaPath(root: string, candidates: string[]): string | null {
  for (const path of candidates) {
    if (existsSync(join(root, path))) return path;
  }
  return null;
}
```

- [ ] **Step 6: Rewrite testing scanner to use registry**

Replace contents of `src/scanner/testing.ts`:

```typescript
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { getTestRunnerDetectors } from '../registry/index.js';

export function detectTestRunner(root: string): string | null {
  const detectors = getTestRunnerDetectors();

  for (const detector of detectors) {
    if (detector.detect(root)) return detector.name;
  }

  // Check workspace packages
  for (const dir of ['packages', 'apps', 'services']) {
    const dirPath = join(root, dir);
    if (!existsSync(dirPath)) continue;
    try {
      const children = readdirSync(dirPath).filter((f) => {
        try { return statSync(join(dirPath, f)).isDirectory(); } catch { return false; }
      });
      for (const child of children) {
        for (const detector of detectors) {
          if (detector.detect(join(dirPath, child))) return detector.name;
        }
      }
    } catch {}
  }

  return null;
}
```

- [ ] **Step 7: Update structure.ts to use registry skip dirs**

In `src/scanner/structure.ts`, replace the hardcoded SKIP_DIRS (lines 5-9):

```typescript
// Replace:
const SKIP_DIRS = new Set([...]);

// With:
import { getSkipDirs } from '../registry/index.js';
const SKIP_DIRS = getSkipDirs();
```

- [ ] **Step 8: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 9: Commit**

```bash
git add src/scanner/language.ts src/scanner/framework.ts src/scanner/database.ts src/scanner/testing.ts src/scanner/structure.ts tests/scanner/language.test.ts
git commit -m "refactor: wire all scanners to use registry"
```

---

## Task 6: Fix Command — Smart Path Resolution

**Files:**
- Modify: `src/cli/fix.ts`

- [ ] **Step 1: Write failing test**

Create `tests/cli/fix.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { resolveMovedPath } from '../../src/cli/fix.js';

describe('resolveMovedPath', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'codebase-pilot-fix-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('resolves directory path to file with extension', () => {
    writeFileSync(join(tmpDir, 'types.ts'), 'export {}');
    const result = resolveMovedPath(tmpDir, 'types/', ['TypeScript']);
    expect(result).toBe('types.ts');
  });

  it('resolves file path to directory', () => {
    mkdirSync(join(tmpDir, 'types'), { recursive: true });
    writeFileSync(join(tmpDir, 'types', 'index.ts'), '');
    const result = resolveMovedPath(tmpDir, 'types.ts', ['TypeScript']);
    expect(result).toBe('types/');
  });

  it('resolves nested path with src prefix', () => {
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeFileSync(join(tmpDir, 'src', 'types.ts'), 'export {}');
    const result = resolveMovedPath(tmpDir, 'src/types/', ['TypeScript']);
    expect(result).toBe('src/types.ts');
  });

  it('returns null when no match found', () => {
    const result = resolveMovedPath(tmpDir, 'nonexistent/', ['TypeScript']);
    expect(result).toBeNull();
  });

  it('returns null for valid paths', () => {
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    const result = resolveMovedPath(tmpDir, 'src/', ['TypeScript']);
    expect(result).toBeNull(); // path exists, no fix needed
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/cli/fix.test.ts`
Expected: FAIL — `resolveMovedPath` not exported

- [ ] **Step 3: Rewrite fix.ts with smart path resolution**

Replace `src/cli/fix.ts`:

```typescript
import { resolve } from 'node:path';
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import type { AgentsConfig } from '../types.js';
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
    const dirCandidate = withoutExt + '/';
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
      // Look for similar names
      const match = entries.find(e => {
        const eName = e.replace(/\.[^.]+$/, '');
        return eName.toLowerCase() === name.toLowerCase();
      });
      if (match) {
        const matchPath = dir === '.' ? match : `${dir}/${match}`;
        const matchFull = join(root, matchPath);
        if (statSync(matchFull).isDirectory()) return matchPath + '/';
        return matchPath;
      }
    } catch {}
  }

  // Strategy 4: Search deeper for the name
  const found = findByName(root, name, 0);
  if (found) return found;

  return null;
}

function getExtensionsForLanguages(languages: string[]): string[] {
  const allLangs = getAllLanguages();
  const extensions: string[] = [];
  for (const langName of languages) {
    const lang = allLangs.find(l => l.name === langName);
    if (lang) extensions.push(...lang.extensions);
  }
  // Also add common extensions as fallback
  if (extensions.length === 0) {
    extensions.push('.ts', '.js', '.py', '.go', '.rs', '.java', '.rb', '.php');
  }
  return extensions;
}

function detectProjectLanguages(root: string): string[] {
  // Quick scan: check package files to determine project languages
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
  try {
    const skipDirs = new Set(['node_modules', 'dist', 'build', '.git', 'target', 'vendor']);
    for (const entry of readdirSync(dir)) {
      if (entry.startsWith('.') || skipDirs.has(entry)) continue;
      const full = join(dir, entry);
      try {
        if (!statSync(full).isDirectory()) continue;
      } catch { continue; }

      if (entry === name) {
        const { relative } = require('node:path');
        return relative(dir, full) + '/';
      }

      const found = findByName(full, name, depth + 1);
      if (found) return entry + '/' + found;
    }
  } catch {}
  return null;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/cli/fix.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cli/fix.ts tests/cli/fix.test.ts
git commit -m "feat: smart path resolution in fix command (file↔directory)"
```

---

## Task 7: Package Type Detection Fix

**Files:**
- Modify: `src/scanner/structure.ts` (enhance `inferPackageType`)

- [ ] **Step 1: Write failing test**

Create `tests/scanner/structure.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectStructure } from '../../src/scanner/structure.js';

describe('detectStructure', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'codebase-pilot-struct-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects CLI project by bin field in package.json', () => {
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
      name: 'my-tool',
      bin: { 'my-tool': 'dist/bin/cli.js' },
    }));
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeFileSync(join(tmpDir, 'src', 'index.ts'), '');

    const result = detectStructure(tmpDir, [{ name: 'TypeScript', extensions: ['.ts'], percentage: 100, fileCount: 1 }]);
    expect(result.packages[0].type).toBe('cli');
  });

  it('detects CLI project by commander dependency', () => {
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
      name: 'my-cli',
      dependencies: { commander: '^12.0.0' },
    }));
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeFileSync(join(tmpDir, 'src', 'index.ts'), '');

    const result = detectStructure(tmpDir, [{ name: 'TypeScript', extensions: ['.ts'], percentage: 100, fileCount: 1 }]);
    expect(result.packages[0].type).toBe('cli');
  });

  it('detects API project by express dependency', () => {
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
      name: 'my-api',
      dependencies: { express: '^4.0.0' },
    }));
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeFileSync(join(tmpDir, 'src', 'index.ts'), '');

    const result = detectStructure(tmpDir, [{ name: 'TypeScript', extensions: ['.ts'], percentage: 100, fileCount: 1 }]);
    expect(result.packages[0].type).toBe('api');
  });

  it('detects monorepo with pnpm-workspace.yaml', () => {
    writeFileSync(join(tmpDir, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*');
    mkdirSync(join(tmpDir, 'packages', 'web'), { recursive: true });
    mkdirSync(join(tmpDir, 'packages', 'api'), { recursive: true });
    writeFileSync(join(tmpDir, 'packages', 'web', 'index.ts'), '');
    writeFileSync(join(tmpDir, 'packages', 'api', 'index.ts'), '');

    const result = detectStructure(tmpDir, [{ name: 'TypeScript', extensions: ['.ts'], percentage: 100, fileCount: 2 }]);
    expect(result.type).toBe('monorepo');
  });

  it('detects Go CLI by cobra dependency', () => {
    writeFileSync(join(tmpDir, 'go.mod'), 'module example.com/tool\n\nrequire github.com/spf13/cobra v1.8.0');
    writeFileSync(join(tmpDir, 'main.go'), 'package main');

    const result = detectStructure(tmpDir, [{ name: 'Go', extensions: ['.go'], percentage: 100, fileCount: 1 }]);
    expect(result.packages[0].type).toBe('cli');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/scanner/structure.test.ts`
Expected: FAIL — CLI detection by bin/deps not implemented

- [ ] **Step 3: Enhance inferPackageType in structure.ts**

In `src/scanner/structure.ts`, replace the `inferPackageType` function (lines 103-127) with:

```typescript
function inferPackageType(
  pkgPath: string,
  _root: string,
): PackageInfo['type'] {
  const name = basename(pkgPath).toLowerCase();

  // 1. Check bin field in package.json → CLI
  const pkg = readPkgJsonSafe(pkgPath);
  if (pkg?.bin) return 'cli';

  // 2. Check CLI framework dependencies
  const cliDeps = [
    // Node.js
    'commander', 'yargs', 'meow', 'clipanion', 'oclif', 'cac', 'citty',
  ];
  if (pkg && hasAnyDep(pkg, cliDeps)) return 'cli';

  // Go CLI frameworks
  if (hasGoDep(pkgPath, 'github.com/spf13/cobra') || hasGoDep(pkgPath, 'github.com/urfave/cli')) return 'cli';

  // Rust CLI frameworks
  if (hasRustDep(pkgPath, 'clap')) return 'cli';

  // Python CLI frameworks
  if (hasPythonDep(pkgPath, 'click') || hasPythonDep(pkgPath, 'typer')) return 'cli';

  // 3. Check server framework deps → API
  const serverDeps = [
    'express', 'fastify', 'hono', 'koa', '@nestjs/core', 'hapi',
  ];
  if (pkg && hasAnyDep(pkg, serverDeps)) return 'api';

  // 4. Check frontend framework deps → web
  const frontendDeps = [
    'react', 'vue', 'svelte', '@angular/core', 'next', 'nuxt',
  ];
  if (pkg && hasAnyDep(pkg, frontendDeps)) return 'web';

  // 5. Name-based inference (existing logic)
  if (name.includes('api') || name.includes('server') || name.includes('backend') || name === 'core') {
    return 'api';
  }
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
```

Also add `readFileSync` to the imports at the top of `structure.ts`:

```typescript
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/scanner/structure.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/scanner/structure.ts tests/scanner/structure.test.ts
git commit -m "feat: dependency-based package type inference (CLI, API, web)"
```

---

## Task 8: Fix types-agent Context Path in Generator

**Files:**
- Modify: `src/agents/generator.ts:30-39`

- [ ] **Step 1: Write failing test**

Create `tests/agents/generator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generateAgents } from '../../src/agents/generator.js';
import type { ProjectScan } from '../../src/types.js';

function makeScan(overrides: Partial<ProjectScan> = {}): ProjectScan {
  return {
    root: '/tmp/test',
    name: 'test-project',
    type: 'single-package',
    languages: [{ name: 'TypeScript', extensions: ['.ts'], percentage: 100, fileCount: 10 }],
    framework: null,
    database: null,
    testRunner: 'Vitest',
    packages: [{ name: 'test-project', path: '.', type: 'cli', language: 'TypeScript', entryPoint: 'src/index.ts', fileCount: 10 }],
    existing: { claudeMd: false, claudeMdPath: null, claudeignore: false, claudeignorePath: null, agentsJson: false, mcpServers: [] },
    ...overrides,
  };
}

describe('generateAgents', () => {
  it('creates types-agent with src/types.ts not src/types/ for single-package TS', () => {
    const config = generateAgents(makeScan());
    const typesAgent = config.agents['types-agent'];
    expect(typesAgent).toBeDefined();
    // Should not reference a directory that might not exist
    expect(typesAgent.context[0]).not.toBe('src/types/');
  });

  it('uses schema path for types-agent when database detected', () => {
    const config = generateAgents(makeScan({
      database: { orm: 'Prisma', type: 'PostgreSQL', schemaPath: 'prisma/schema.prisma' },
    }));
    expect(config.agents['types-agent'].context[0]).toBe('prisma/schema.prisma');
  });

  it('generates healthcheck-agent at layer 0', () => {
    const config = generateAgents(makeScan());
    expect(config.agents['healthcheck-agent'].layer).toBe(0);
  });

  it('generates quality gate agents', () => {
    const config = generateAgents(makeScan());
    expect(config.agents['standards-agent']).toBeDefined();
    expect(config.agents['supervisor-agent']).toBeDefined();
    expect(config.agents['docs-agent']).toBeDefined();
  });

  it('generates full-feature pattern', () => {
    const config = generateAgents(makeScan());
    expect(config.patterns['full-feature']).toBeDefined();
    expect(config.patterns['full-feature'].length).toBeGreaterThan(0);
  });

  it('maps CLI package to cli-agent', () => {
    const config = generateAgents(makeScan());
    const cliAgents = Object.keys(config.agents).filter(k => k.includes('cli'));
    expect(cliAgents.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/agents/generator.test.ts`
Expected: FAIL — types-agent still references `src/types/`

- [ ] **Step 3: Fix the types-agent context path**

In `src/agents/generator.ts`, replace lines 29-39:

```typescript
  // Add types-agent if TypeScript project
  if (scan.languages.some((l) => l.name === 'TypeScript')) {
    const typesContext = scan.database?.schemaPath
      ? [scan.database.schemaPath]
      : ['src/'];

    agents['types-agent'] = {
      name: 'types-agent',
      model: 'haiku',
      context: typesContext,
      task: 'Extract TypeScript interfaces — pure type extraction, no logic',
      layer: 1,
      dependsOn: scan.database?.schemaPath ? ['schema-agent'] : [],
    };
    workAgents.push('types-agent');
  }
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/agents/generator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/agents/generator.ts tests/agents/generator.test.ts
git commit -m "fix: types-agent uses src/ instead of non-existent src/types/"
```

---

## Task 9: Build, Self-Test & Verify

**Files:** None new — this is a validation task

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 2: Build the project**

Run: `npm run build`
Expected: Build success

- [ ] **Step 3: Re-run codebase-pilot on itself**

Run: `node dist/bin/codebase-pilot.js init --dir .`

Expected:
- Language: TypeScript (100%) — detected ✓
- Tests: Vitest — detected ✓
- Package type: **cli** (not "unknown") — the fix ✓

- [ ] **Step 4: Run health check**

Run: `node dist/bin/codebase-pilot.js health --dir .`

Expected: **HEALTHY ✓** — no stale paths

- [ ] **Step 5: Verify fix command handles the old types/ issue**

Create a test scenario:
```bash
# Temporarily break agents.json to have src/types/
# Then run fix and verify it auto-resolves
node dist/bin/codebase-pilot.js fix --dir .
```

Expected: If any stale paths remain, fix resolves them

- [ ] **Step 6: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: 50+ language support with data-driven registry

- 55 languages across 3 tiers (full ecosystem / pkg+test / extension-only)
- 55+ framework detectors, 30+ ORM detectors, 35+ test runner detectors
- Smart fix command (file↔directory path resolution)
- Dependency-based package type detection (CLI, API, web)
- Comprehensive test suite (registry + scanner + CLI + agents)
- Self-test passes: own project detected as CLI, health check green"
```

---

## Task Dependency Graph

```
Task 1 (registry types + index)
  ├── Task 2 (languages registry) ─── can run parallel ──┐
  ├── Task 3 (frameworks registry) ── can run parallel ──┤
  └── Task 4 (testing + ORM registries) ── parallel ─────┘
                                                          │
Task 5 (refactor scanners) ←──────────────────────────────┘
  │
  ├── Task 6 (fix command) ─── can run parallel ──┐
  ├── Task 7 (package type) ── can run parallel ──┤
  └── Task 8 (types-agent) ── can run parallel ───┘
                                                   │
Task 9 (build + self-test) ←───────────────────────┘
```

**Parallelizable groups:**
- Group A: Tasks 2, 3, 4 (all registry data — independent files)
- Group B: Tasks 6, 7, 8 (all bug fixes — independent changes)

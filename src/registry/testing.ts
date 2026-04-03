import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { TestRunnerDetector } from './types.js';

// ─── Helpers ───────────────────────────────────────────────────────────────

function readFileSafe(filePath: string): string {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

function fileContains(root: string, relPath: string, needle: string): boolean {
  return readFileSafe(join(root, relPath)).includes(needle);
}

function hasNodeDep(root: string, dep: string): boolean {
  const content = readFileSafe(join(root, 'package.json'));
  if (!content) return false;
  try {
    const pkg = JSON.parse(content);
    return !!(
      pkg.dependencies?.[dep] ||
      pkg.devDependencies?.[dep] ||
      pkg.peerDependencies?.[dep]
    );
  } catch {
    return false;
  }
}

function hasPythonDep(root: string, dep: string): boolean {
  // Check requirements.txt
  const reqs = readFileSafe(join(root, 'requirements.txt'));
  if (reqs && reqs.toLowerCase().includes(dep.toLowerCase())) return true;
  // Check pyproject.toml
  const pyproject = readFileSafe(join(root, 'pyproject.toml'));
  if (pyproject && pyproject.toLowerCase().includes(dep.toLowerCase())) return true;
  // Check setup.py
  const setup = readFileSafe(join(root, 'setup.py'));
  if (setup && setup.toLowerCase().includes(dep.toLowerCase())) return true;
  // Check Pipfile
  const pipfile = readFileSafe(join(root, 'Pipfile'));
  if (pipfile && pipfile.toLowerCase().includes(dep.toLowerCase())) return true;
  return false;
}

function hasGoDep(root: string, dep: string): boolean {
  return fileContains(root, 'go.mod', dep);
}

function hasRustDep(root: string, dep: string): boolean {
  return fileContains(root, 'Cargo.toml', dep);
}

function hasComposerDep(root: string, dep: string): boolean {
  const content = readFileSafe(join(root, 'composer.json'));
  if (!content) return false;
  try {
    const pkg = JSON.parse(content);
    return !!(
      pkg.require?.[dep] ||
      pkg['require-dev']?.[dep]
    );
  } catch {
    return false;
  }
}

function anyFileContains(root: string, globs: string[], needle: string): boolean {
  for (const g of globs) {
    if (fileContains(root, g, needle)) return true;
  }
  return false;
}

function csprojContains(root: string, needle: string): boolean {
  // Check common csproj locations
  const candidates = ['', 'src'];
  for (const dir of candidates) {
    const base = dir ? join(root, dir) : root;
    try {
      const files = readdirSync(base);
      for (const f of files) {
        if (f.endsWith('.csproj')) {
          const content = readFileSafe(join(base, f));
          if (content.includes(needle)) return true;
        }
      }
    } catch {
      // ignore
    }
  }
  return false;
}

// ─── TypeScript/JavaScript ─────────────────────────────────────────────────

const vitest: TestRunnerDetector = {
  name: 'Vitest',
  language: 'TypeScript',
  detect: (root) =>
    existsSync(join(root, 'vitest.config.ts')) ||
    existsSync(join(root, 'vitest.config.js')) ||
    existsSync(join(root, 'vitest.config.mts')) ||
    hasNodeDep(root, 'vitest'),
  command: 'npx vitest run',
};

const jest: TestRunnerDetector = {
  name: 'Jest',
  language: 'TypeScript',
  detect: (root) =>
    existsSync(join(root, 'jest.config.js')) ||
    existsSync(join(root, 'jest.config.ts')) ||
    existsSync(join(root, 'jest.config.mjs')) ||
    existsSync(join(root, 'jest.config.cjs')) ||
    hasNodeDep(root, 'jest'),
  command: 'npx jest',
};

const mocha: TestRunnerDetector = {
  name: 'Mocha',
  language: 'TypeScript',
  detect: (root) =>
    existsSync(join(root, '.mocharc.yml')) ||
    existsSync(join(root, '.mocharc.yaml')) ||
    existsSync(join(root, '.mocharc.json')) ||
    existsSync(join(root, '.mocharc.js')) ||
    hasNodeDep(root, 'mocha'),
  command: 'npx mocha',
};

// ─── Python ────────────────────────────────────────────────────────────────

const pytest: TestRunnerDetector = {
  name: 'pytest',
  language: 'Python',
  detect: (root) =>
    existsSync(join(root, 'pytest.ini')) ||
    existsSync(join(root, 'conftest.py')) ||
    fileContains(root, 'pyproject.toml', '[tool.pytest') ||
    fileContains(root, 'setup.cfg', '[tool:pytest]') ||
    hasPythonDep(root, 'pytest'),
  command: 'pytest',
};

const unittest: TestRunnerDetector = {
  name: 'unittest',
  language: 'Python',
  detect: (root) =>
    existsSync(join(root, 'tests')) &&
    !existsSync(join(root, 'pytest.ini')) &&
    !existsSync(join(root, 'conftest.py')) &&
    !hasPythonDep(root, 'pytest'),
  command: 'python -m unittest',
};

// ─── Go ────────────────────────────────────────────────────────────────────

const goTest: TestRunnerDetector = {
  name: 'Go test',
  language: 'Go',
  detect: (root) => existsSync(join(root, 'go.mod')),
  command: 'go test ./...',
};

// ─── Rust ──────────────────────────────────────────────────────────────────

const cargoTest: TestRunnerDetector = {
  name: 'Cargo test',
  language: 'Rust',
  detect: (root) => existsSync(join(root, 'Cargo.toml')),
  command: 'cargo test',
};

// ─── Java ──────────────────────────────────────────────────────────────────

const junit: TestRunnerDetector = {
  name: 'JUnit',
  language: 'Java',
  detect: (root) =>
    (existsSync(join(root, 'pom.xml')) &&
      fileContains(root, 'pom.xml', 'junit')) ||
    (existsSync(join(root, 'build.gradle')) &&
      fileContains(root, 'build.gradle', 'junit')) ||
    (existsSync(join(root, 'build.gradle.kts')) &&
      fileContains(root, 'build.gradle.kts', 'junit')),
  command: 'mvn test',
};

const testng: TestRunnerDetector = {
  name: 'TestNG',
  language: 'Java',
  detect: (root) =>
    (existsSync(join(root, 'pom.xml')) &&
      fileContains(root, 'pom.xml', 'testng')) ||
    (existsSync(join(root, 'build.gradle')) &&
      fileContains(root, 'build.gradle', 'testng')),
  command: 'mvn test',
};

// ─── Kotlin ────────────────────────────────────────────────────────────────

const kotest: TestRunnerDetector = {
  name: 'Kotest',
  language: 'Kotlin',
  detect: (root) =>
    existsSync(join(root, 'build.gradle.kts')) &&
    fileContains(root, 'build.gradle.kts', 'kotest'),
  command: 'gradle test',
};

// ─── Ruby ──────────────────────────────────────────────────────────────────

const rspec: TestRunnerDetector = {
  name: 'RSpec',
  language: 'Ruby',
  detect: (root) =>
    existsSync(join(root, '.rspec')) ||
    existsSync(join(root, 'spec')),
  command: 'bundle exec rspec',
};

const minitest: TestRunnerDetector = {
  name: 'Minitest',
  language: 'Ruby',
  detect: (root) =>
    existsSync(join(root, 'test')) &&
    !existsSync(join(root, '.rspec')),
  command: 'ruby -Itest',
};

// ─── PHP ───────────────────────────────────────────────────────────────────

const phpunit: TestRunnerDetector = {
  name: 'PHPUnit',
  language: 'PHP',
  detect: (root) =>
    existsSync(join(root, 'phpunit.xml')) ||
    existsSync(join(root, 'phpunit.xml.dist')) ||
    hasComposerDep(root, 'phpunit/phpunit'),
  command: 'vendor/bin/phpunit',
};

const pest: TestRunnerDetector = {
  name: 'Pest',
  language: 'PHP',
  detect: (root) => hasComposerDep(root, 'pestphp/pest'),
  command: 'vendor/bin/pest',
};

// ─── C# ────────────────────────────────────────────────────────────────────

const xunit: TestRunnerDetector = {
  name: 'xUnit',
  language: 'C#',
  detect: (root) => csprojContains(root, 'xunit'),
  command: 'dotnet test',
};

const nunit: TestRunnerDetector = {
  name: 'NUnit',
  language: 'C#',
  detect: (root) => csprojContains(root, 'NUnit'),
  command: 'dotnet test',
};

const mstest: TestRunnerDetector = {
  name: 'MSTest',
  language: 'C#',
  detect: (root) => csprojContains(root, 'MSTest'),
  command: 'dotnet test',
};

// ─── Swift ─────────────────────────────────────────────────────────────────

const xctest: TestRunnerDetector = {
  name: 'XCTest',
  language: 'Swift',
  detect: (root) =>
    existsSync(join(root, 'Package.swift')) &&
    !fileContains(root, 'Package.swift', 'Quick'),
  command: 'swift test',
};

const quick: TestRunnerDetector = {
  name: 'Quick',
  language: 'Swift',
  detect: (root) =>
    existsSync(join(root, 'Package.swift')) &&
    fileContains(root, 'Package.swift', 'Quick'),
  command: 'swift test',
};

// ─── Dart ──────────────────────────────────────────────────────────────────

const flutterTest: TestRunnerDetector = {
  name: 'flutter_test',
  language: 'Dart',
  detect: (root) =>
    existsSync(join(root, 'pubspec.yaml')) &&
    fileContains(root, 'pubspec.yaml', 'flutter_test'),
  command: 'flutter test',
};

const dartTest: TestRunnerDetector = {
  name: 'dart test',
  language: 'Dart',
  detect: (root) =>
    existsSync(join(root, 'pubspec.yaml')) &&
    existsSync(join(root, 'test')) &&
    !fileContains(root, 'pubspec.yaml', 'flutter_test'),
  command: 'dart test',
};

// ─── Elixir ────────────────────────────────────────────────────────────────

const exunit: TestRunnerDetector = {
  name: 'ExUnit',
  language: 'Elixir',
  detect: (root) => existsSync(join(root, 'mix.exs')),
  command: 'mix test',
};

// ─── Scala ─────────────────────────────────────────────────────────────────

const scalatest: TestRunnerDetector = {
  name: 'ScalaTest',
  language: 'Scala',
  detect: (root) =>
    existsSync(join(root, 'build.sbt')) &&
    fileContains(root, 'build.sbt', 'scalatest'),
  command: 'sbt test',
};

const munit: TestRunnerDetector = {
  name: 'MUnit',
  language: 'Scala',
  detect: (root) =>
    existsSync(join(root, 'build.sbt')) &&
    fileContains(root, 'build.sbt', 'munit'),
  command: 'sbt test',
};

// ─── C/C++ ─────────────────────────────────────────────────────────────────

const googletest: TestRunnerDetector = {
  name: 'GoogleTest',
  language: 'C++',
  detect: (root) =>
    existsSync(join(root, 'CMakeLists.txt')) &&
    (fileContains(root, 'CMakeLists.txt', 'GTest') ||
      fileContains(root, 'CMakeLists.txt', 'gtest')),
  command: 'ctest',
};

const catch2: TestRunnerDetector = {
  name: 'Catch2',
  language: 'C++',
  detect: (root) =>
    existsSync(join(root, 'CMakeLists.txt')) &&
    fileContains(root, 'CMakeLists.txt', 'Catch2'),
  command: 'ctest',
};

const ctest: TestRunnerDetector = {
  name: 'CTest',
  language: 'C',
  detect: (root) =>
    existsSync(join(root, 'CMakeLists.txt')) &&
    fileContains(root, 'CMakeLists.txt', 'enable_testing'),
  command: 'ctest',
};

// ─── Zig ───────────────────────────────────────────────────────────────────

const zigTest: TestRunnerDetector = {
  name: 'zig test',
  language: 'Zig',
  detect: (root) => existsSync(join(root, 'build.zig')),
  command: 'zig build test',
};

// ─── Tier 2 ────────────────────────────────────────────────────────────────

const hspec: TestRunnerDetector = {
  name: 'HSpec',
  language: 'Haskell',
  detect: (root) =>
    existsSync(join(root, 'package.yaml')) &&
    fileContains(root, 'package.yaml', 'hspec') ||
    existsSync(join(root, 'stack.yaml')),
  command: 'stack test',
};

const clojureTest: TestRunnerDetector = {
  name: 'clojure.test',
  language: 'Clojure',
  detect: (root) =>
    existsSync(join(root, 'deps.edn')) ||
    existsSync(join(root, 'project.clj')),
  command: 'clj -X:test',
};

const ounit: TestRunnerDetector = {
  name: 'OUnit',
  language: 'OCaml',
  detect: (root) =>
    existsSync(join(root, 'dune-project')) &&
    (fileContains(root, 'dune-project', 'ounit') ||
      fileContains(root, 'dune-project', 'test')),
  command: 'dune runtest',
};

const gleamTest: TestRunnerDetector = {
  name: 'Gleam test',
  language: 'Gleam',
  detect: (root) => existsSync(join(root, 'gleam.toml')),
  command: 'gleam test',
};

const eunit: TestRunnerDetector = {
  name: 'EUnit',
  language: 'Erlang',
  detect: (root) =>
    existsSync(join(root, 'rebar.config')) ||
    existsSync(join(root, 'erlang.mk')),
  command: 'rebar3 eunit',
};

const crystalSpec: TestRunnerDetector = {
  name: 'crystal spec',
  language: 'Crystal',
  detect: (root) =>
    existsSync(join(root, 'shard.yml')) &&
    existsSync(join(root, 'spec')),
  command: 'crystal spec',
};

const nimTest: TestRunnerDetector = {
  name: 'nim test',
  language: 'Nim',
  detect: (root) => {
    try {
      const files = readdirSync(root);
      return files.some((f) => f.endsWith('.nimble'));
    } catch {
      return false;
    }
  },
  command: 'nimble test',
};

// ─── Extra Tier 2 ──────────────────────────────────────────────────────────

const dTest: TestRunnerDetector = {
  name: 'D unittest',
  language: 'D',
  detect: (root) =>
    existsSync(join(root, 'dub.json')) ||
    existsSync(join(root, 'dub.sdl')),
  command: 'dub test',
};

const juliaTest: TestRunnerDetector = {
  name: 'Julia Test',
  language: 'Julia',
  detect: (root) =>
    existsSync(join(root, 'Project.toml')) &&
    existsSync(join(root, 'test')),
  command: 'julia --project -e "using Pkg; Pkg.test()"',
};

const luaTest: TestRunnerDetector = {
  name: 'Busted',
  language: 'Lua',
  detect: (root) =>
    existsSync(join(root, '.busted')) ||
    fileContains(root, '.luarocks/config.lua', 'busted'),
  command: 'busted',
};

const perlTest: TestRunnerDetector = {
  name: 'Perl Test',
  language: 'Perl',
  detect: (root) =>
    existsSync(join(root, 't')) &&
    (existsSync(join(root, 'Makefile.PL')) ||
      existsSync(join(root, 'Build.PL')) ||
      existsSync(join(root, 'cpanfile'))),
  command: 'prove -l t/',
};

// ─── Export ────────────────────────────────────────────────────────────────

export const TEST_RUNNER_DETECTORS: TestRunnerDetector[] = [
  // TypeScript/JS
  vitest,
  jest,
  mocha,
  // Python
  pytest,
  unittest,
  // Go
  goTest,
  // Rust
  cargoTest,
  // Java
  junit,
  testng,
  // Kotlin
  kotest,
  // Ruby
  rspec,
  minitest,
  // PHP
  phpunit,
  pest,
  // C#
  xunit,
  nunit,
  mstest,
  // Swift
  xctest,
  quick,
  // Dart
  flutterTest,
  dartTest,
  // Elixir
  exunit,
  // Scala
  scalatest,
  munit,
  // C/C++
  googletest,
  catch2,
  ctest,
  // Zig
  zigTest,
  // Tier 2
  hspec,
  clojureTest,
  ounit,
  gleamTest,
  eunit,
  crystalSpec,
  nimTest,
  dTest,
  juliaTest,
  luaTest,
  perlTest,
];

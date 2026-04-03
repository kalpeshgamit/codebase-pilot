import { existsSync } from 'node:fs';
import { join } from 'node:path';

interface TestDetector {
  name: string;
  detect: (root: string) => boolean;
}

const DETECTORS: TestDetector[] = [
  { name: 'Vitest', detect: (r) => existsSync(join(r, 'vitest.config.ts')) || existsSync(join(r, 'vitest.config.js')) || hasNodeDep(r, 'vitest') },
  { name: 'Jest', detect: (r) => existsSync(join(r, 'jest.config.ts')) || existsSync(join(r, 'jest.config.js')) || hasNodeDep(r, 'jest') },
  { name: 'Mocha', detect: (r) => existsSync(join(r, '.mocharc.yml')) || existsSync(join(r, '.mocharc.json')) || hasNodeDep(r, 'mocha') },
  { name: 'pytest', detect: (r) => existsSync(join(r, 'pytest.ini')) || existsSync(join(r, 'pyproject.toml')) && hasPytestConfig(r) },
  { name: 'Go test', detect: (r) => existsSync(join(r, 'go.mod')) },
  { name: 'Cargo test', detect: (r) => existsSync(join(r, 'Cargo.toml')) },
  { name: 'JUnit', detect: (r) => existsSync(join(r, 'pom.xml')) || existsSync(join(r, 'build.gradle')) },
  { name: 'RSpec', detect: (r) => existsSync(join(r, '.rspec')) || existsSync(join(r, 'spec')) },
  { name: 'PHPUnit', detect: (r) => existsSync(join(r, 'phpunit.xml')) || existsSync(join(r, 'phpunit.xml.dist')) },
];

export function detectTestRunner(root: string): string | null {
  for (const detector of DETECTORS) {
    if (detector.detect(root)) return detector.name;
  }
  return null;
}

function hasNodeDep(root: string, dep: string): boolean {
  const pkgPath = join(root, 'package.json');
  if (!existsSync(pkgPath)) return false;
  try {
    const { readFileSync } = require('node:fs');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    return dep in deps;
  } catch {
    return false;
  }
}

function hasPytestConfig(root: string): boolean {
  try {
    const { readFileSync } = require('node:fs');
    const content = readFileSync(join(root, 'pyproject.toml'), 'utf8');
    return content.includes('[tool.pytest]') || content.includes('pytest');
  } catch {
    return false;
  }
}

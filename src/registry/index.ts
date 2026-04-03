import type { LanguageEntry } from './types.js';
import { LANGUAGES } from './languages.js';
import { FRAMEWORK_DETECTORS } from './frameworks.js';
import { TEST_RUNNER_DETECTORS } from './testing.js';
import { ORM_DETECTORS } from './databases.js';

const extMap = new Map<string, LanguageEntry>();
for (const lang of LANGUAGES) {
  for (const ext of lang.extensions) {
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

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

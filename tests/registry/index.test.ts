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
          const conflicts = ['.v', '.fs', '.pl', '.h'];
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

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

  it('has unique detector names', () => {
    const names = TEST_RUNNER_DETECTORS.map(d => d.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it('detect functions return boolean for non-existent path', () => {
    for (const d of TEST_RUNNER_DETECTORS) {
      const result = d.detect('/tmp/__nonexistent_project__');
      expect(typeof result).toBe('boolean');
    }
  });
});

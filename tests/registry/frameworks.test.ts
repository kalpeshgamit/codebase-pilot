import { describe, it, expect } from 'vitest';
import { FRAMEWORK_DETECTORS } from '../../src/registry/frameworks.js';

describe('frameworks registry', () => {
  it('has detectors for all tier 1 languages with frameworks', () => {
    const languages = new Set(FRAMEWORK_DETECTORS.map(d => d.language));
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

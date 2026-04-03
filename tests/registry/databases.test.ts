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

  it('has unique detector names', () => {
    const names = ORM_DETECTORS.map(d => d.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it('detect functions return string or null for non-existent path', () => {
    for (const d of ORM_DETECTORS) {
      const result = d.detect('/tmp/__nonexistent_project__');
      expect(result === null || typeof result === 'string').toBe(true);
    }
  });

  it('every detector has at least one schema path', () => {
    for (const d of ORM_DETECTORS) {
      expect(d.schemaPaths.length, `${d.name} has no schema paths`).toBeGreaterThanOrEqual(1);
    }
  });
});

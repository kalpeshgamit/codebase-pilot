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

  it('returns null for valid paths (path exists)', () => {
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    const result = resolveMovedPath(tmpDir, 'src/', ['TypeScript']);
    expect(result).toBeNull();
  });
});

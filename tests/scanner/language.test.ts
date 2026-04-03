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

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { collectFiles } from '../../src/packer/collector.js';

describe('collectFiles', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cp-collector-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('collects all source files', () => {
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeFileSync(join(tmpDir, 'src', 'index.ts'), 'export {}');
    writeFileSync(join(tmpDir, 'src', 'app.ts'), 'const x = 1;');

    const files = collectFiles(tmpDir, {});
    expect(files.length).toBe(2);
    expect(files[0].relativePath).toBeDefined();
    expect(files[0].content).toBeDefined();
  });

  it('skips node_modules', () => {
    mkdirSync(join(tmpDir, 'node_modules', 'foo'), { recursive: true });
    writeFileSync(join(tmpDir, 'node_modules', 'foo', 'index.js'), '');
    writeFileSync(join(tmpDir, 'index.ts'), 'export {}');

    const files = collectFiles(tmpDir, {});
    expect(files.length).toBe(1);
    expect(files[0].relativePath).toBe('index.ts');
  });

  it('skips .env files', () => {
    writeFileSync(join(tmpDir, '.env'), 'SECRET=foo');
    writeFileSync(join(tmpDir, '.env.local'), 'SECRET=bar');
    writeFileSync(join(tmpDir, 'index.ts'), 'export {}');

    const files = collectFiles(tmpDir, {});
    expect(files.length).toBe(1);
  });

  it('respects .claudeignore patterns', () => {
    writeFileSync(join(tmpDir, '.claudeignore'), '*.log\ncoverage/');
    writeFileSync(join(tmpDir, 'app.log'), 'log data');
    writeFileSync(join(tmpDir, 'index.ts'), 'export {}');

    const files = collectFiles(tmpDir, {});
    expect(files.length).toBe(1);
    expect(files[0].relativePath).toBe('index.ts');
  });

  it('scopes to agent context when specified', () => {
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    mkdirSync(join(tmpDir, 'docs'), { recursive: true });
    writeFileSync(join(tmpDir, 'src', 'index.ts'), 'export {}');
    writeFileSync(join(tmpDir, 'docs', 'readme.md'), '# docs');

    const files = collectFiles(tmpDir, { agentContextPaths: ['src/'] });
    expect(files.length).toBe(1);
    expect(files[0].relativePath).toBe('src/index.ts');
  });

  it('includes language info based on extension', () => {
    writeFileSync(join(tmpDir, 'main.py'), 'print("hi")');
    const files = collectFiles(tmpDir, {});
    expect(files[0].language).toBe('Python');
  });
});

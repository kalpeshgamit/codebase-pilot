import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectStructure } from '../../src/scanner/structure.js';

describe('detectStructure', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'codebase-pilot-struct-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects CLI project by bin field in package.json', () => {
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
      name: 'my-tool',
      bin: { 'my-tool': 'dist/bin/cli.js' },
    }));
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeFileSync(join(tmpDir, 'src', 'index.ts'), '');

    const result = detectStructure(tmpDir, [{ name: 'TypeScript', extensions: ['.ts'], percentage: 100, fileCount: 1 }]);
    expect(result.packages[0].type).toBe('cli');
  });

  it('detects CLI project by commander dependency', () => {
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
      name: 'my-cli',
      dependencies: { commander: '^12.0.0' },
    }));
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeFileSync(join(tmpDir, 'src', 'index.ts'), '');

    const result = detectStructure(tmpDir, [{ name: 'TypeScript', extensions: ['.ts'], percentage: 100, fileCount: 1 }]);
    expect(result.packages[0].type).toBe('cli');
  });

  it('detects API project by express dependency', () => {
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
      name: 'my-api',
      dependencies: { express: '^4.0.0' },
    }));
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeFileSync(join(tmpDir, 'src', 'index.ts'), '');

    const result = detectStructure(tmpDir, [{ name: 'TypeScript', extensions: ['.ts'], percentage: 100, fileCount: 1 }]);
    expect(result.packages[0].type).toBe('api');
  });

  it('detects monorepo with pnpm-workspace.yaml', () => {
    writeFileSync(join(tmpDir, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*');
    mkdirSync(join(tmpDir, 'packages', 'web'), { recursive: true });
    mkdirSync(join(tmpDir, 'packages', 'api'), { recursive: true });
    writeFileSync(join(tmpDir, 'packages', 'web', 'index.ts'), '');
    writeFileSync(join(tmpDir, 'packages', 'api', 'index.ts'), '');

    const result = detectStructure(tmpDir, [{ name: 'TypeScript', extensions: ['.ts'], percentage: 100, fileCount: 2 }]);
    expect(result.type).toBe('monorepo');
  });

  it('detects Go CLI by cobra dependency', () => {
    writeFileSync(join(tmpDir, 'go.mod'), 'module example.com/tool\n\nrequire github.com/spf13/cobra v1.8.0');
    writeFileSync(join(tmpDir, 'main.go'), 'package main');

    const result = detectStructure(tmpDir, [{ name: 'Go', extensions: ['.go'], percentage: 100, fileCount: 1 }]);
    expect(result.packages[0].type).toBe('cli');
  });

  it('detects web project by react dependency', () => {
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
      name: 'my-web',
      dependencies: { react: '^18.0.0' },
    }));
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeFileSync(join(tmpDir, 'src', 'index.ts'), '');

    const result = detectStructure(tmpDir, [{ name: 'TypeScript', extensions: ['.ts'], percentage: 100, fileCount: 1 }]);
    expect(result.packages[0].type).toBe('web');
  });
});

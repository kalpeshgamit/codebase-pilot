import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scanCommand } from '../../src/cli/scan.js';

function makeTmpDir(): string {
  const dir = join(tmpdir(), `cp-scan-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('scanCommand', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));
    writeFileSync(join(tmpDir, 'tsconfig.json'), '{}');
    mkdirSync(join(tmpDir, '.codebase-pilot'), { recursive: true });
    writeFileSync(join(tmpDir, '.codebase-pilot', 'agents.json'), JSON.stringify({ agents: {}, patterns: {} }));
  });

  afterEach(() => {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('updates agents.json on rescan', async () => {
    await scanCommand({ dir: tmpDir });
    expect(existsSync(join(tmpDir, '.codebase-pilot', 'agents.json'))).toBe(true);
    const content = JSON.parse(readFileSync(join(tmpDir, '.codebase-pilot', 'agents.json'), 'utf8'));
    expect(content).toHaveProperty('agents');
  });

  it('updates CLAUDE.md on rescan', async () => {
    await scanCommand({ dir: tmpDir });
    expect(existsSync(join(tmpDir, 'CLAUDE.md'))).toBe(true);
  });

  it('updates .claudeignore on rescan', async () => {
    await scanCommand({ dir: tmpDir });
    expect(existsSync(join(tmpDir, '.claudeignore'))).toBe(true);
  });

  it('does not throw when .codebase-pilot is missing', async () => {
    rmSync(join(tmpDir, '.codebase-pilot'), { recursive: true });
    await expect(scanCommand({ dir: tmpDir })).resolves.not.toThrow();
  });
});

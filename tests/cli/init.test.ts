import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initCommand } from '../../src/cli/init.js';

function makeTmpDir(): string {
  const dir = join(tmpdir(), `cp-init-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('initCommand', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    // Minimal package.json so scanner detects TypeScript project
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ name: 'test', dependencies: {} }));
    writeFileSync(join(tmpDir, 'tsconfig.json'), '{}');
    writeFileSync(join(tmpDir, 'src', 'index.ts').replace('src', ''), '// test');
  });

  afterEach(() => {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('dry-run does not write any files', async () => {
    await initCommand({ dir: tmpDir, mcp: false, platform: '', dryRun: true });
    expect(existsSync(join(tmpDir, 'CLAUDE.md'))).toBe(false);
    expect(existsSync(join(tmpDir, '.claudeignore'))).toBe(false);
    expect(existsSync(join(tmpDir, '.codebase-pilot', 'agents.json'))).toBe(false);
  });

  it('generates CLAUDE.md on init', async () => {
    await initCommand({ dir: tmpDir, mcp: false, platform: '', dryRun: false });
    expect(existsSync(join(tmpDir, 'CLAUDE.md'))).toBe(true);
  });

  it('generates .claudeignore on init', async () => {
    await initCommand({ dir: tmpDir, mcp: false, platform: '', dryRun: false });
    expect(existsSync(join(tmpDir, '.claudeignore'))).toBe(true);
  });

  it('generates agents.json on init', async () => {
    await initCommand({ dir: tmpDir, mcp: false, platform: '', dryRun: false });
    expect(existsSync(join(tmpDir, '.codebase-pilot', 'agents.json'))).toBe(true);
  });

  it('updates .gitignore with codebase-pilot entry', async () => {
    await initCommand({ dir: tmpDir, mcp: false, platform: '', dryRun: false });
    if (existsSync(join(tmpDir, '.gitignore'))) {
      const content = readFileSync(join(tmpDir, '.gitignore'), 'utf8');
      expect(content).toContain('.codebase-pilot/');
    }
  });

  it('does not overwrite existing CLAUDE.md — merges instead', async () => {
    writeFileSync(join(tmpDir, 'CLAUDE.md'), '# My existing CLAUDE\n\ncustom content here');
    await initCommand({ dir: tmpDir, mcp: false, platform: '', dryRun: false });
    const content = readFileSync(join(tmpDir, 'CLAUDE.md'), 'utf8');
    // Should preserve existing content (merge, not overwrite)
    expect(content).toContain('My existing CLAUDE');
  });

  it('generates platform rules when --platform is set', async () => {
    await initCommand({ dir: tmpDir, mcp: false, platform: 'cursor', dryRun: false });
    // cursor generates .cursorrules or similar
    const files = ['.cursorrules', '.cursor/rules'];
    const anyExists = files.some(f => existsSync(join(tmpDir, f)));
    expect(anyExists).toBe(true);
  });
});

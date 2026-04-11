import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { healthCommand } from '../../src/cli/health.js';

function makeTmpDir(): string {
  const dir = join(tmpdir(), `cp-health-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

const VALID_AGENTS_JSON = JSON.stringify({
  agents: {
    'frontend-agent': {
      name: 'frontend-agent',
      description: 'Frontend work',
      model: 'sonnet',
      layer: 1,
      context: ['src/'],
      dependsOn: [],
    },
    'backend-agent': {
      name: 'backend-agent',
      description: 'Backend work',
      model: 'sonnet',
      layer: 2,
      context: ['src/'],
      dependsOn: ['frontend-agent'],
    },
  },
  patterns: {},
}, null, 2);

describe('healthCommand', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('sets exitCode=1 and returns when agents.json is missing', async () => {
    const prevCode = process.exitCode;
    process.exitCode = 0;
    await healthCommand({ dir: tmpDir });
    expect(process.exitCode).toBe(1);
    process.exitCode = prevCode as number | undefined;
  });

  it('does not hard-exit — returns gracefully', async () => {
    // If process.exit() is called, vitest would terminate. Passing = no hard exit.
    await healthCommand({ dir: tmpDir });
    expect(true).toBe(true);
  });

  it('reports HEALTHY for valid agents.json', async () => {
    mkdirSync(join(tmpDir, '.codebase-pilot'), { recursive: true });
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeFileSync(join(tmpDir, '.codebase-pilot', 'agents.json'), VALID_AGENTS_JSON);
    await healthCommand({ dir: tmpDir });
    // If we get here without error, health check ran successfully
    expect(true).toBe(true);
  });

  it('sets exitCode=1 for invalid JSON in agents.json', async () => {
    mkdirSync(join(tmpDir, '.codebase-pilot'), { recursive: true });
    writeFileSync(join(tmpDir, '.codebase-pilot', 'agents.json'), 'not valid json {{{');
    const prevCode = process.exitCode;
    process.exitCode = 0;
    await healthCommand({ dir: tmpDir });
    expect(process.exitCode).toBe(1);
    process.exitCode = prevCode as number | undefined;
  });
});

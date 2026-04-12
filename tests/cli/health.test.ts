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

function writeAgents(tmpDir: string, config: object): void {
  mkdirSync(join(tmpDir, '.codebase-pilot'), { recursive: true });
  writeFileSync(join(tmpDir, '.codebase-pilot', 'agents.json'), JSON.stringify(config, null, 2));
}

function makeValidConfig(tmpDir: string) {
  mkdirSync(join(tmpDir, 'src'), { recursive: true });
  return {
    version: '1.0.0',
    project: 'test',
    agents: {
      'types-agent': {
        name: 'types-agent',
        model: 'haiku',
        context: ['src/'],
        task: 'Types',
        layer: 1,
        dependsOn: [],
      },
      'api-agent': {
        name: 'api-agent',
        model: 'sonnet',
        context: ['src/'],
        task: 'API',
        layer: 2,
        dependsOn: ['types-agent'],
      },
      'standards-agent': {
        name: 'standards-agent',
        model: 'opus',
        context: ['src/'],
        task: 'Standards',
        layer: 4,
        dependsOn: ['api-agent'],
      },
    },
    patterns: {
      'api-feature': ['types-agent', 'api-agent', 'standards-agent'],
    },
  };
}

// ---------------------------------------------------------------------------
// Basic file existence checks
// ---------------------------------------------------------------------------

describe('healthCommand — file existence', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { try { rmSync(tmpDir, { recursive: true, force: true }); } catch {} });

  it('sets exitCode=1 when agents.json is missing', async () => {
    process.exitCode = 0;
    await healthCommand({ dir: tmpDir });
    expect(process.exitCode).toBe(1);
  });

  it('does not hard-exit — returns gracefully', async () => {
    await healthCommand({ dir: tmpDir });
    expect(true).toBe(true);
  });

  it('sets exitCode=1 for invalid JSON', async () => {
    mkdirSync(join(tmpDir, '.codebase-pilot'), { recursive: true });
    writeFileSync(join(tmpDir, '.codebase-pilot', 'agents.json'), 'not valid json {{{');
    process.exitCode = 0;
    await healthCommand({ dir: tmpDir });
    expect(process.exitCode).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Healthy config
// ---------------------------------------------------------------------------

describe('healthCommand — healthy config', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { try { rmSync(tmpDir, { recursive: true, force: true }); } catch {} });

  it('exitCode stays 0 for a valid config', async () => {
    writeAgents(tmpDir, makeValidConfig(tmpDir));
    process.exitCode = 0;
    await healthCommand({ dir: tmpDir });
    expect(process.exitCode).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Magic string detection — context paths
// ---------------------------------------------------------------------------

describe('healthCommand — magic strings in context', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { try { rmSync(tmpDir, { recursive: true, force: true }); } catch {} });

  it('sets exitCode=1 when context contains "ALL agent outputs"', async () => {
    const config = makeValidConfig(tmpDir);
    (config.agents['standards-agent'] as any).context = ['ALL agent outputs'];
    writeAgents(tmpDir, config);
    process.exitCode = 0;
    await healthCommand({ dir: tmpDir });
    expect(process.exitCode).toBe(1);
  });

  it('sets exitCode=1 when context contains "Agent execution logs"', async () => {
    const config = makeValidConfig(tmpDir);
    (config.agents['standards-agent'] as any).context = ['Agent execution logs'];
    writeAgents(tmpDir, config);
    process.exitCode = 0;
    await healthCommand({ dir: tmpDir });
    expect(process.exitCode).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Magic string detection — dependsOn
// ---------------------------------------------------------------------------

describe('healthCommand — magic strings in dependsOn', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { try { rmSync(tmpDir, { recursive: true, force: true }); } catch {} });

  it('sets exitCode=1 when dependsOn contains "ALL previous layers"', async () => {
    const config = makeValidConfig(tmpDir);
    (config.agents['standards-agent'] as any).dependsOn = ['ALL previous layers'];
    writeAgents(tmpDir, config);
    process.exitCode = 0;
    await healthCommand({ dir: tmpDir });
    expect(process.exitCode).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Missing dependency detection
// ---------------------------------------------------------------------------

describe('healthCommand — missing dependsOn targets', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { try { rmSync(tmpDir, { recursive: true, force: true }); } catch {} });

  it('sets exitCode=1 when an agent depends on a non-existent agent', async () => {
    const config = makeValidConfig(tmpDir);
    (config.agents['api-agent'] as any).dependsOn = ['ghost-agent'];
    writeAgents(tmpDir, config);
    process.exitCode = 0;
    await healthCommand({ dir: tmpDir });
    expect(process.exitCode).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Cycle detection
// ---------------------------------------------------------------------------

describe('healthCommand — cycle detection', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { try { rmSync(tmpDir, { recursive: true, force: true }); } catch {} });

  it('sets exitCode=1 for a two-node cycle (a → b → a)', async () => {
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeAgents(tmpDir, {
      version: '1.0.0',
      project: 'test',
      agents: {
        'agent-a': { name: 'agent-a', model: 'haiku', context: ['src/'], task: 'A', layer: 1, dependsOn: ['agent-b'] },
        'agent-b': { name: 'agent-b', model: 'haiku', context: ['src/'], task: 'B', layer: 1, dependsOn: ['agent-a'] },
      },
      patterns: {},
    });
    process.exitCode = 0;
    await healthCommand({ dir: tmpDir });
    expect(process.exitCode).toBe(1);
  });

  it('sets exitCode=1 for a three-node cycle (a → b → c → a)', async () => {
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeAgents(tmpDir, {
      version: '1.0.0',
      project: 'test',
      agents: {
        'agent-a': { name: 'agent-a', model: 'haiku', context: ['src/'], task: 'A', layer: 1, dependsOn: ['agent-c'] },
        'agent-b': { name: 'agent-b', model: 'haiku', context: ['src/'], task: 'B', layer: 2, dependsOn: ['agent-a'] },
        'agent-c': { name: 'agent-c', model: 'haiku', context: ['src/'], task: 'C', layer: 3, dependsOn: ['agent-b'] },
      },
      patterns: {},
    });
    process.exitCode = 0;
    await healthCommand({ dir: tmpDir });
    expect(process.exitCode).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Layer ordering violations
// ---------------------------------------------------------------------------

describe('healthCommand — layer ordering', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { try { rmSync(tmpDir, { recursive: true, force: true }); } catch {} });

  it('sets exitCode=1 when a lower-layer agent depends on a higher-layer agent', async () => {
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeAgents(tmpDir, {
      version: '1.0.0',
      project: 'test',
      agents: {
        'standards-agent': { name: 'standards-agent', model: 'opus', context: ['src/'], task: 'Standards', layer: 4, dependsOn: [] },
        // types-agent (layer 1) wrongly depends on standards-agent (layer 4)
        'types-agent': { name: 'types-agent', model: 'haiku', context: ['src/'], task: 'Types', layer: 1, dependsOn: ['standards-agent'] },
      },
      patterns: {},
    });
    process.exitCode = 0;
    await healthCommand({ dir: tmpDir });
    expect(process.exitCode).toBe(1);
  });

  it('allows same-layer dependencies without error', async () => {
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeAgents(tmpDir, {
      version: '1.0.0',
      project: 'test',
      agents: {
        'schema-agent': { name: 'schema-agent', model: 'haiku', context: ['src/'], task: 'Schema', layer: 1, dependsOn: [] },
        'types-agent': { name: 'types-agent', model: 'haiku', context: ['src/'], task: 'Types', layer: 1, dependsOn: ['schema-agent'] },
      },
      patterns: {
        'full-feature': ['schema-agent', 'types-agent'],
      },
    });
    process.exitCode = 0;
    await healthCommand({ dir: tmpDir });
    expect(process.exitCode).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Stale context path detection
// ---------------------------------------------------------------------------

describe('healthCommand — stale context paths', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { try { rmSync(tmpDir, { recursive: true, force: true }); } catch {} });

  it('sets exitCode=1 when context path does not exist on disk', async () => {
    // Do NOT create src/ — leave it missing
    writeAgents(tmpDir, {
      version: '1.0.0',
      project: 'test',
      agents: {
        'api-agent': { name: 'api-agent', model: 'sonnet', context: ['src/routes/'], task: 'API', layer: 2, dependsOn: [] },
      },
      patterns: {},
    });
    process.exitCode = 0;
    await healthCommand({ dir: tmpDir });
    expect(process.exitCode).toBe(1);
  });
});

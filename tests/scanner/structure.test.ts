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

describe('detectStructure — registry detection', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'codebase-pilot-registry-'));
    // Create monorepo root so packages/ children are scanned
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
      name: 'my-monorepo',
      workspaces: ['packages/*'],
    }));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('classifies a directory of 5+ sub-packages as registry', () => {
    // Create packages/plugins with 6 sub-packages each having src/
    const pluginsDir = join(tmpDir, 'packages', 'plugins');
    for (const name of ['stripe', 'discord', 'openai', 'slack', 'github', 'sendgrid']) {
      mkdirSync(join(pluginsDir, name, 'src'), { recursive: true });
      writeFileSync(join(pluginsDir, name, 'src', 'index.ts'), '');
    }

    const result = detectStructure(tmpDir, [{ name: 'TypeScript', extensions: ['.ts'], percentage: 100, fileCount: 10 }]);
    const pluginsPkg = result.packages.find(p => p.name === 'plugins');
    expect(pluginsPkg).toBeDefined();
    expect(pluginsPkg!.type).toBe('registry');
  });

  it('does NOT classify a package with its own src/ as registry (even if named plugins)', () => {
    // packages/plugins has its own src/ — it's a real package, not a registry
    const pluginsDir = join(tmpDir, 'packages', 'plugins');
    mkdirSync(join(pluginsDir, 'src'), { recursive: true });
    writeFileSync(join(pluginsDir, 'src', 'index.ts'), '');
    writeFileSync(join(pluginsDir, 'package.json'), JSON.stringify({ name: 'plugins' }));
    // Add a few sub-dirs to try to trigger registry detection
    for (const name of ['stripe', 'discord', 'openai', 'slack', 'github', 'sendgrid']) {
      mkdirSync(join(pluginsDir, name, 'src'), { recursive: true });
    }

    const result = detectStructure(tmpDir, [{ name: 'TypeScript', extensions: ['.ts'], percentage: 100, fileCount: 10 }]);
    const pluginsPkg = result.packages.find(p => p.name === 'plugins');
    // Has own package.json → should NOT be registry
    expect(pluginsPkg?.type).not.toBe('registry');
  });

  it('does NOT classify small directories (< 5 sub-packages) as registry', () => {
    // Only 3 sub-packages — below threshold
    const appsDir = join(tmpDir, 'packages', 'apps');
    for (const name of ['web', 'admin', 'mobile']) {
      mkdirSync(join(appsDir, name, 'src'), { recursive: true });
      writeFileSync(join(appsDir, name, 'src', 'index.ts'), '');
    }

    const result = detectStructure(tmpDir, [{ name: 'TypeScript', extensions: ['.ts'], percentage: 100, fileCount: 10 }]);
    const appsPkg = result.packages.find(p => p.name === 'apps');
    expect(appsPkg?.type).not.toBe('registry');
  });
});

describe('registry agent generation', () => {
  it('generates a registry-agent for registry package type', async () => {
    const { mkdirSync: mkdir, writeFileSync: write, rmSync: rm } = await import('node:fs');
    const { join: j } = await import('node:path');
    const { tmpdir: td } = await import('node:os');
    const { generateAgents } = await import('../../src/agents/generator.js');

    const root = j(td(), `cp-registry-${Date.now()}`);
    mkdir(root, { recursive: true });
    try {
      const config = generateAgents({
        root,
        name: 'test-project',
        type: 'monorepo',
        languages: [{ name: 'TypeScript', extensions: ['.ts'], percentage: 100, fileCount: 100 }],
        framework: null,
        database: null,
        testRunner: null,
        packages: [
          { name: 'plugins', path: 'packages/plugins', type: 'registry', language: 'TypeScript', entryPoint: null, fileCount: 3484 },
          { name: 'core', path: 'packages/core', type: 'api', language: 'TypeScript', entryPoint: null, fileCount: 730 },
        ],
        existing: { claudeMd: false, claudeMdPath: null, claudeignore: false, claudeignorePath: null, agentsJson: false, mcpServers: [] },
      });

      const registryAgent = config.agents['plugins-registry-agent'];
      expect(registryAgent).toBeDefined();
      expect(registryAgent.name).toBe('plugins-registry-agent');
      expect(registryAgent.layer).toBe(2);
      expect(registryAgent.context[0]).toBe('packages/plugins/');
      expect(registryAgent.task).toContain('registry');
      expect(registryAgent.task).toContain('3484 files');
    } finally {
      rm(root, { recursive: true, force: true });
    }
  });
});

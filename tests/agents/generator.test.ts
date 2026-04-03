import { describe, it, expect } from 'vitest';
import { generateAgents } from '../../src/agents/generator.js';
import type { ProjectScan } from '../../src/types.js';

function makeScan(overrides: Partial<ProjectScan> = {}): ProjectScan {
  return {
    root: '/tmp/test',
    name: 'test-project',
    type: 'single-package',
    languages: [{ name: 'TypeScript', extensions: ['.ts'], percentage: 100, fileCount: 10 }],
    framework: null,
    database: null,
    testRunner: 'Vitest',
    packages: [{ name: 'test-project', path: '.', type: 'cli', language: 'TypeScript', entryPoint: 'src/index.ts', fileCount: 10 }],
    existing: { claudeMd: false, claudeMdPath: null, claudeignore: false, claudeignorePath: null, agentsJson: false, mcpServers: [] },
    ...overrides,
  };
}

describe('generateAgents', () => {
  it('creates types-agent with src/ not src/types/ for single-package TS', () => {
    const config = generateAgents(makeScan());
    const typesAgent = config.agents['types-agent'];
    expect(typesAgent).toBeDefined();
    expect(typesAgent.context[0]).not.toBe('src/types/');
    expect(typesAgent.context[0]).toBe('src/');
  });

  it('uses schema path for types-agent when database detected', () => {
    const config = generateAgents(makeScan({
      database: { orm: 'Prisma', type: 'PostgreSQL', schemaPath: 'prisma/schema.prisma' },
    }));
    expect(config.agents['types-agent'].context[0]).toBe('prisma/schema.prisma');
  });

  it('generates healthcheck-agent at layer 0', () => {
    const config = generateAgents(makeScan());
    expect(config.agents['healthcheck-agent'].layer).toBe(0);
  });

  it('generates quality gate agents', () => {
    const config = generateAgents(makeScan());
    expect(config.agents['standards-agent']).toBeDefined();
    expect(config.agents['supervisor-agent']).toBeDefined();
    expect(config.agents['docs-agent']).toBeDefined();
  });

  it('generates full-feature pattern', () => {
    const config = generateAgents(makeScan());
    expect(config.patterns['full-feature']).toBeDefined();
    expect(config.patterns['full-feature'].length).toBeGreaterThan(0);
  });

  it('maps CLI package to cli-agent', () => {
    const config = generateAgents(makeScan());
    const cliAgents = Object.keys(config.agents).filter(k => k.includes('cli'));
    expect(cliAgents.length).toBeGreaterThan(0);
  });
});

import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detect } from '../../src/scanner/detector.js';
import { generateAgents } from '../../src/agents/generator.js';
import type { AgentsConfig, AgentDefinition } from '../../src/types.js';

// ---------------------------------------------------------------------------
// Test fixture builder
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  const dir = join(tmpdir(), `cp-int-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeFile(root: string, relPath: string, content: string): void {
  const abs = join(root, relPath);
  mkdirSync(abs.substring(0, abs.lastIndexOf('/')), { recursive: true });
  writeFileSync(abs, content);
}

function writePkg(root: string, relPath: string, pkg: object): void {
  writeFile(root, relPath, JSON.stringify(pkg, null, 2));
}

/** Health check: verify agents.json is self-consistent (no cycles, no missing deps, correct layers) */
function healthCheck(config: AgentsConfig): { issues: string[] } {
  const issues: string[] = [];
  const agents = config.agents;
  const names = new Set(Object.keys(agents));

  for (const [name, agent] of Object.entries(agents)) {
    // No magic strings in context
    for (const ctx of agent.context) {
      if (ctx.includes('ALL') || ctx.includes('logs') || ctx.toLowerCase().includes('agent output')) {
        issues.push(`${name}: magic string in context: "${ctx}"`);
      }
    }

    // All dependsOn reference real agents
    for (const dep of agent.dependsOn) {
      if (!names.has(dep)) {
        issues.push(`${name}: dependsOn unknown agent "${dep}"`);
      }
    }
  }

  // Layer ordering: every dep must have a layer <= the agent's layer (same-layer deps allowed, higher-layer deps are not)
  for (const [name, agent] of Object.entries(agents)) {
    for (const dep of agent.dependsOn) {
      const depAgent = agents[dep] as AgentDefinition | undefined;
      if (depAgent && depAgent.layer > agent.layer) {
        issues.push(`${name} (layer ${agent.layer}) depends on ${dep} (layer ${depAgent.layer}) — dep has higher layer`);
      }
    }
  }

  // Patterns reference real agents
  for (const [patternName, steps] of Object.entries(config.patterns)) {
    for (const step of steps) {
      if (!names.has(step)) {
        issues.push(`pattern "${patternName}": references unknown agent "${step}"`);
      }
    }
  }

  return { issues };
}

// ---------------------------------------------------------------------------
// Project type 1: Pure CLI (TypeScript + commander)
// ---------------------------------------------------------------------------

describe('CLI project (TypeScript + commander)', () => {
  let root: string;
  let config: AgentsConfig;

  // Build fixture and run detector + generator once
  async function setup() {
    root = makeTmpDir();
    writePkg(root, 'package.json', {
      name: 'my-cli',
      dependencies: { commander: '^11.0.0' },
      devDependencies: { typescript: '^5.0.0' },
    });
    writeFile(root, 'tsconfig.json', '{}');
    writeFile(root, 'src/index.ts', 'import { Command } from "commander";');
    writeFile(root, 'src/commands/build.ts', 'export const buildCmd = () => {};');

    const scan = await detect(root);
    config = generateAgents(scan);
  }

  it('generates a cli-agent', async () => {
    await setup();
    try {
      const cliAgent = Object.values(config.agents).find(a => a.name.endsWith('-cli-agent'));
      expect(cliAgent).toBeDefined();
      expect(cliAgent!.layer).toBe(2);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('cli-agent context is src/ (tight)', async () => {
    await setup();
    try {
      const cliAgent = Object.values(config.agents).find(a => a.name.endsWith('-cli-agent'));
      expect(cliAgent!.context[0]).toBe('src/');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('cli-command pattern exists and is foundation-free', async () => {
    await setup();
    try {
      const p = config.patterns['cli-command'];
      expect(p).toBeDefined();
      expect(p).not.toContain('schema-agent');
      expect(p).not.toContain('types-agent');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('passes health check', async () => {
    await setup();
    try {
      const { issues } = healthCheck(config);
      expect(issues).toEqual([]);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});

// ---------------------------------------------------------------------------
// Project type 2: Express API (TypeScript + express + Prisma)
// ---------------------------------------------------------------------------

describe('Express API project (TypeScript + Express + Prisma)', () => {
  let root: string;
  let config: AgentsConfig;

  async function setup() {
    root = makeTmpDir();
    writePkg(root, 'package.json', {
      name: 'my-api',
      dependencies: { express: '^4.18.0', '@prisma/client': '^5.0.0' },
      devDependencies: { typescript: '^5.0.0', prisma: '^5.0.0' },
    });
    writeFile(root, 'tsconfig.json', '{}');
    writeFile(root, 'src/index.ts', 'import express from "express";');
    writeFile(root, 'src/routes/users.ts', 'export const usersRouter = {};');
    writeFile(root, 'prisma/schema.prisma', 'datasource db { provider = "postgresql" }');

    const scan = await detect(root);
    config = generateAgents(scan);
  }

  it('generates api-agent', async () => {
    await setup();
    try {
      const apiAgent = Object.values(config.agents).find(a => a.name.endsWith('-api-agent'));
      expect(apiAgent).toBeDefined();
      expect(apiAgent!.layer).toBe(2);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('api-agent context is src/', async () => {
    await setup();
    try {
      const apiAgent = Object.values(config.agents).find(a => a.name.endsWith('-api-agent'));
      expect(apiAgent!.context[0]).toBe('src/');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('schema-agent has prisma path', async () => {
    await setup();
    try {
      expect(config.agents['schema-agent']).toBeDefined();
      expect(config.agents['schema-agent'].context).toContain('prisma/schema.prisma');
      expect(config.agents['schema-agent'].layer).toBe(1);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('types-agent depends on schema-agent', async () => {
    await setup();
    try {
      expect(config.agents['types-agent'].dependsOn).toContain('schema-agent');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('api-feature pattern has schema + types before api-agent', async () => {
    await setup();
    try {
      const p = config.patterns['api-feature'];
      expect(p).toBeDefined();
      expect(p.indexOf('schema-agent')).toBeLessThan(p.indexOf(p.find(s => s.endsWith('-api-agent'))!));
      expect(p).toContain('standards-agent');
      expect(p).toContain('supervisor-agent');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('passes health check', async () => {
    await setup();
    try {
      const { issues } = healthCheck(config);
      expect(issues).toEqual([]);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});

// ---------------------------------------------------------------------------
// Project type 3: Next.js app (App Router layout)
// ---------------------------------------------------------------------------

describe('Next.js project (App Router)', () => {
  let root: string;
  let config: AgentsConfig;

  async function setup() {
    root = makeTmpDir();
    writePkg(root, 'package.json', {
      name: 'my-nextjs-app',
      dependencies: { next: '^14.0.0', react: '^18.0.0' },
      devDependencies: { typescript: '^5.0.0' },
    });
    writeFile(root, 'tsconfig.json', '{}');
    writeFile(root, 'app/page.tsx', 'export default function Page() {}');
    writeFile(root, 'app/layout.tsx', 'export default function Layout() {}');
    writeFile(root, 'app/dashboard/page.tsx', 'export default function Dashboard() {}');

    const scan = await detect(root);
    config = generateAgents(scan);
  }

  it('generates a ui-agent', async () => {
    await setup();
    try {
      const uiAgent = Object.values(config.agents).find(a => a.name.endsWith('-ui-agent'));
      expect(uiAgent).toBeDefined();
      expect(uiAgent!.layer).toBe(3);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('ui-agent context is app/ (not src/)', async () => {
    await setup();
    try {
      const uiAgent = Object.values(config.agents).find(a => a.name.endsWith('-ui-agent'));
      expect(uiAgent!.context[0]).toBe('app/');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('ui-feature pattern includes types-agent before ui-agent', async () => {
    await setup();
    try {
      const p = config.patterns['ui-feature'];
      expect(p).toBeDefined();
      const uiAgentName = p.find(s => s.endsWith('-ui-agent'));
      expect(uiAgentName).toBeDefined();
      expect(p.indexOf('types-agent')).toBeLessThan(p.indexOf(uiAgentName!));
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('passes health check', async () => {
    await setup();
    try {
      const { issues } = healthCheck(config);
      expect(issues).toEqual([]);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});

// ---------------------------------------------------------------------------
// Project type 4: Next.js with src/app/ layout
// ---------------------------------------------------------------------------

describe('Next.js project (src/app/ layout)', () => {
  let root: string;
  let config: AgentsConfig;

  async function setup() {
    root = makeTmpDir();
    writePkg(root, 'package.json', {
      name: 'my-nextjs-src',
      dependencies: { next: '^14.0.0', react: '^18.0.0' },
      devDependencies: { typescript: '^5.0.0' },
    });
    writeFile(root, 'tsconfig.json', '{}');
    writeFile(root, 'src/app/page.tsx', 'export default function Page() {}');
    writeFile(root, 'src/app/layout.tsx', 'export default function Layout() {}');

    const scan = await detect(root);
    config = generateAgents(scan);
  }

  it('ui-agent context is src/app/', async () => {
    await setup();
    try {
      const uiAgent = Object.values(config.agents).find(a => a.name.endsWith('-ui-agent'));
      expect(uiAgent!.context[0]).toBe('src/app/');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('passes health check', async () => {
    await setup();
    try {
      const { issues } = healthCheck(config);
      expect(issues).toEqual([]);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});

// ---------------------------------------------------------------------------
// Project type 5: Full-stack monorepo (api + web + db)
// ---------------------------------------------------------------------------

describe('Full-stack monorepo (api + web + db packages)', () => {
  let root: string;
  let config: AgentsConfig;

  async function setup() {
    root = makeTmpDir();
    // Root monorepo package.json with workspaces
    writePkg(root, 'package.json', {
      name: 'my-monorepo',
      workspaces: ['packages/*'],
    });

    // API package
    writePkg(root, 'packages/api/package.json', {
      name: '@my/api',
      dependencies: { express: '^4.18.0' },
      devDependencies: { typescript: '^5.0.0' },
    });
    writeFile(root, 'packages/api/src/index.ts', 'import express from "express";');
    writeFile(root, 'packages/api/src/routes/users.ts', 'export const usersRouter = {};');

    // Web package
    writePkg(root, 'packages/web/package.json', {
      name: '@my/web',
      dependencies: { next: '^14.0.0', react: '^18.0.0' },
      devDependencies: { typescript: '^5.0.0' },
    });
    writeFile(root, 'packages/web/app/page.tsx', 'export default function Page() {}');

    // DB package
    writePkg(root, 'packages/db/package.json', {
      name: '@my/db',
      devDependencies: { prisma: '^5.0.0' },
    });
    writeFile(root, 'packages/db/schema.prisma', 'datasource db { provider = "postgresql" }');
    writeFile(root, 'packages/db/migrations/001_init.sql', 'CREATE TABLE users ();');

    const scan = await detect(root);
    config = generateAgents(scan);
  }

  it('detects monorepo structure', async () => {
    await setup();
    try {
      const scan = await detect(root);
      expect(scan.type).toBe('monorepo');
      expect(scan.packages.length).toBeGreaterThanOrEqual(3);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('generates api-agent with packages/api/src/ context', async () => {
    await setup();
    try {
      const apiAgent = Object.values(config.agents).find(a => a.name.endsWith('-api-agent'));
      expect(apiAgent).toBeDefined();
      expect(apiAgent!.context[0]).toBe('packages/api/src/');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('generates ui-agent with app/ context for Next.js package', async () => {
    await setup();
    try {
      const uiAgent = Object.values(config.agents).find(a => a.name.endsWith('-ui-agent'));
      expect(uiAgent).toBeDefined();
      // Next.js app/ router inside packages/web/
      expect(uiAgent!.context[0]).toBe('packages/web/app/');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('generates db-agent with full package path', async () => {
    await setup();
    try {
      const dbAgent = Object.values(config.agents).find(a => a.name.endsWith('-db-agent'));
      expect(dbAgent).toBeDefined();
      expect(dbAgent!.context[0]).toBe('packages/db/');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('standards-agent gate context is workspace-level (packages/), not individual src/ dirs', async () => {
    await setup();
    try {
      const ctx = config.agents['standards-agent'].context;
      expect(ctx).toContain('packages/');
      expect(ctx).not.toContain('packages/api/src/');
      expect(ctx).not.toContain('packages/web/app/');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('types-agent includes db package path', async () => {
    await setup();
    try {
      const typesCtx = config.agents['types-agent'].context;
      expect(typesCtx).toContain('packages/db/');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('passes health check', async () => {
    await setup();
    try {
      const { issues } = healthCheck(config);
      expect(issues).toEqual([]);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});

// ---------------------------------------------------------------------------
// Project type 6: Python/Django project (non-TypeScript)
// ---------------------------------------------------------------------------

describe('Python/Django project', () => {
  let root: string;
  let config: AgentsConfig;

  async function setup() {
    root = makeTmpDir();
    writeFile(root, 'manage.py', '#!/usr/bin/env python\nimport os');
    writeFile(root, 'requirements.txt', 'Django>=4.2\npsycopg2>=2.9');
    writeFile(root, 'myapp/models.py', 'from django.db import models');
    writeFile(root, 'myapp/views.py', 'from django.views import View');
    writeFile(root, 'myapp/urls.py', 'from django.urls import path');

    const scan = await detect(root);
    config = generateAgents(scan);
  }

  it('generates an agent (no TypeScript — no types-agent)', async () => {
    await setup();
    try {
      expect(config.agents['types-agent']).toBeUndefined();
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('generates gate agents even for non-TypeScript projects', async () => {
    await setup();
    try {
      expect(config.agents['standards-agent']).toBeDefined();
      expect(config.agents['supervisor-agent']).toBeDefined();
      expect(config.agents['docs-agent']).toBeDefined();
      expect(config.agents['healthcheck-agent']).toBeDefined();
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('passes health check', async () => {
    await setup();
    try {
      const { issues } = healthCheck(config);
      expect(issues).toEqual([]);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});

// ---------------------------------------------------------------------------
// Healthcheck integrity — all project types produce valid layer ordering
// ---------------------------------------------------------------------------

describe('Agent layer ordering — all generated configs', () => {
  it('gate agents always have higher layers than work agents', async () => {
    const root = makeTmpDir();
    try {
      writePkg(root, 'package.json', {
        name: 'full-project',
        dependencies: { express: '^4', next: '^14', react: '^18' },
        devDependencies: { typescript: '^5', prisma: '^5' },
      });
      writeFile(root, 'tsconfig.json', '{}');
      writeFile(root, 'src/index.ts', '');
      writeFile(root, 'prisma/schema.prisma', 'datasource db { provider = "postgresql" }');

      const scan = await detect(root);
      const config = generateAgents(scan);

      const { issues } = healthCheck(config);
      expect(issues).toEqual([]);

      // Explicit: supervisor must be above all gate agents; supervisor is the final gate
      const gateAgents = ['standards-agent', 'security-agent', 'supervisor-agent', 'docs-agent', 'healthcheck-agent'];
      const workLayers = Object.values(config.agents)
        .filter(a => !gateAgents.includes(a.name))
        .map(a => a.layer);

      const maxWorkLayer = Math.max(...workLayers);
      // Standards and security (layer 4) must be above all work agents (max layer 3)
      expect(config.agents['standards-agent'].layer).toBeGreaterThan(maxWorkLayer);
      expect(config.agents['security-agent'].layer).toBeGreaterThan(maxWorkLayer);
      // Supervisor (layer 5) must be above standards and security (layer 4)
      expect(config.agents['supervisor-agent'].layer).toBeGreaterThan(config.agents['standards-agent'].layer);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

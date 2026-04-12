import { describe, it, expect } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateAgents } from '../../src/agents/generator.js';
import type { ProjectScan } from '../../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/** Create a temp dir with a given structure and return its path. */
function makeTmpProject(subdirs: string[] = []): string {
  const root = join(tmpdir(), `cp-gen-test-${Date.now()}`);
  mkdirSync(root, { recursive: true });
  for (const d of subdirs) mkdirSync(join(root, d), { recursive: true });
  return root;
}

// ---------------------------------------------------------------------------
// resolveSourcePath — src/ detection
// ---------------------------------------------------------------------------

describe('resolveSourcePath (via agent context)', () => {
  it('uses src/ when it exists', () => {
    const root = makeTmpProject(['src']);
    try {
      const config = generateAgents(makeScan({ root }));
      expect(config.agents['test-project-cli-agent'].context[0]).toBe('src/');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('falls back to app/ when src/ is absent', () => {
    const root = makeTmpProject(['app']);
    try {
      const config = generateAgents(makeScan({ root }));
      expect(config.agents['test-project-cli-agent'].context[0]).toBe('app/');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('falls back to lib/ when src/ and app/ are absent', () => {
    const root = makeTmpProject(['lib']);
    try {
      const config = generateAgents(makeScan({ root }));
      expect(config.agents['test-project-cli-agent'].context[0]).toBe('lib/');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('falls back to package root (./) when no source dir found', () => {
    const root = makeTmpProject(); // no src/, app/, lib/
    try {
      const config = generateAgents(makeScan({ root }));
      expect(config.agents['test-project-cli-agent'].context[0]).toBe('./');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});

// ---------------------------------------------------------------------------
// Framework-aware web context
// ---------------------------------------------------------------------------

describe('framework-aware web context', () => {
  it('uses app/ for Next.js App Router', () => {
    const root = makeTmpProject(['app']);
    try {
      const config = generateAgents(makeScan({
        root,
        framework: 'Next.js',
        packages: [{ name: 'web', path: '.', type: 'web', language: 'TypeScript', entryPoint: null, fileCount: 10 }],
      }));
      expect(config.agents['web-ui-agent'].context[0]).toBe('app/');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('uses src/app/ for Next.js App Router inside src/', () => {
    const root = makeTmpProject(['src/app']);
    try {
      const config = generateAgents(makeScan({
        root,
        framework: 'Next.js',
        packages: [{ name: 'web', path: '.', type: 'web', language: 'TypeScript', entryPoint: null, fileCount: 10 }],
      }));
      expect(config.agents['web-ui-agent'].context[0]).toBe('src/app/');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('falls back to resolveSourcePath for non-Next.js web packages', () => {
    const root = makeTmpProject(['src']);
    try {
      const config = generateAgents(makeScan({
        root,
        framework: 'React',
        packages: [{ name: 'web', path: '.', type: 'web', language: 'TypeScript', entryPoint: null, fileCount: 10 }],
      }));
      expect(config.agents['web-ui-agent'].context[0]).toBe('src/');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});

// ---------------------------------------------------------------------------
// Plugin agent — uses src/ not full dir
// ---------------------------------------------------------------------------

describe('plugin agent context', () => {
  it('uses resolved source dir, not entire package root', () => {
    const root = makeTmpProject(['plugin/src']);
    try {
      const config = generateAgents(makeScan({
        root,
        packages: [{ name: 'my-plugin', path: 'plugin', type: 'plugin', language: 'TypeScript', entryPoint: null, fileCount: 10 }],
      }));
      expect(config.agents['my-plugin-plugin-agent'].context[0]).toBe('plugin/src/');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('falls back to package root when no src/ found', () => {
    const root = makeTmpProject(['plugin']);
    try {
      const config = generateAgents(makeScan({
        root,
        packages: [{ name: 'my-plugin', path: 'plugin', type: 'plugin', language: 'TypeScript', entryPoint: null, fileCount: 10 }],
      }));
      expect(config.agents['my-plugin-plugin-agent'].context[0]).toBe('plugin/');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});

// ---------------------------------------------------------------------------
// Database agent — keeps full package path (schema files are at root)
// ---------------------------------------------------------------------------

describe('database agent context', () => {
  it('uses full package path for schema/migration access', () => {
    const config = generateAgents(makeScan({
      packages: [{ name: 'db', path: 'packages/db', type: 'database', language: 'TypeScript', entryPoint: null, fileCount: 5 }],
    }));
    expect(config.agents['db-db-agent'].context[0]).toBe('packages/db/');
  });
});

// ---------------------------------------------------------------------------
// Gate agents — no magic strings, deduplicated contexts
// ---------------------------------------------------------------------------

describe('gate agent context (no magic strings)', () => {
  it('standards-agent has no magic string context', () => {
    const config = generateAgents(makeScan());
    const ctx = config.agents['standards-agent'].context;
    ctx.forEach(p => {
      expect(p).not.toContain('ALL');
      expect(p).not.toContain('logs');
    });
  });

  it('supervisor-agent has no magic string context', () => {
    const config = generateAgents(makeScan());
    const ctx = config.agents['supervisor-agent'].context;
    ctx.forEach(p => {
      expect(p).not.toContain('ALL');
      expect(p).not.toContain('logs');
    });
  });

  it('standards-agent dependsOn lists real agent names', () => {
    const config = generateAgents(makeScan());
    config.agents['standards-agent'].dependsOn.forEach(d => {
      expect(d).not.toContain('ALL');
      expect(config.agents[d]).toBeDefined();
    });
  });

  it('standards-agent depends on every layer-1..3 work agent', () => {
    const config = generateAgents(makeScan());
    const deps = config.agents['standards-agent'].dependsOn;
    expect(deps).toContain('test-project-cli-agent'); // layer 2
    expect(deps).toContain('types-agent');             // layer 1
  });
});

describe('gate agent context — monorepo deduplication', () => {
  it('uses workspace-level dirs for monorepo, not all src/ subdirs', () => {
    const root = makeTmpProject([
      'packages/api/src', 'packages/web/src', 'apps/cli/src',
    ]);
    try {
      const config = generateAgents(makeScan({
        root,
        type: 'monorepo',
        packages: [
          { name: 'api', path: 'packages/api', type: 'api', language: 'TypeScript', entryPoint: null, fileCount: 20 },
          { name: 'web', path: 'packages/web', type: 'web', language: 'TypeScript', entryPoint: null, fileCount: 15 },
          { name: 'cli', path: 'apps/cli', type: 'cli', language: 'TypeScript', entryPoint: null, fileCount: 8 },
        ],
      }));
      const ctx = config.agents['standards-agent'].context;
      // Should have workspace dirs, not individual src/ subdirs
      expect(ctx).toContain('packages/');
      expect(ctx).toContain('apps/');
      expect(ctx).not.toContain('packages/api/src/');
      expect(ctx).not.toContain('packages/web/src/');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('single-package gate context uses resolved work-agent paths', () => {
    const root = makeTmpProject(['src']);
    try {
      const config = generateAgents(makeScan({ root }));
      const ctx = config.agents['standards-agent'].context;
      expect(ctx.length).toBeGreaterThan(0);
      // Should not contain workspace-level parent (it's single-package)
      expect(ctx).not.toContain('packages/');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});

// ---------------------------------------------------------------------------
// Types-agent context
// ---------------------------------------------------------------------------

describe('types-agent context', () => {
  it('uses schema path when database detected', () => {
    const config = generateAgents(makeScan({
      database: { orm: 'Prisma', type: 'PostgreSQL', schemaPath: 'prisma/schema.prisma' },
    }));
    expect(config.agents['types-agent'].context).toContain('prisma/schema.prisma');
  });

  it('uses resolved package src paths (not hardcoded src/) when no database', () => {
    const root = makeTmpProject(['src']);
    try {
      const config = generateAgents(makeScan({ root }));
      // Should use resolved src/ — not a hardcoded generic fallback
      expect(config.agents['types-agent'].context[0]).toBe('src/');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('collects all db-package paths for monorepo with multiple databases', () => {
    const config = generateAgents(makeScan({
      type: 'monorepo',
      packages: [
        { name: 'api', path: 'packages/api', type: 'api', language: 'TypeScript', entryPoint: null, fileCount: 20 },
        { name: 'db-users', path: 'packages/db-users', type: 'database', language: 'TypeScript', entryPoint: null, fileCount: 5 },
        { name: 'db-billing', path: 'packages/db-billing', type: 'database', language: 'TypeScript', entryPoint: null, fileCount: 5 },
      ],
    }));
    const ctx = config.agents['types-agent'].context;
    expect(ctx).toContain('packages/db-users/');
    expect(ctx).toContain('packages/db-billing/');
  });

  it('types-agent depends on schema-agent when database detected', () => {
    const config = generateAgents(makeScan({
      database: { orm: 'Prisma', type: 'PostgreSQL', schemaPath: 'prisma/schema.prisma' },
    }));
    expect(config.agents['types-agent'].dependsOn).toContain('schema-agent');
  });

  it('types-agent depends on db-package agents in monorepo', () => {
    const config = generateAgents(makeScan({
      type: 'monorepo',
      packages: [
        { name: 'db-users', path: 'packages/db-users', type: 'database', language: 'TypeScript', entryPoint: null, fileCount: 5 },
        { name: 'api', path: 'packages/api', type: 'api', language: 'TypeScript', entryPoint: null, fileCount: 20 },
      ],
    }));
    expect(config.agents['types-agent'].dependsOn).toContain('db-users-db-agent');
  });
});

// ---------------------------------------------------------------------------
// Docs-agent fallback
// ---------------------------------------------------------------------------

describe('docs-agent fallback', () => {
  it('falls back to "." not a non-existent README.md', () => {
    // /tmp/test has no docs/ or README.md
    const config = generateAgents(makeScan({ root: '/tmp/test' }));
    expect(config.agents['docs-agent'].context).toContain('.');
    expect(config.agents['docs-agent'].context).not.toContain('README.md');
  });
});

// ---------------------------------------------------------------------------
// Layer ordering
// ---------------------------------------------------------------------------

describe('layer ordering', () => {
  it('healthcheck-agent is layer 0', () => {
    expect(generateAgents(makeScan()).agents['healthcheck-agent'].layer).toBe(0);
  });

  it('foundation agents are layer 1', () => {
    const config = generateAgents(makeScan({
      database: { orm: 'Prisma', type: 'PostgreSQL', schemaPath: 'prisma/schema.prisma' },
    }));
    expect(config.agents['schema-agent'].layer).toBe(1);
    expect(config.agents['types-agent'].layer).toBe(1);
  });

  it('api agent is layer 2', () => {
    const config = generateAgents(makeScan({
      packages: [{ name: 'api', path: '.', type: 'api', language: 'TypeScript', entryPoint: null, fileCount: 20 }],
    }));
    expect(config.agents['api-api-agent'].layer).toBe(2);
  });

  it('web agent is layer 3', () => {
    const config = generateAgents(makeScan({
      packages: [{ name: 'web', path: '.', type: 'web', language: 'TypeScript', entryPoint: null, fileCount: 15 }],
    }));
    expect(config.agents['web-ui-agent'].layer).toBe(3);
  });

  it('gate agents are layers 4 and 5', () => {
    const config = generateAgents(makeScan());
    expect(config.agents['standards-agent'].layer).toBe(4);
    expect(config.agents['supervisor-agent'].layer).toBe(5);
  });

  it('docs-agent is layer 6', () => {
    expect(generateAgents(makeScan()).agents['docs-agent'].layer).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// Pattern generation
// ---------------------------------------------------------------------------

describe('pattern generation', () => {
  it('full-feature pattern always exists', () => {
    const config = generateAgents(makeScan());
    expect(config.patterns['full-feature']).toBeDefined();
    expect(config.patterns['full-feature'].length).toBeGreaterThan(0);
  });

  it('ui-feature pattern includes foundation agents', () => {
    const config = generateAgents(makeScan({
      packages: [{ name: 'web', path: '.', type: 'web', language: 'TypeScript', entryPoint: null, fileCount: 15 }],
      database: { orm: 'Prisma', type: 'PostgreSQL', schemaPath: 'prisma/schema.prisma' },
    }));
    const p = config.patterns['ui-feature'];
    expect(p).toBeDefined();
    expect(p).toContain('schema-agent');
    expect(p).toContain('types-agent');
  });

  it('new-plugin pattern includes foundation before plugin', () => {
    const config = generateAgents(makeScan({
      packages: [{ name: 'my-plugin', path: 'plugin', type: 'plugin', language: 'TypeScript', entryPoint: null, fileCount: 10 }],
      database: { orm: 'Prisma', type: 'PostgreSQL', schemaPath: 'prisma/schema.prisma' },
    }));
    const p = config.patterns['new-plugin'];
    expect(p).toBeDefined();
    expect(p.indexOf('schema-agent')).toBeLessThan(p.indexOf('my-plugin-plugin-agent'));
    expect(p).toContain('docs-agent');
  });

  it('cli-command pattern is isolated (no foundation)', () => {
    const config = generateAgents(makeScan());
    const p = config.patterns['cli-command'];
    expect(p).toBeDefined();
    expect(p).not.toContain('types-agent');
    expect(p).not.toContain('schema-agent');
  });

  it('api-feature pattern includes foundation + gates', () => {
    const config = generateAgents(makeScan({
      packages: [{ name: 'api', path: '.', type: 'api', language: 'TypeScript', entryPoint: null, fileCount: 20 }],
      database: { orm: 'Prisma', type: 'PostgreSQL', schemaPath: 'prisma/schema.prisma' },
    }));
    const p = config.patterns['api-feature'];
    expect(p).toContain('schema-agent');
    expect(p).toContain('types-agent');
    expect(p).toContain('standards-agent');
    expect(p).toContain('supervisor-agent');
  });
});

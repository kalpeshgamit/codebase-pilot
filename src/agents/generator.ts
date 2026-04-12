import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { ProjectScan, AgentDefinition, AgentsConfig } from '../types.js';
import { toPosix } from '../utils.js';

export function generateAgents(scan: ProjectScan): AgentsConfig {
  const agents: Record<string, AgentDefinition> = {};
  const workAgents: string[] = [];

  // Map packages to agents — pass root + framework so context paths can be tight
  for (const pkg of scan.packages) {
    const agent = mapPackageToAgent(
      pkg.name, pkg.path, pkg.type, pkg.fileCount,
      scan.root, scan.framework,
    );
    if (agent) {
      agents[agent.name] = agent;
      workAgents.push(agent.name);
    }
  }

  // Add schema-agent if database detected
  if (scan.database?.schemaPath) {
    agents['schema-agent'] = {
      name: 'schema-agent',
      model: 'haiku',
      context: [scan.database.schemaPath],
      task: `${scan.database.orm} schema and migration changes only`,
      layer: 1,
      dependsOn: [],
    };
    workAgents.push('schema-agent');
  }

  // Add types-agent if TypeScript project
  if (scan.languages.some((l) => l.name === 'TypeScript')) {
    // Collect ALL schema/database paths (monorepo may have several)
    const schemaContexts: string[] = [];
    if (scan.database?.schemaPath) {
      schemaContexts.push(scan.database.schemaPath);
    }
    for (const pkg of scan.packages) {
      if (pkg.type === 'database') {
        const dbPath = toPosix(pkg.path + '/');
        if (!schemaContexts.includes(dbPath)) schemaContexts.push(dbPath);
      }
    }

    // Fallback: union of resolved source paths across all packages (not a hardcoded 'src/')
    let typesContext: string[];
    if (schemaContexts.length > 0) {
      typesContext = schemaContexts;
    } else {
      const pkgSrcPaths = scan.packages
        .map(p => resolveSourcePath(scan.root, p.path))
        .filter((v, i, a) => a.indexOf(v) === i); // dedupe
      typesContext = pkgSrcPaths.length > 0 ? pkgSrcPaths : ['src/'];
    }

    const typesDepends: string[] = [];
    if (scan.database?.schemaPath) typesDepends.push('schema-agent');
    for (const pkg of scan.packages) {
      if (pkg.type === 'database') {
        const dbAgent = `${pkg.name}-db-agent`;
        if (!typesDepends.includes(dbAgent)) typesDepends.push(dbAgent);
      }
    }

    agents['types-agent'] = {
      name: 'types-agent',
      model: 'haiku',
      context: typesContext,
      task: 'Extract TypeScript interfaces — pure type extraction, no logic',
      layer: 1,
      dependsOn: typesDepends,
    };
    workAgents.push('types-agent');
  }

  // Wire ui-agents to depend on api-agents — UI needs API types+routes to exist first
  const apiAgentNames = workAgents.filter(n => n.endsWith('-api-agent'));
  if (apiAgentNames.length > 0) {
    for (const uiName of workAgents.filter(n => n.endsWith('-ui-agent'))) {
      for (const apiName of apiAgentNames) {
        if (!agents[uiName].dependsOn.includes(apiName)) {
          agents[uiName].dependsOn.push(apiName);
        }
      }
    }
  }

  // Wire plugin-agents to types-agent — plugins use shared types
  if (agents['types-agent']) {
    for (const pluginName of workAgents.filter(n => n.endsWith('-plugin-agent'))) {
      if (!agents[pluginName].dependsOn.includes('types-agent')) {
        agents[pluginName].dependsOn.push('types-agent');
      }
    }
  }

  // Add test-agent if test runner detected — owns test files, coverage, test utilities
  if (scan.testRunner) {
    const testCtx = resolveTestContext(scan.root);
    const testDepends: string[] = [];
    if (agents['types-agent']) testDepends.push('types-agent');
    // Run after all layer-2 implementation agents complete
    workAgents
      .filter(n => agents[n] !== undefined && (agents[n] as AgentDefinition).layer === 2)
      .forEach(n => testDepends.push(n));

    agents['test-agent'] = {
      name: 'test-agent',
      model: 'haiku',
      context: testCtx,
      task: `Test suite — ${scan.testRunner} tests, coverage validation, test utilities`,
      layer: 3,
      dependsOn: testDepends,
    };
    workAgents.push('test-agent');
  }

  // Gate agents: use workspace-level paths (not full union of every src/ subdir)
  // Monorepo → top-level workspace dirs: ['packages/', 'apps/']
  // Single-package → the work agents' own resolved contexts
  const gateContext = buildGateContext(workAgents, agents, scan);

  // Pre-gate agents = all layer-1..3 work agents
  const preGateAgents = workAgents.filter(
    n => agents[n] !== undefined && (agents[n] as AgentDefinition).layer <= 3,
  );

  agents['standards-agent'] = {
    name: 'standards-agent',
    model: 'opus',
    context: gateContext,
    task: 'Code quality gate — SOLID principles, file structure, naming conventions, project rules',
    layer: 4,
    dependsOn: preGateAgents,
  };

  // Security gate — runs in parallel with standards at layer 4
  agents['security-agent'] = {
    name: 'security-agent',
    model: 'haiku',
    context: gateContext,
    task: 'Security gate — secret scanning, dependency vulnerabilities, OWASP patterns',
    layer: 4,
    dependsOn: preGateAgents,
  };

  // Supervisor gates after both standards + security pass
  agents['supervisor-agent'] = {
    name: 'supervisor-agent',
    model: 'opus',
    context: gateContext,
    task: 'Behavior audit gate — verifies each agent stayed within its context/write boundaries',
    layer: 5,
    dependsOn: ['standards-agent', 'security-agent'],
  };

  // Docs-agent: tight context — actual docs dir, README, or sub-README
  const docsDir = ['docs/', 'doc/', 'documentation/'].find(d => existsSync(join(scan.root, d)));
  let docsContext: string[];
  if (docsDir) {
    docsContext = [docsDir];
  } else if (existsSync(join(scan.root, 'README.md'))) {
    docsContext = ['README.md'];
  } else {
    let subReadme: string | undefined;
    try {
      subReadme = readdirSync(scan.root)
        .filter(e => !e.startsWith('.') && e !== 'node_modules' && e !== 'dist')
        .find(e => existsSync(join(scan.root, e, 'README.md')));
    } catch { /* root may not exist in tests */ }
    docsContext = subReadme ? [`${subReadme}/README.md`] : ['.'];
  }
  agents['docs-agent'] = {
    name: 'docs-agent',
    model: 'haiku',
    context: docsContext,
    task: 'Documentation updates — guides, API docs, README',
    layer: 6,
    dependsOn: ['supervisor-agent'],
  };

  agents['healthcheck-agent'] = {
    name: 'healthcheck-agent',
    model: 'haiku',
    context: ['.codebase-pilot/agents.json'],
    task: 'Pre-flight validation — verify context paths, dependencies, layer ordering. Read-only.',
    layer: 0,
    dependsOn: [],
  };

  const patterns = generatePatterns(agents, workAgents, scan);

  return {
    version: '1.0.0',
    project: scan.name,
    agents,
    patterns,
  };
}

// ---------------------------------------------------------------------------
// Context path resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the tightest source directory for a package.
 * Checks: src/ → app/ → lib/ → package root.
 * Never returns a path that doesn't exist on disk.
 */
function resolveSourcePath(root: string, pkgPath: string): string {
  const abs = pkgPath === '.' ? root : join(root, pkgPath);
  const prefix = pkgPath === '.' ? '' : pkgPath + '/';

  for (const dir of ['src', 'app', 'lib', 'source']) {
    if (existsSync(join(abs, dir))) return toPosix(`${prefix}${dir}/`);
  }
  // Fallback: package root itself (always exists)
  return toPosix(pkgPath === '.' ? './' : `${pkgPath}/`);
}

/**
 * Framework-aware context for web packages.
 * Next.js  → app/ router (preferred) or pages/ + components/
 * Everything else → resolveSourcePath()
 */
function resolveWebContext(root: string, pkgPath: string, framework: string | null): string[] {
  const abs = pkgPath === '.' ? root : join(root, pkgPath);
  const prefix = pkgPath === '.' ? '' : pkgPath + '/';
  const f = framework?.toLowerCase() ?? '';

  if (f.includes('next')) {
    // Next.js App Router (preferred, Next 13+)
    for (const candidate of ['src/app', 'app']) {
      if (existsSync(join(abs, candidate))) {
        return [toPosix(`${prefix}${candidate}/`)];
      }
    }
    // Next.js Pages Router
    const pages = ['src/pages', 'pages'].find(d => existsSync(join(abs, d)));
    const components = ['src/components', 'components'].find(d => existsSync(join(abs, d)));
    if (pages || components) {
      return [pages, components]
        .filter(Boolean)
        .map(d => toPosix(`${prefix}${d}/`));
    }
  }

  if (f.includes('nuxt')) {
    for (const candidate of ['pages', 'components', 'composables']) {
      if (existsSync(join(abs, candidate))) return [toPosix(`${prefix}${candidate}/`)];
    }
  }

  return [resolveSourcePath(root, pkgPath)];
}

/**
 * Resolve the test context for a project.
 * Checks: tests/ → test/ → spec/ → __tests__/ → colocated in src/
 */
function resolveTestContext(root: string): string[] {
  const testDirs = ['tests', 'test', 'spec', '__tests__']
    .filter(d => existsSync(join(root, d)));
  if (testDirs.length > 0) return testDirs.map(d => toPosix(d + '/'));
  // Test files colocated in src/
  if (existsSync(join(root, 'src'))) return ['src/'];
  return ['./'];
}

/**
 * Build context for gate agents (standards + supervisor).
 *
 * Single-package → reuse work-agent contexts directly (already tight).
 * Monorepo       → deduplicate to top-level workspace dirs (packages/, apps/, etc.)
 *                  instead of repeating every {pkg}/src/ subdir.
 */
function buildGateContext(
  workAgents: string[],
  agents: Record<string, AgentDefinition>,
  scan: ProjectScan,
): string[] {
  const allCtx = [...new Set(workAgents.flatMap(n => agents[n]?.context ?? []))];

  if (scan.type === 'single-package' || allCtx.length === 0) {
    return allCtx.length > 0 ? allCtx : ['src/'];
  }

  // Monorepo: lift each path to its workspace-level parent
  // 'packages/api/src/' → 'packages/'
  // 'apps/web/src/'     → 'apps/'
  // 'prisma/schema.prisma' → kept as-is (file reference)
  const topDirs = new Set<string>();
  for (const p of allCtx) {
    const parts = p.replace(/\/$/, '').split('/');
    if (parts.length >= 2) {
      topDirs.add(parts[0] + '/');
    } else {
      topDirs.add(p); // schema files, root paths — keep as-is
    }
  }
  return [...topDirs];
}

// ---------------------------------------------------------------------------
// Package → agent mapping
// ---------------------------------------------------------------------------

function mapPackageToAgent(
  name: string,
  path: string,
  type: string,
  fileCount: number,
  root: string,
  framework: string | null,
): AgentDefinition | null {
  switch (type) {
    case 'api': {
      const srcPath = resolveSourcePath(root, path);
      return {
        name: `${name}-api-agent`,
        model: 'sonnet',
        context: [srcPath],
        task: `API routes and controllers in ${path} — receives type snippets from types-agent`,
        layer: 2,
        dependsOn: ['types-agent'],
      };
    }
    case 'web': {
      const webCtx = resolveWebContext(root, path, framework);
      return {
        name: `${name}-ui-agent`,
        model: 'haiku',
        context: webCtx,
        task: `Frontend components and pages in ${path} — receives API types and routes only`,
        layer: 3,
        dependsOn: ['types-agent'],
      };
    }
    case 'cli': {
      const srcPath = resolveSourcePath(root, path);
      return {
        name: `${name}-cli-agent`,
        model: 'haiku',
        context: [srcPath],
        task: `CLI commands and utils in ${path} — fully isolated`,
        layer: 2,
        dependsOn: [],
      };
    }
    case 'lib': {
      const srcPath = resolveSourcePath(root, path);
      return {
        name: `${name}-lib-agent`,
        model: 'haiku',
        context: [srcPath],
        task: `Shared library code in ${path}`,
        layer: 1,
        dependsOn: [],
      };
    }
    case 'plugin': {
      // Plugins are code — use resolved source dir (not full package root)
      // dependsOn wired to types-agent post-generation
      const srcPath = resolveSourcePath(root, path);
      return {
        name: `${name}-plugin-agent`,
        model: 'sonnet',
        context: [srcPath],
        task: `Plugin scaffold and tools in ${path}`,
        layer: 2,
        dependsOn: [],
      };
    }
    case 'database': {
      // Database packages store schema/migrations at root — keep full package path
      return {
        name: `${name}-db-agent`,
        model: 'haiku',
        context: [toPosix(path === '.' ? './' : path + '/')],
        task: `Database schema and migrations in ${path}`,
        layer: 1,
        dependsOn: [],
      };
    }
    case 'registry': {
      // A registry is a collection of independent sub-packages (e.g. a plugins/ directory).
      // Context points to the registry root — .claudeignore trims templates/specs/SKILL.md.
      // Task description guides agents to use targeted dispatch per sub-package.
      return {
        name: `${name}-registry-agent`,
        model: 'haiku',
        context: [toPosix(path === '.' ? './' : path + '/')],
        task: `Sub-package registry in ${path} — ${fileCount} files across sub-packages. Work on individual sub-packages via targeted dispatch.`,
        layer: 2,
        dependsOn: [],
      };
    }
    default:
      if (fileCount > 0) {
        const srcPath = resolveSourcePath(root, path);
        return {
          name: `${name}-agent`,
          model: 'haiku',
          context: [srcPath],
          task: `Code in ${path}`,
          layer: 2,
          dependsOn: [],
        };
      }
      return null;
  }
}

// ---------------------------------------------------------------------------
// Pattern generation
// ---------------------------------------------------------------------------

function generatePatterns(
  agents: Record<string, AgentDefinition>,
  workAgents: string[],
  _scan: ProjectScan,
): Record<string, string[]> {
  const patterns: Record<string, string[]> = {};

  // Gates in layer order: quality (4), security (4), supervisor (5)
  const gates = ['standards-agent', 'security-agent', 'supervisor-agent'];
  const apiAgents = workAgents.filter((a) => a.includes('api'));
  const uiAgents = workAgents.filter((a) => a.includes('ui'));
  const cliAgents = workAgents.filter((a) => a.includes('cli'));
  const pluginAgents = workAgents.filter((a) => a.includes('plugin'));
  const testAgents = workAgents.filter((a) => a === 'test-agent');
  const foundation = workAgents.filter((a) =>
    agents[a]?.layer === 1 && !a.includes('lib'),
  );

  if (apiAgents.length > 0) {
    patterns['api-feature'] = [...foundation, ...apiAgents, ...testAgents, ...gates];
  }

  if (uiAgents.length > 0) {
    // Include foundation so ui-agent has type context
    patterns['ui-feature'] = [...foundation, ...uiAgents, ...testAgents, ...gates];
  }

  if (apiAgents.length > 0 && uiAgents.length > 0) {
    patterns['new-feature'] = [...foundation, ...apiAgents, ...uiAgents, ...testAgents, ...gates];
  }

  if (cliAgents.length > 0) {
    // CLI is isolated — no foundation, but security still gates
    patterns['cli-command'] = [...cliAgents, ...testAgents, ...gates];
  }

  if (pluginAgents.length > 0) {
    // Plugins need foundation (shared types/schema) before they execute
    patterns['new-plugin'] = [...foundation, ...pluginAgents, ...testAgents, ...gates, 'docs-agent'];
  }

  patterns['full-feature'] = [...workAgents, ...gates, 'docs-agent'];

  return patterns;
}

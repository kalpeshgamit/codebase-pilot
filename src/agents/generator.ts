import type { ProjectScan, AgentDefinition, AgentsConfig } from '../types.js';

export function generateAgents(scan: ProjectScan): AgentsConfig {
  const agents: Record<string, AgentDefinition> = {};
  const workAgents: string[] = [];

  // Map packages to agents
  for (const pkg of scan.packages) {
    const agent = mapPackageToAgent(pkg.name, pkg.path, pkg.type, pkg.fileCount);
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
    agents['types-agent'] = {
      name: 'types-agent',
      model: 'haiku',
      context: scan.database?.schemaPath ? [scan.database.schemaPath] : ['src/types/'],
      task: 'Extract TypeScript interfaces — pure type extraction, no logic',
      layer: 1,
      dependsOn: scan.database?.schemaPath ? ['schema-agent'] : [],
    };
    workAgents.push('types-agent');
  }

  // Always add review gates
  agents['standards-agent'] = {
    name: 'standards-agent',
    model: 'opus',
    context: ['ALL agent outputs'],
    task: 'Code quality gate — SOLID principles, file structure, naming conventions, project rules',
    layer: 4,
    dependsOn: ['ALL previous layers'],
  };

  agents['supervisor-agent'] = {
    name: 'supervisor-agent',
    model: 'opus',
    context: ['Agent execution logs'],
    task: 'Behavior audit gate — verifies each agent stayed within its context/write boundaries',
    layer: 5,
    dependsOn: ['standards-agent'],
  };

  agents['docs-agent'] = {
    name: 'docs-agent',
    model: 'haiku',
    context: ['docs/'],
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

  // Generate dispatch patterns
  const patterns = generatePatterns(agents, workAgents, scan);

  return {
    version: '1.0.0',
    project: scan.name,
    agents,
    patterns,
  };
}

function mapPackageToAgent(
  name: string,
  path: string,
  type: string,
  fileCount: number,
): AgentDefinition | null {
  const srcPath = `${path}/src/`;

  switch (type) {
    case 'api':
      return {
        name: `${name}-api-agent`,
        model: 'sonnet',
        context: [srcPath],
        task: `API routes and controllers in ${path} — receives type snippets from types-agent`,
        layer: 2,
        dependsOn: ['types-agent'],
      };
    case 'web':
      return {
        name: `${name}-ui-agent`,
        model: 'haiku',
        context: [srcPath],
        task: `Frontend components and pages in ${path} — receives API types and routes only`,
        layer: 3,
        dependsOn: ['types-agent'],
      };
    case 'cli':
      return {
        name: `${name}-cli-agent`,
        model: 'haiku',
        context: [srcPath],
        task: `CLI commands and utils in ${path} — fully isolated`,
        layer: 2,
        dependsOn: [],
      };
    case 'lib':
      return {
        name: `${name}-lib-agent`,
        model: 'haiku',
        context: [srcPath],
        task: `Shared library code in ${path}`,
        layer: 1,
        dependsOn: [],
      };
    case 'plugin':
      return {
        name: `${name}-plugin-agent`,
        model: 'sonnet',
        context: [path + '/'],
        task: `Plugin scaffold and tools in ${path}`,
        layer: 2,
        dependsOn: [],
      };
    case 'database':
      return {
        name: `${name}-db-agent`,
        model: 'haiku',
        context: [path + '/'],
        task: `Database schema and migrations in ${path}`,
        layer: 1,
        dependsOn: [],
      };
    default:
      if (fileCount > 0) {
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

function generatePatterns(
  agents: Record<string, AgentDefinition>,
  workAgents: string[],
  scan: ProjectScan,
): Record<string, string[]> {
  const patterns: Record<string, string[]> = {};

  const gates = ['standards-agent', 'supervisor-agent'];
  const apiAgents = workAgents.filter((a) => a.includes('api'));
  const uiAgents = workAgents.filter((a) => a.includes('ui'));
  const cliAgents = workAgents.filter((a) => a.includes('cli'));
  const pluginAgents = workAgents.filter((a) => a.includes('plugin'));
  const foundation = workAgents.filter((a) =>
    agents[a]?.layer === 1 && !a.includes('lib'),
  );

  if (apiAgents.length > 0) {
    patterns['api-feature'] = [...foundation, ...apiAgents, ...gates];
  }

  if (uiAgents.length > 0) {
    patterns['ui-feature'] = [...uiAgents, ...gates];
  }

  if (apiAgents.length > 0 && uiAgents.length > 0) {
    patterns['new-feature'] = [...foundation, ...apiAgents, ...uiAgents, ...gates];
  }

  if (cliAgents.length > 0) {
    patterns['cli-command'] = [...cliAgents, ...gates];
  }

  if (pluginAgents.length > 0) {
    patterns['new-plugin'] = [...pluginAgents, ...gates, 'docs-agent'];
  }

  patterns['full-feature'] = [...workAgents, ...gates, 'docs-agent'];

  return patterns;
}

import { resolve } from 'node:path';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { AgentsConfig, HealthCheckResult } from '../types.js';

interface HealthOptions {
  dir: string;
  verbose?: boolean;
}

const MAGIC_CONTEXT = ['ALL agent outputs', 'Agent execution logs', 'ALL previous layers'];
const MAGIC_DEP = ['ALL previous layers'];

export async function healthCommand(options: HealthOptions): Promise<void> {
  const root = resolve(options.dir);
  const verbose = options.verbose || false;

  console.log('');
  console.log('  codebase-pilot Health Check');
  console.log('  ───────────────────────────');
  console.log('');

  const agentsPath = join(root, '.codebase-pilot', 'agents.json');
  if (!existsSync(agentsPath)) {
    console.log('  ✗ No agents.json found. Run "codebase-pilot init" first.');
    console.log('');
    process.exitCode = 1;
    return;
  }

  let config: AgentsConfig;
  try {
    config = JSON.parse(readFileSync(agentsPath, 'utf8'));
  } catch {
    console.log('  ✗ Invalid agents.json. Run "codebase-pilot init" to regenerate.');
    console.log('');
    process.exitCode = 1;
    return;
  }

  const results: HealthCheckResult[] = [];
  const agents = Object.values(config.agents);
  const agentNames = Object.keys(config.agents);

  // Check 1: Context paths — must exist on disk, must not be magic strings
  for (const agent of agents) {
    for (const ctxPath of agent.context) {
      // Flag magic strings immediately
      if (MAGIC_CONTEXT.includes(ctxPath)) {
        results.push({
          agent: agent.name,
          check: 'context_path',
          status: 'fail',
          detail: `"${ctxPath}" is a magic string — not a real path`,
          fix: `Run "codebase-pilot scan" to regenerate agents.json with real paths`,
        });
        continue;
      }

      const fullPath = join(root, ctxPath);
      const exists = existsSync(fullPath);
      let fileCount = 0;

      if (exists) {
        try {
          const stat = statSync(fullPath);
          if (stat.isDirectory()) {
            fileCount = countFiles(fullPath);
          } else {
            fileCount = 1;
          }
        } catch {}
      }

      results.push({
        agent: agent.name,
        check: 'context_path',
        status: exists ? 'pass' : 'fail',
        detail: exists
          ? `${ctxPath} (${fileCount} files)`
          : `${ctxPath} NOT FOUND`,
        fix: exists ? undefined : `Update context path in agents.json or run "codebase-pilot fix"`,
      });
    }
  }

  // Check 2: Dependency chain — all dependsOn must reference real agents, no magic strings
  for (const agent of agents) {
    for (const dep of agent.dependsOn) {
      if (MAGIC_DEP.includes(dep)) {
        results.push({
          agent: agent.name,
          check: 'dependency',
          status: 'fail',
          detail: `Depends on magic string "${dep}" — not a real agent`,
          fix: `Run "codebase-pilot scan" to regenerate agents.json`,
        });
        continue;
      }
      if (!agentNames.includes(dep)) {
        results.push({
          agent: agent.name,
          check: 'dependency',
          status: 'fail',
          detail: `Depends on "${dep}" which does not exist`,
          fix: `Remove or update dependency in agents.json`,
        });
      }
    }
  }

  // Check 3: Cycle detection — DFS traversal
  const cycleIssues = detectCycles(config.agents);
  for (const cycle of cycleIssues) {
    results.push({
      agent: cycle.split(' → ')[0],
      check: 'dependency',
      status: 'fail',
      detail: `Cycle detected: ${cycle}`,
      fix: `Remove circular dependency in agents.json`,
    });
  }

  // Check 4: Pattern coverage — every work agent (layer 1–3) must appear in at least one pattern
  const patternAgentSet = new Set(Object.values(config.patterns).flat());
  const infraAgents = new Set([
    'standards-agent', 'security-agent', 'supervisor-agent', 'docs-agent', 'healthcheck-agent',
  ]);
  for (const agent of agents) {
    if (infraAgents.has(agent.name)) continue; // gate/infra agents are always in full-feature
    if (!patternAgentSet.has(agent.name)) {
      results.push({
        agent: agent.name,
        check: 'pattern_coverage',
        status: 'fail',
        detail: `Agent "${agent.name}" is not referenced in any pattern — it cannot be orchestrated`,
        fix: `Run "codebase-pilot scan" to regenerate agents.json with updated patterns`,
      });
    }
  }

  // Check 5: Layer ordering — deps must not be at a higher layer than the agent
  for (const agent of agents) {
    for (const dep of agent.dependsOn) {
      if (MAGIC_DEP.includes(dep)) continue; // already caught above
      const depAgent = config.agents[dep];
      if (depAgent && depAgent.layer > agent.layer) {
        results.push({
          agent: agent.name,
          check: 'layer_ordering',
          status: 'fail',
          detail: `L${agent.layer} depends on "${dep}" at L${depAgent.layer} — dep is in a higher layer`,
          fix: `Fix layer assignment — dependencies must not be in higher layers`,
        });
      }
    }
  }

  // Print results
  const contextPasses = results.filter((r) => r.check === 'context_path' && r.status === 'pass').length;
  const contextTotal = results.filter((r) => r.check === 'context_path').length;
  const failures = results.filter((r) => r.status === 'fail');
  const depFailures = failures.filter((r) => r.check === 'dependency');
  const layerFailures = failures.filter((r) => r.check === 'layer_ordering');
  const contextFailures = failures.filter((r) => r.check === 'context_path');
  const patternFailures = failures.filter((r) => r.check === 'pattern_coverage');

  console.log(`  AGENTS (${agentNames.length})                        ✓ DEFINED`);

  console.log(`  CONTEXT PATHS (${contextPasses}/${contextTotal})              ${contextFailures.length === 0 ? '✓ ALL VALID' : '✗ ' + contextFailures.length + ' STALE'}`);
  if (verbose || contextFailures.length > 0) {
    for (const r of results.filter((r) => r.check === 'context_path')) {
      console.log(`    ${r.agent.padEnd(22)} ${r.status === 'pass' ? '✓' : '✗'} ${r.detail}`);
    }
  }

  console.log(`  DEPENDENCY CHAIN                  ${depFailures.length === 0 ? '✓ NO CYCLES' : '✗ ' + depFailures.length + ' ISSUES'}`);
  console.log(`  LAYER ORDERING                    ${layerFailures.length === 0 ? '✓ VALID' : '✗ ' + layerFailures.length + ' ISSUES'}`);
  console.log(`  PATTERN COVERAGE                  ${patternFailures.length === 0 ? '✓ ALL ORCHESTRATED' : '✗ ' + patternFailures.length + ' ORPHANED'}`);

  console.log('');

  if (failures.length > 0) {
    console.log(`  ISSUES: ${failures.length}`);
    for (let i = 0; i < failures.length; i++) {
      const f = failures[i];
      console.log(`    #${i + 1} [HIGH] ${f.agent}: ${f.detail}`);
      if (f.fix) console.log(`       Fix: ${f.fix}`);
    }
    console.log('');
    console.log('  STATUS: UNHEALTHY ✗');
    process.exitCode = 1;
  } else {
    console.log('  ISSUES: 0');
    console.log('  STATUS: HEALTHY ✓');
  }
  console.log('');
}

/**
 * Detect cycles using DFS. Returns an array of cycle descriptions like "a → b → a".
 */
function detectCycles(agents: AgentsConfig['agents']): string[] {
  const cycles: string[] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(name: string, path: string[]): void {
    if (inStack.has(name)) {
      const cycleStart = path.indexOf(name);
      cycles.push([...path.slice(cycleStart), name].join(' → '));
      return;
    }
    if (visited.has(name)) return;

    visited.add(name);
    inStack.add(name);

    const agent = agents[name];
    if (agent) {
      for (const dep of agent.dependsOn) {
        if (agents[dep]) dfs(dep, [...path, name]);
      }
    }

    inStack.delete(name);
  }

  for (const name of Object.keys(agents)) {
    if (!visited.has(name)) dfs(name, []);
  }

  return cycles;
}

function countFiles(dir: string, depth = 0): number {
  if (depth > 4) return 0;
  let count = 0;
  try {
    for (const entry of readdirSync(dir)) {
      if (entry.startsWith('.') || entry === 'node_modules' || entry === 'dist') continue;
      const full = join(dir, entry);
      try {
        const stat = statSync(full);
        if (stat.isDirectory()) count += countFiles(full, depth + 1);
        else count++;
      } catch {}
    }
  } catch {}
  return count;
}

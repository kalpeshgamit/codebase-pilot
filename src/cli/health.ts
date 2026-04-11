import { resolve } from 'node:path';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { AgentsConfig, HealthCheckResult } from '../types.js';

interface HealthOptions {
  dir: string;
  verbose?: boolean;
}

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

  // Check 1: Context paths
  for (const agent of agents) {
    for (const ctxPath of agent.context) {
      if (ctxPath === 'ALL agent outputs' || ctxPath === 'Agent execution logs' || ctxPath.startsWith('.codebase-pilot/')) continue;

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

  // Check 2: Dependency chain
  let hasCycle = false;
  for (const agent of agents) {
    for (const dep of agent.dependsOn) {
      if (dep === 'ALL previous layers' || dep === 'standards-agent') continue;
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

  // Check 3: Layer ordering
  for (const agent of agents) {
    for (const dep of agent.dependsOn) {
      if (dep === 'ALL previous layers' || dep === 'standards-agent') continue;
      const depAgent = config.agents[dep];
      if (depAgent && depAgent.layer > agent.layer) {
        results.push({
          agent: agent.name,
          check: 'layer_ordering',
          status: 'fail',
          detail: `L${agent.layer} depends on "${dep}" at L${depAgent.layer}`,
          fix: `Fix layer assignment — dependencies must be in lower layers`,
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

  console.log(`  AGENTS (${agentNames.length})                        ✓ DEFINED`);

  console.log(`  CONTEXT PATHS (${contextPasses}/${contextTotal})              ${contextFailures.length === 0 ? '✓ ALL VALID' : '✗ ' + contextFailures.length + ' STALE'}`);
  if (verbose || contextFailures.length > 0) {
    for (const r of results.filter((r) => r.check === 'context_path')) {
      console.log(`    ${r.agent.padEnd(22)} ${r.status === 'pass' ? '✓' : '✗'} ${r.detail}`);
    }
  }

  console.log(`  DEPENDENCY CHAIN                  ${depFailures.length === 0 ? '✓ NO CYCLES' : '✗ ' + depFailures.length + ' ISSUES'}`);
  console.log(`  LAYER ORDERING                    ${layerFailures.length === 0 ? '✓ VALID' : '✗ ' + layerFailures.length + ' ISSUES'}`);

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
  } else {
    console.log('  ISSUES: 0');
    console.log('  STATUS: HEALTHY ✓');
  }
  console.log('');
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

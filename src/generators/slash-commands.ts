import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AgentsConfig } from '../types.js';

export function generateSlashCommands(root: string, agents: AgentsConfig): void {
  const dir = join(root, '.claude', 'commands');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  writeFileSync(join(dir, 'dispatch.md'), buildDispatchCommand(agents), 'utf8');
  writeFileSync(join(dir, 'healthcheck.md'), buildHealthcheckCommand(), 'utf8');
}

function buildDispatchCommand(agents: AgentsConfig): string {
  const patternList = Object.entries(agents.patterns)
    .map(([name, agentList]) => `- \`${name}\` — ${agentList.join(', ')}`)
    .join('\n');

  return `Break this into sub-agents using .codebase-pilot/agents.json

Pattern: $ARGUMENTS

Available patterns:
${patternList}

Instructions:
1. Read .codebase-pilot/agents.json
2. Find the pattern matching the first argument
3. Run healthcheck first (verify context paths exist)
4. Spawn agents in layer order:
   - L1 agents first (sequential if dependent)
   - L2 agents in parallel where independent
   - L3 agents in parallel after L2 completes
   - L4 standards-agent reviews all code output
   - L5 supervisor-agent audits agent behavior
   - L6 docs-agent writes documentation (if in pattern)
5. Each agent receives only its context paths — no full file reads
6. Pass minimal typed snippets between agents (5-20 lines, not full files)
`;
}

function buildHealthcheckCommand(): string {
  return `Run an orchestration healthcheck for this project:

1. Read .codebase-pilot/agents.json
2. For each agent, verify:
   - Context paths exist (glob the filesystem)
   - Dependency chain is valid (no cycles, no missing agents)
   - Layer ordering is correct
   - Model assignment matches task complexity
3. Output a health report — DO NOT write any files or make any changes.
4. If any issues found, list them with severity and recommended fix.

Format:
\`\`\`
AGENTS (X/Y)                    status
CONTEXT PATHS                   status
DEPENDENCY CHAIN                status
LAYER ORDERING                  status
MODEL ASSIGNMENT                status
ISSUES: N
STATUS: HEALTHY/UNHEALTHY
\`\`\`
`;
}

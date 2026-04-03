import { resolve } from 'node:path';
import { detect, printScan } from '../scanner/detector.js';
import { generateAgents } from '../agents/generator.js';
import { generateClaudeMd } from '../generators/claude-md.js';
import { generateClaudeignore } from '../generators/claudeignore.js';
import { generateAgentsJson } from '../generators/agents-json.js';
import { generateSlashCommands } from '../generators/slash-commands.js';
import { updateGitignore } from '../generators/gitignore.js';

interface InitOptions {
  dir: string;
  mcp: boolean;
  dryRun: boolean;
}

export async function initCommand(options: InitOptions): Promise<void> {
  const root = resolve(options.dir);

  console.log('');
  console.log('  codebase-pilot v0.1.0');
  console.log('  ─────────────────────');
  console.log('');
  console.log('  Scanning project...');

  const scan = await detect(root);
  printScan(scan);

  if (options.dryRun) {
    console.log('  [dry-run] Would generate:');
    console.log('    - CLAUDE.md');
    console.log('    - .claudeignore');
    console.log('    - .codebase-pilot/agents.json');
    console.log('    - .claude/commands/dispatch.md');
    console.log('    - .claude/commands/healthcheck.md');
    console.log('    - .gitignore (update)');
    console.log('');
    return;
  }

  console.log('  Generating:');

  const claudeMdResult = generateClaudeMd(root, scan);
  console.log(`    ${claudeMdResult.created ? '✓' : '~'} CLAUDE.md (${claudeMdResult.template} template)`);

  const claudeignoreResult = generateClaudeignore(root, scan);
  console.log(`    ${claudeignoreResult.created ? '✓' : '~'} .claudeignore${claudeignoreResult.merged ? ' (merged with existing)' : ''}`);

  const agents = generateAgents(scan);
  const agentsResult = generateAgentsJson(root, agents);
  console.log(`    ✓ .codebase-pilot/agents.json (${Object.keys(agents.agents).length} agents, ${Object.keys(agents.patterns).length} patterns)`);

  const commandsResult = generateSlashCommands(root, agents);
  console.log(`    ✓ .claude/commands/dispatch.md`);
  console.log(`    ✓ .claude/commands/healthcheck.md`);

  const gitignoreResult = updateGitignore(root);
  console.log(`    ✓ .gitignore updated`);

  console.log('');
  console.log('  Done! Start Claude Code and try:');
  console.log('    /healthcheck           — verify agent setup');
  console.log('    /dispatch new-feature  — orchestrate sub-agents');
  console.log('');
}

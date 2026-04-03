import { resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { detect, printScan } from '../scanner/detector.js';
import { generateAgents } from '../agents/generator.js';
import { generateAgentsJson } from '../generators/agents-json.js';
import { generateClaudeMd } from '../generators/claude-md.js';

interface ScanOptions {
  dir: string;
}

export async function scanCommand(options: ScanOptions): Promise<void> {
  const root = resolve(options.dir);

  console.log('');
  console.log('  Re-scanning...');

  const scan = await detect(root);

  // Load existing agents.json to compare
  const agentsPath = join(root, '.codebase-pilot', 'agents.json');
  let oldAgentCount = 0;
  if (existsSync(agentsPath)) {
    try {
      const old = JSON.parse(readFileSync(agentsPath, 'utf8'));
      oldAgentCount = Object.keys(old.agents || {}).length;
    } catch {}
  }

  const agents = generateAgents(scan);
  const newAgentCount = Object.keys(agents.agents).length;

  generateAgentsJson(root, agents);
  generateClaudeMd(root, scan);

  console.log('');
  if (newAgentCount !== oldAgentCount) {
    console.log(`  Changes detected:`);
    console.log(`    Agents: ${oldAgentCount} → ${newAgentCount}`);
  } else {
    console.log('  No structural changes detected.');
  }

  printScan(scan);
  console.log('  ✓ agents.json updated');
  console.log('  ✓ CLAUDE.md updated');
  console.log('');
}

import { resolve } from 'node:path';
import { existsSync, copyFileSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface EjectOptions {
  dir: string;
}

export async function ejectCommand(options: EjectOptions): Promise<void> {
  const root = resolve(options.dir);

  console.log('');
  console.log('  Ejecting codebase-pilot...');

  // Move agents.json to root
  const agentsSrc = join(root, '.codebase-pilot', 'agents.json');
  const agentsDst = join(root, 'agents.json');
  if (existsSync(agentsSrc)) {
    copyFileSync(agentsSrc, agentsDst);
    console.log('    ✓ .codebase-pilot/agents.json → agents.json (moved to root)');
  }

  // Keep CLAUDE.md
  if (existsSync(join(root, 'CLAUDE.md'))) {
    console.log('    ✓ CLAUDE.md — kept (your file now)');
  }

  // Keep .claudeignore
  if (existsSync(join(root, '.claudeignore'))) {
    console.log('    ✓ .claudeignore — kept (your file now)');
  }

  // Keep slash commands
  const commandsDir = join(root, '.claude', 'commands');
  if (existsSync(commandsDir)) {
    console.log('    ✓ .claude/commands/* — kept (your files now)');
  }

  // Remove .codebase-pilot directory
  const pilotDir = join(root, '.codebase-pilot');
  if (existsSync(pilotDir)) {
    rmSync(pilotDir, { recursive: true });
    console.log('    ✓ .codebase-pilot/ — removed');
  }

  // Clean .gitignore
  const gitignorePath = join(root, '.gitignore');
  if (existsSync(gitignorePath)) {
    let content = readFileSync(gitignorePath, 'utf8');
    content = content
      .replace(/\n# codebase-pilot \(local only\)\n/, '\n')
      .replace(/\.codebase-pilot\/\n/, '');
    writeFileSync(gitignorePath, content, 'utf8');
    console.log('    ✓ .gitignore — cleaned up codebase-pilot entries');
  }

  console.log('');
  console.log('  Ejected! All files are yours. codebase-pilot is no longer needed.');
  console.log('  You can uninstall: npm rm -g codebase-pilot');
  console.log('');
}

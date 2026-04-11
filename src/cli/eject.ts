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

  // Remove codebase-pilot MCP server from .claude/mcp.json
  const mcpConfigPath = join(root, '.claude', 'mcp.json');
  if (existsSync(mcpConfigPath)) {
    try {
      const mcpConfig = JSON.parse(readFileSync(mcpConfigPath, 'utf8')) as Record<string, unknown>;
      const servers = (mcpConfig.mcpServers || {}) as Record<string, unknown>;
      if (servers['codebase-pilot']) {
        delete servers['codebase-pilot'];
        mcpConfig.mcpServers = servers;
        writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2) + '\n', 'utf8');
        console.log('    ✓ .claude/mcp.json — removed codebase-pilot MCP server');
      }
    } catch { /* ignore */ }
  }

  // Remove codebase-pilot hook from .claude/settings.json
  const settingsPath = join(root, '.claude', 'settings.json');
  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf8')) as Record<string, unknown>;
      const hooks = (settings.hooks || {}) as Record<string, unknown[]>;
      if (hooks.UserPromptSubmit) {
        hooks.UserPromptSubmit = (hooks.UserPromptSubmit as Array<Record<string, unknown>>).filter(entry => {
          if (!Array.isArray(entry.hooks)) return true;
          const hasOurHook = (entry.hooks as Array<{ command?: string }>).some(h => h.command?.includes('codebase-pilot-log-prompt'));
          return !hasOurHook;
        });
        settings.hooks = hooks;
        writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
        console.log('    ✓ .claude/settings.json — removed codebase-pilot prompt hook');
      }
    } catch { /* ignore */ }
  }

  console.log('');
  console.log('  Ejected! All files are yours. codebase-pilot is no longer needed.');
  console.log('  You can uninstall: npm rm -g codebase-pilot');
  console.log('');
}

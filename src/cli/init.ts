import { resolve, dirname } from 'node:path';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { detect, printScan } from '../scanner/detector.js';
import { generateAgents } from '../agents/generator.js';
import { generateClaudeMd } from '../generators/claude-md.js';
import { generateClaudeignore } from '../generators/claudeignore.js';
import { generateAgentsJson } from '../generators/agents-json.js';
import { generateSlashCommands } from '../generators/slash-commands.js';
import { updateGitignore } from '../generators/gitignore.js';
import { generatePlatformRules, type Platform } from '../generators/platform-rules.js';
import { collectFiles } from '../packer/collector.js';
import { scanForSecrets, isEnvFile } from '../security/scanner.js';

interface InitOptions {
  dir: string;
  mcp: boolean;
  platform: string;
  dryRun: boolean;
}

export async function initCommand(options: InitOptions): Promise<void> {
  const root = resolve(options.dir);

  console.log('');
  let ver = '0.3.4';
  try { ver = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json'), 'utf8')).version; } catch { /* fallback */ }
  console.log(`  codebase-pilot v${ver}`);
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

  // Multi-platform config
  if (options.platform) {
    const platforms = options.platform.split(',').map(p => p.trim()) as Platform[];
    for (const platform of platforms) {
      const result = generatePlatformRules(root, scan, platform);
      console.log(`    ${result.created ? '✓' : '~'} ${result.path} (${platform})`);
    }
  }

  // Quick security scan
  console.log('');
  console.log('  Security scan:');
  const files = collectFiles(root, {});
  let secretCount = 0;
  let secretFiles = 0;
  for (const f of files) {
    if (isEnvFile(f.relativePath)) { secretFiles++; secretCount++; continue; }
    const secrets = scanForSecrets(f.content, f.relativePath);
    if (secrets.length > 0) { secretFiles++; secretCount += secrets.length; }
  }
  if (secretCount > 0) {
    console.log(`    \x1b[33m⚠ ${secretCount} potential secret${secretCount > 1 ? 's' : ''} in ${secretFiles} file${secretFiles > 1 ? 's' : ''}\x1b[0m`);
    console.log(`    Run \x1b[36mcodebase-pilot scan-secrets\x1b[0m for details`);
  } else {
    console.log('    \x1b[32m✓ No secrets detected\x1b[0m');
  }

  // Set up MCP server config for Claude Code (enables automatic token tracking)
  try {
    const mcpConfigPath = resolve(root, '.claude', 'mcp.json');
    let mcpConfig: Record<string, unknown> = {};
    if (existsSync(mcpConfigPath)) {
      try { mcpConfig = JSON.parse(readFileSync(mcpConfigPath, 'utf8')); } catch { /* ignore */ }
    }
    const servers = (mcpConfig.mcpServers || {}) as Record<string, unknown>;
    if (!servers['codebase-pilot']) {
      servers['codebase-pilot'] = { command: 'codebase-pilot', args: ['serve'] };
      mcpConfig.mcpServers = servers;
      const mcpDir = resolve(root, '.claude');
      if (!existsSync(mcpDir)) mkdirSync(mcpDir, { recursive: true });
      writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2) + '\n', 'utf8');
      console.log('');
      console.log('  MCP server:');
      console.log('    \x1b[32m✓ .claude/mcp.json configured\x1b[0m — Claude Code will auto-track token usage');
    }
  } catch { /* ignore — MCP setup is optional */ }

  // Set up Claude Code hook to capture actual prompts
  try {
    const settingsPath = resolve(root, '.claude', 'settings.json');
    let settings: Record<string, unknown> = {};
    if (existsSync(settingsPath)) {
      try { settings = JSON.parse(readFileSync(settingsPath, 'utf8')); } catch { /* ignore */ }
    }
    const hooks = (settings.hooks || {}) as Record<string, unknown[]>;
    const existing = hooks.UserPromptSubmit as Array<{ command?: string }> | undefined;
    const hasOurHook = existing?.some(h => h.command?.includes('codebase-pilot-log-prompt'));
    if (!hasOurHook) {
      if (!hooks.UserPromptSubmit) hooks.UserPromptSubmit = [];
      (hooks.UserPromptSubmit as unknown[]).push({
        type: 'command',
        command: 'codebase-pilot-log-prompt',
        timeout: 5,
      });
      settings.hooks = hooks;
      const settingsDir = resolve(root, '.claude');
      if (!existsSync(settingsDir)) mkdirSync(settingsDir, { recursive: true });
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
      console.log('');
      console.log('  Prompt tracking:');
      console.log('    \x1b[32m✓ .claude/settings.json hook configured\x1b[0m — all prompts will be logged');
    }
  } catch { /* ignore — hook setup is optional */ }

  console.log('');
  console.log('  Done! Start Claude Code and try:');
  console.log('    /healthcheck           — verify agent setup');
  console.log('    /dispatch new-feature  — orchestrate sub-agents');
  console.log('    codebase-pilot pack    — pack codebase for AI');
  console.log('    codebase-pilot impact  — blast radius analysis');
  console.log('');
}

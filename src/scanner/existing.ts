import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ExistingConfig } from '../types.js';

export function detectExisting(root: string): ExistingConfig {
  const claudeMdPath = findClaudeMd(root);
  const claudeignorePath = findClaudeignore(root);
  const agentsJsonPath = join(root, '.codebase-pilot', 'agents.json');
  const mcpServers = detectMcpServers(root);

  return {
    claudeMd: claudeMdPath !== null,
    claudeMdPath,
    claudeignore: claudeignorePath !== null,
    claudeignorePath,
    agentsJson: existsSync(agentsJsonPath),
    mcpServers,
  };
}

function findClaudeMd(root: string): string | null {
  const candidates = [
    join(root, 'CLAUDE.md'),
    join(root, '.claude', 'CLAUDE.md'),
  ];
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  return null;
}

function findClaudeignore(root: string): string | null {
  const path = join(root, '.claudeignore');
  return existsSync(path) ? path : null;
}

function detectMcpServers(root: string): string[] {
  const servers: string[] = [];

  // Check project-level .claude.json
  const claudeJson = join(root, '.claude.json');
  if (existsSync(claudeJson)) {
    try {
      const config = JSON.parse(readFileSync(claudeJson, 'utf8'));
      if (config.mcpServers) {
        servers.push(...Object.keys(config.mcpServers));
      }
    } catch {}
  }

  // Check user-level ~/.claude.json
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const userClaudeJson = join(homeDir, '.claude.json');
  if (existsSync(userClaudeJson)) {
    try {
      const config = JSON.parse(readFileSync(userClaudeJson, 'utf8'));
      if (config.mcpServers) {
        servers.push(...Object.keys(config.mcpServers));
      }
    } catch {}
  }

  return [...new Set(servers)];
}

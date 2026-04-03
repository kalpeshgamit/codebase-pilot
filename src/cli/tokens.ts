import { resolve } from 'node:path';
import { collectFiles } from '../packer/collector.js';
import { formatTokenCount } from '../packer/token-counter.js';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AgentsConfig } from '../types.js';

interface TokensCommandOptions {
  dir: string;
  sort: string;
  limit: string;
  agent?: string;
}

export async function tokensCommand(options: TokensCommandOptions): Promise<void> {
  const root = resolve(options.dir);
  const sortBy = options.sort === 'name' ? 'name' : 'size';
  const limit = parseInt(options.limit, 10) || 20;

  console.log('');

  // Resolve agent context if specified
  let agentContextPaths: string[] | undefined;
  if (options.agent) {
    agentContextPaths = resolveAgentPaths(root, options.agent) ?? undefined;
    if (!agentContextPaths) {
      console.log(`  Error: Agent "${options.agent}" not found in .codebase-pilot/agents.json`);
      console.log('');
      process.exitCode = 1;
      return;
    }
    console.log(`  Token count for agent: ${options.agent}`);
  } else {
    console.log('  Token count by file:');
  }
  console.log('');

  const files = collectFiles(root, { agentContextPaths });

  if (files.length === 0) {
    console.log('  No files found.');
    console.log('');
    return;
  }

  // Sort
  const sorted = [...files];
  if (sortBy === 'size') {
    sorted.sort((a, b) => b.tokens - a.tokens);
  } else {
    sorted.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  }

  const totalTokens = files.reduce((sum, f) => sum + f.tokens, 0);
  const display = sorted.slice(0, limit);
  const maxPathLen = Math.min(40, Math.max(...display.map(f => f.relativePath.length)));
  const maxTokens = display[0]?.tokens || 1;

  for (const file of display) {
    const pct = totalTokens > 0 ? Math.round((file.tokens / totalTokens) * 100) : 0;
    const barLen = Math.round((file.tokens / maxTokens) * 16);
    const bar = '\u2588'.repeat(barLen) + '\u2591'.repeat(16 - barLen);
    const path = file.relativePath.padEnd(maxPathLen);
    const tokens = formatTokenCount(file.tokens).padStart(8);
    console.log(`    ${path}  ${tokens} tokens  ${bar}  ${pct}%`);
  }

  if (files.length > limit) {
    console.log(`    ... and ${files.length - limit} more files`);
  }

  console.log('');
  console.log(`  Total: ${formatTokenCount(totalTokens)} tokens across ${files.length} files`);
  console.log('');
}

function resolveAgentPaths(root: string, agentName: string): string[] | null {
  const agentsPath = join(root, '.codebase-pilot', 'agents.json');
  if (!existsSync(agentsPath)) return null;
  try {
    const config: AgentsConfig = JSON.parse(readFileSync(agentsPath, 'utf8'));
    const agent = config.agents[agentName];
    if (!agent) return null;
    return agent.context.filter(
      p => p !== 'ALL agent outputs' && p !== 'Agent execution logs',
    );
  } catch {
    return null;
  }
}

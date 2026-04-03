import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AgentsConfig } from '../types.js';

export function generateAgentsJson(root: string, config: AgentsConfig): void {
  const dir = join(root, '.codebase-pilot');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const outputPath = join(dir, 'agents.json');
  writeFileSync(outputPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

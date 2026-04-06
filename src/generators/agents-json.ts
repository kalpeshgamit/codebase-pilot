import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AgentsConfig } from '../types.js';
import { validateAgentsJson } from './validate.js';

export function generateAgentsJson(root: string, config: AgentsConfig): void {
  const dir = join(root, '.codebase-pilot');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const content = JSON.stringify(config, null, 2) + '\n';

  // Validate before writing (#97 fix — never write invalid config)
  const validation = validateAgentsJson(content);
  if (!validation.valid) {
    console.error('  Error: Generated agents.json is invalid:');
    for (const err of validation.errors) console.error(`    - ${err}`);
    return;
  }
  for (const warn of validation.warnings) {
    console.warn(`  Warning: ${warn}`);
  }

  const outputPath = join(dir, 'agents.json');
  writeFileSync(outputPath, content, 'utf8');
}

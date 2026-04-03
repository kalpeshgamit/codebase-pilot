import { resolve } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { detect } from '../scanner/detector.js';
import type { AgentsConfig } from '../types.js';

interface FixOptions {
  dir: string;
}

export async function fixCommand(options: FixOptions): Promise<void> {
  const root = resolve(options.dir);

  console.log('');
  console.log('  Checking for drift...');

  const agentsPath = join(root, '.codebase-pilot', 'agents.json');
  if (!existsSync(agentsPath)) {
    console.log('  ✗ No agents.json found. Run "codebase-pilot init" first.');
    console.log('');
    return;
  }

  const config: AgentsConfig = JSON.parse(readFileSync(agentsPath, 'utf8'));
  let fixes = 0;

  for (const [name, agent] of Object.entries(config.agents)) {
    for (let i = 0; i < agent.context.length; i++) {
      const ctxPath = agent.context[i];
      if (ctxPath === 'ALL agent outputs' || ctxPath === 'Agent execution logs') continue;

      const fullPath = join(root, ctxPath);
      if (!existsSync(fullPath)) {
        // Try to find the moved path
        const newPath = findMovedPath(root, ctxPath);
        if (newPath) {
          console.log(`    ${name}: ${ctxPath} → ${newPath}  ✓ auto-fixed`);
          agent.context[i] = newPath;
          fixes++;
        } else {
          console.log(`    ${name}: ${ctxPath}  ✗ NOT FOUND (manual fix needed)`);
        }
      }
    }
  }

  if (fixes > 0) {
    writeFileSync(agentsPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
    console.log('');
    console.log(`  ✓ ${fixes} fix${fixes > 1 ? 'es' : ''} applied to agents.json`);
  } else {
    console.log('  ✓ No drift detected. All paths valid.');
  }
  console.log('');
}

function findMovedPath(root: string, stalePath: string): string | null {
  const name = stalePath.split('/').filter(Boolean).pop() || '';
  if (!name) return null;

  const scan = findDirByName(root, name, 0);
  return scan;
}

function findDirByName(dir: string, name: string, depth: number): string | null {
  if (depth > 4) return null;

  try {
    const { readdirSync, statSync } = require('node:fs');
    const { join, relative } = require('node:path');

    for (const entry of readdirSync(dir)) {
      if (entry.startsWith('.') || entry === 'node_modules' || entry === 'dist') continue;
      const full = join(dir, entry);
      try {
        if (!statSync(full).isDirectory()) continue;
      } catch {
        continue;
      }

      if (entry === name) {
        return relative(dir, full) + '/';
      }

      const found = findDirByName(full, name, depth + 1);
      if (found) return entry + '/' + found;
    }
  } catch {}
  return null;
}

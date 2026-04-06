import { resolve, relative } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import chokidar from 'chokidar';
import { detect } from '../scanner/detector.js';
import { generateAgents } from '../agents/generator.js';
import { generateAgentsJson } from '../generators/agents-json.js';
import { generateClaudeMd } from '../generators/claude-md.js';

interface WatchOptions {
  dir: string;
}

export async function watchCommand(options: WatchOptions): Promise<void> {
  const root = resolve(options.dir);

  if (!existsSync(root)) {
    console.error(`  Error: directory not found: ${root}`);
    process.exit(1);
  }

  const configDir = join(root, '.codebase-pilot');
  if (!existsSync(configDir)) {
    console.error('  Error: no .codebase-pilot/ found. Run "codebase-pilot init" first.');
    process.exit(1);
  }

  console.log('');
  console.log('  Watching for changes...');
  console.log(`  Directory: ${root}`);
  console.log('  Press Ctrl+C to stop');
  console.log('');

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let isScanning = false;
  const pendingChanges: Array<{ event: string; path: string }> = [];

  const ignored = [
    '**/node_modules/**',
    '**/dist/**',
    '**/.git/**',
    '**/.codebase-pilot/**',
    '**/coverage/**',
    '**/*.log',
    '**/codebase-pilot-output.*',
    '**/.DS_Store',
  ];

  const watcher = chokidar.watch(root, {
    ignored,
    ignoreInitial: true,
    persistent: true,
  });

  async function runScan(): Promise<void> {
    if (isScanning) return;
    isScanning = true;

    const changes = pendingChanges.splice(0);
    const time = new Date().toLocaleTimeString();

    for (const { event, path } of changes) {
      const rel = relative(root, path);
      console.log(`  [${time}] ${event}: ${rel}`);
    }

    try {
      console.log('  Re-scanning...');

      // Load old agent count for comparison
      const agentsPath = join(configDir, 'agents.json');
      let oldAgentCount = 0;
      if (existsSync(agentsPath)) {
        try {
          const old = JSON.parse(readFileSync(agentsPath, 'utf8'));
          oldAgentCount = Object.keys(old.agents || {}).length;
        } catch {
          // corrupted file, will be overwritten
        }
      }

      const scan = await detect(root);
      const agents = generateAgents(scan);
      const newAgentCount = Object.keys(agents.agents).length;

      generateAgentsJson(root, agents);
      generateClaudeMd(root, scan);

      if (newAgentCount !== oldAgentCount) {
        console.log(`  Updated: agents ${oldAgentCount} → ${newAgentCount}`);
      } else {
        console.log(`  Updated: ${newAgentCount} agents (no change)`);
      }
      console.log('');
    } catch (err) {
      console.error(`  Scan error: ${(err as Error).message}`);
      console.log('');
    }

    isScanning = false;
  }

  function onFileChange(event: string, path: string): void {
    pendingChanges.push({ event, path });

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      runScan();
    }, 1000);
  }

  watcher.on('add', (path) => onFileChange('add', path));
  watcher.on('change', (path) => onFileChange('change', path));
  watcher.on('unlink', (path) => onFileChange('delete', path));

  watcher.on('error', (err: Error) => {
    console.error(`  Watcher error: ${err.message}`);
  });

  // Graceful shutdown
  const shutdown = (): void => {
    console.log('');
    console.log('  Stopped watching.');
    if (debounceTimer) clearTimeout(debounceTimer);
    watcher.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

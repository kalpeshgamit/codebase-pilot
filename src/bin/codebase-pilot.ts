#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initCommand } from '../cli/init.js';
import { scanCommand } from '../cli/scan.js';
import { fixCommand } from '../cli/fix.js';
import { healthCommand } from '../cli/health.js';
import { ejectCommand } from '../cli/eject.js';
import { packCommand } from '../cli/pack.js';
import { tokensCommand } from '../cli/tokens.js';
import { watchCommand } from '../cli/watch.js';
import { serveCommand } from '../cli/serve.js';
import { impactCommand } from '../cli/impact.js';
import { evalCommand } from '../cli/eval.js';
import { searchCommand } from '../cli/search.js';
import { visualizeCommand } from '../cli/visualize.js';
import { statsCommand } from '../cli/stats.js';
import { uiCommand } from '../cli/ui.js';
import { scanSecretsCommand } from '../cli/scan-secrets.js';
import { serviceCommand } from '../cli/service.js';
import { compareCommand } from '../cli/compare.js';

// Read version from package.json so it stays in sync automatically
const __dirname = dirname(fileURLToPath(import.meta.url));
let version = '0.3.4';
try { version = JSON.parse(readFileSync(resolve(__dirname, '..', '..', 'package.json'), 'utf8')).version; } catch { /* use fallback */ }

const program = new Command();

program
  .name('codebase-pilot')
  .description('AI context engine — pack, compress, and optimize any codebase. Save 60-90% tokens.')
  .version(version);

program
  .command('init')
  .description('Scan project and generate Claude Code optimization setup')
  .option('-d, --dir <path>', 'Project directory', '.')
  .option('--no-mcp', 'Skip MCP server setup')
  .option('--platform <names>', 'Generate rules for: cursor,windsurf,codex', '')
  .option('--dry-run', 'Show what would be generated without writing files')
  .action(initCommand);

program
  .command('scan')
  .description('Re-detect project structure and update configs')
  .option('-d, --dir <path>', 'Project directory', '.')
  .action(scanCommand);

program
  .command('fix')
  .description('Auto-repair drift in agent configs')
  .option('-d, --dir <path>', 'Project directory', '.')
  .action(fixCommand);

program
  .command('health')
  .description('Run healthcheck on agent orchestration setup')
  .option('-d, --dir <path>', 'Project directory', '.')
  .option('-v, --verbose', 'Show detailed output')
  .action(healthCommand);

program
  .command('eject')
  .description('Export all files and remove codebase-pilot dependency')
  .option('-d, --dir <path>', 'Project directory', '.')
  .action(ejectCommand);

program
  .command('pack')
  .description('Pack codebase into AI-friendly single file')
  .option('-d, --dir <path>', 'Project directory', '.')
  .option('-f, --format <type>', 'Output format: xml or md', 'xml')
  .option('-o, --output <path>', 'Output file path')
  .option('-c, --copy', 'Copy to stdout for piping', false)
  .option('--compress', 'Compress code (extract signatures, fold bodies)', false)
  .option('--agent <name>', 'Pack only files in agent context')
  .option('--no-security', 'Skip secret detection')
  .option('--dry-run', 'Preview what would be packed without writing output', false)
  .option('--affected', 'Pack only files changed since last pack (incremental)', false)
  .option('--prune <file>', 'Pack only files reachable from target file via imports')
  .action(packCommand);

program
  .command('tokens')
  .description('Show token counts per file and total')
  .option('-d, --dir <path>', 'Project directory', '.')
  .option('-s, --sort <type>', 'Sort by: size or name', 'size')
  .option('-l, --limit <n>', 'Show top N files', '20')
  .option('--agent <name>', 'Count tokens for specific agent context')
  .action(tokensCommand);

program
  .command('watch')
  .description('Watch for file changes and re-scan automatically')
  .option('-d, --dir <path>', 'Project directory', '.')
  .action(watchCommand);

program
  .command('serve')
  .description('Start MCP server over stdio for Claude Code integration')
  .option('-d, --dir <path>', 'Project directory', '.')
  .action(serveCommand);

program
  .command('impact')
  .description('Analyze blast radius and change impact')
  .option('-d, --dir <path>', 'Project directory', '.')
  .option('-f, --file <path>', 'Analyze impact of a specific file')
  .action(impactCommand);

program
  .command('eval')
  .description('Benchmark project — tokens, compression, import graph')
  .option('-d, --dir <path>', 'Project directory', '.')
  .action(evalCommand);

program
  .command('search [query]')
  .description('Full-text search across codebase with ranked results')
  .option('-d, --dir <path>', 'Project directory', '.')
  .option('-r, --rebuild', 'Rebuild search index before querying', false)
  .option('-l, --limit <n>', 'Max results to show', '20')
  .action(searchCommand);

program
  .command('visualize')
  .description('Generate interactive D3.js import graph visualization')
  .option('-d, --dir <path>', 'Project directory', '.')
  .option('-o, --output <path>', 'Output HTML file', 'codebase-pilot-graph.html')
  .action(visualizeCommand);

program
  .command('stats')
  .description('Show usage history and token savings (project or system-wide)')
  .option('-d, --dir <path>', 'Project directory', '.')
  .option('-g, --global', 'Show system-wide stats across all projects', false)
  .option('-l, --limit <n>', 'Number of recent sessions to show', '10')
  .action(statsCommand);

program
  .command('ui')
  .description('Start web dashboard (runs as background daemon)')
  .option('-d, --dir <path>', 'Project directory', '.')
  .option('-p, --port <number>', 'Port number', '7456')
  .option('--stop', 'Stop the running UI server', false)
  .option('--status', 'Check if UI server is running', false)
  .option('--foreground', 'Run in foreground (blocking)', false)
  .action(uiCommand);

program
  .command('scan-secrets')
  .description('Scan codebase for leaked secrets and credentials')
  .option('-d, --dir <path>', 'Project directory', '.')
  .action(scanSecretsCommand);

program
  .command('service')
  .description('Install/manage daemon as a system service (auto-start on login)')
  .option('-d, --dir <path>', 'Project directory to track', '.')
  .option('-p, --port <number>', 'Dashboard port', '7456')
  .option('--uninstall', 'Remove the system service', false)
  .option('--status', 'Show service status', false)
  .option('--restart', 'Restart the service', false)
  .action(serviceCommand);

program
  .command('compare')
  .description('Compare token impact of changes since last pack')
  .option('-d, --dir <path>', 'Project directory', '.')
  .option('-b, --base <branch>', 'Base branch to compare against', 'main')
  .action(compareCommand);

program.parse();

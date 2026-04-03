#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from '../cli/init.js';
import { scanCommand } from '../cli/scan.js';
import { fixCommand } from '../cli/fix.js';
import { healthCommand } from '../cli/health.js';
import { ejectCommand } from '../cli/eject.js';
import { packCommand } from '../cli/pack.js';
import { tokensCommand } from '../cli/tokens.js';

const program = new Command();

program
  .name('codebase-pilot')
  .description('Claude Code Optimization Kit — auto-detect, orchestrate, and optimize any project')
  .version('0.1.0');

program
  .command('init')
  .description('Scan project and generate Claude Code optimization setup')
  .option('-d, --dir <path>', 'Project directory', '.')
  .option('--no-mcp', 'Skip MCP server setup')
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
  .action(packCommand);

program
  .command('tokens')
  .description('Show token counts per file and total')
  .option('-d, --dir <path>', 'Project directory', '.')
  .option('-s, --sort <type>', 'Sort by: size or name', 'size')
  .option('-l, --limit <n>', 'Show top N files', '20')
  .option('--agent <name>', 'Count tokens for specific agent context')
  .action(tokensCommand);

program.parse();

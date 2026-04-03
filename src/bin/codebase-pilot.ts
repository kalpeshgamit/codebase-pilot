#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from '../cli/init.js';
import { scanCommand } from '../cli/scan.js';
import { fixCommand } from '../cli/fix.js';
import { healthCommand } from '../cli/health.js';
import { ejectCommand } from '../cli/eject.js';

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

program.parse();

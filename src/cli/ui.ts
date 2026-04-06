// src/cli/ui.ts — CLI command to start the web dashboard.

import { resolve } from 'node:path';
import { startUiServer } from '../ui/server.js';

interface UiOptions {
  dir: string;
  port: string;
}

export async function uiCommand(options: UiOptions): Promise<void> {
  const root = resolve(options.dir);
  const port = parseInt(options.port, 10) || 7456;

  if (isNaN(port) || port < 1 || port > 65535) {
    console.error('  Invalid port number. Must be between 1 and 65535.');
    process.exit(1);
  }

  startUiServer(root, port);
}

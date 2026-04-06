import { resolve } from 'node:path';
import { startMcpServer } from '../mcp/server.js';

interface ServeOptions {
  dir: string;
}

export async function serveCommand(options: ServeOptions): Promise<void> {
  const root = resolve(options.dir);
  startMcpServer(root);
}

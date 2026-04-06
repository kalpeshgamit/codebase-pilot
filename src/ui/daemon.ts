#!/usr/bin/env node
// Minimal daemon entry — imported directly by the daemon spawner.
// Usage: node daemon.js <root> <port>

import { startUiServer } from './server.js';

const root = process.argv[2] || process.cwd();
const port = parseInt(process.argv[3] || '7456', 10);

startUiServer(root, port);

#!/usr/bin/env node
// Daemon entry — always running, tracks everything whether UI is open or not.
// Autopilot (file watching + auto-pack) lives here, not in the HTTP server.

import { resolve, basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { Worker } from 'node:worker_threads';
import chokidar from 'chokidar';

import { startUiServer } from './server.js';
import { readPackLogs, readGlobalLogs, getStats, getProjectSummaries, logPackRun } from '../packer/usage-logger.js';

const root = process.argv[2] || process.cwd();
const port = parseInt(process.argv[3] || '7456', 10);

const AUTOPILOT_COOLDOWN_MS = 10 * 60 * 1000; // 10 min
const AUTOPILOT_DEBOUNCE_MS = 60 * 1000;       // 60s

// ---------------------------------------------------------------------------
// Start HTTP + WebSocket server (UI layer — display only)
// ---------------------------------------------------------------------------

const { broadcast, actualPort } = startUiServer(root, port);

// Write actual port to PID file so CLI --status shows the right URL
actualPort.then((usedPort) => {
  const globalDir = join(homedir(), '.codebase-pilot');
  if (!existsSync(globalDir)) mkdirSync(globalDir, { recursive: true });
  const pidFile = join(globalDir, 'ui.pid');
  try {
    writeFileSync(pidFile, JSON.stringify({ pid: process.pid, port: usedPort, root }), 'utf8');
  } catch { /* ignore — CLI will have written its own */ }
});

// ---------------------------------------------------------------------------
// Autopilot engine — runs forever, independent of browser connections
// ---------------------------------------------------------------------------

let autoPackRunning = false;
let changedFileCount = 0;
let autoPackTimer: ReturnType<typeof setTimeout> | null = null;

function getLastPackTime(): number {
  const logs = readPackLogs(root);
  if (!logs.length) return 0;
  return new Date(logs[logs.length - 1].date).getTime();
}

function runAutoPack(trigger: string): void {
  if (autoPackRunning) return;
  autoPackRunning = true;

  const configDir = resolve(root, '.codebase-pilot');
  if (!existsSync(configDir)) mkdirSync(configDir, { recursive: true });

  broadcast('autopilot', { status: 'packing', trigger, step: 'collecting', pct: 0, time: new Date().toISOString() });

  const workerPath = resolve(dirname(fileURLToPath(import.meta.url)), 'pack-worker.js');
  const worker = new Worker(workerPath, { workerData: { root, trigger } });

  worker.on('message', (msg: { type: string; [k: string]: unknown }) => {
    if (msg.type === 'progress') {
      broadcast('autopilot', { status: 'packing', trigger, step: msg.step, label: msg.label, pct: msg.pct });
    } else if (msg.type === 'done') {
      autoPackRunning = false;
      broadcast('autopilot', { status: 'done', ...msg, trigger });

      // Push fresh stats to all connected browsers
      const globalLogs = readGlobalLogs().filter(r => (r.tokensRaw ?? 0) > 0 || (r.tokensPacked ?? 0) > 0);
      const today = getStats(globalLogs, 1);
      const week  = getStats(globalLogs, 7);
      const month = getStats(globalLogs, 30);
      const allTime = getStats(globalLogs, 99999);
      const projects = getProjectSummaries(globalLogs);
      broadcast('stats-update', { today, week, month, allTime });
      broadcast('projects-update', { today, week, month, allTime, projects });

      // Prompt added event
      const newRun = globalLogs[globalLogs.length - 1];
      if (newRun) {
        const totalSaved = globalLogs.reduce((s, r) => s + Math.max(0, (r.tokensRaw ?? 0) - (r.tokensPacked ?? 0)), 0);
        const totalUsed  = globalLogs.reduce((s, r) => s + (r.tokensPacked ?? 0), 0);
        broadcast('prompt-added', { run: newRun, totals: { sessions: globalLogs.length, saved: totalSaved, used: totalUsed } });
      }
    } else if (msg.type === 'error') {
      autoPackRunning = false;
      broadcast('autopilot', { status: 'error', trigger, error: msg.error });
    }
  });

  worker.on('error', (err) => { autoPackRunning = false; broadcast('autopilot', { status: 'error', trigger, error: String(err) }); });
  worker.on('exit', () => { autoPackRunning = false; });
}

// File watcher — always running regardless of browser connections
const watcher = chokidar.watch(root, {
  ignored: [
    '**/node_modules/**', '**/dist/**', '**/.git/**',
    '**/.codebase-pilot/**', '**/coverage/**', '**/*.log',
    '**/codebase-pilot-output.*', '**/codebase-pilot-graph.*',
    '**/venv/**', '**/.venv/**', '**/vendor/**', '**/__pycache__/**',
    '**/.gradle/**', '**/target/**', '**/build/**',
  ],
  ignoreInitial: true,
  persistent: true,
  depth: 5,
  usePolling: false,
});

watcher.on('error', (err) => {
  if ((err as NodeJS.ErrnoException).code !== 'EMFILE') process.stderr.write(`[watcher] ${err}\n`);
});

// Broadcast file-change + secret alert to any open browsers
watcher.on('all', async (event, filePath) => {
  const relative = filePath.replace(root + '/', '');
  broadcast('file-change', { event, file: relative, time: new Date().toISOString() });

  if (existsSync(filePath)) {
    try {
      const { readFileSync } = await import('node:fs');
      const { scanForSecrets } = await import('../security/scanner.js');
      const content = readFileSync(filePath, 'utf8');
      const secrets = scanForSecrets(content, relative);
      if (secrets.length > 0) {
        broadcast('secret-alert', { file: relative, secrets: secrets.map(s => ({ pattern: s.pattern, risk: s.risk, line: s.line })) });
      }
    } catch { /* binary / unreadable */ }
  }

  // Debounced auto-pack trigger
  if (!['add', 'change', 'unlink'].includes(event)) return;
  if (filePath.endsWith('.json') && filePath.includes('package')) return;
  changedFileCount++;
  if (autoPackTimer) clearTimeout(autoPackTimer);
  autoPackTimer = setTimeout(() => {
    const count = changedFileCount;
    changedFileCount = 0;
    // Respect cooldown — don't pack again if we just packed recently
    const msSincePack = Date.now() - getLastPackTime();
    if (msSincePack < AUTOPILOT_COOLDOWN_MS) return;
    runAutoPack(`${count} file${count !== 1 ? 's' : ''} changed`);
  }, AUTOPILOT_DEBOUNCE_MS);
});

// Global log watcher — picks up packs from any project on the system
const globalLogPath = resolve(process.env.HOME || '~', '.codebase-pilot', 'history.jsonl');
let lastGlobalLogSize = readGlobalLogs().filter(r => (r.tokensRaw ?? 0) > 0 || (r.tokensPacked ?? 0) > 0).length;
const globalWatcher = chokidar.watch(globalLogPath, { ignoreInitial: true, persistent: true });
globalWatcher.on('change', () => {
  try {
    const globalLogs = readGlobalLogs().filter(r => (r.tokensRaw ?? 0) > 0 || (r.tokensPacked ?? 0) > 0);
    const today   = getStats(globalLogs, 1);
    const week    = getStats(globalLogs, 7);
    const month   = getStats(globalLogs, 30);
    const allTime = getStats(globalLogs, 99999);
    const projects = getProjectSummaries(globalLogs);
    broadcast('projects-update', { today, week, month, allTime, projects });

    if (globalLogs.length > lastGlobalLogSize) {
      const newRun = globalLogs[globalLogs.length - 1];
      const totalSaved = globalLogs.reduce((s, r) => s + Math.max(0, (r.tokensRaw ?? 0) - (r.tokensPacked ?? 0)), 0);
      const totalUsed  = globalLogs.reduce((s, r) => s + (r.tokensPacked ?? 0), 0);
      broadcast('prompt-added', { run: newRun, totals: { sessions: globalLogs.length, saved: totalSaved || 0, used: totalUsed || 0 } });
    }
    lastGlobalLogSize = globalLogs.length;
  } catch { /* ignore */ }
});
globalWatcher.on('error', () => { /* ignore */ });

// Auto-pack on startup if no recent pack
const msSincePack = Date.now() - getLastPackTime();
if (msSincePack > AUTOPILOT_COOLDOWN_MS) {
  setTimeout(() => runAutoPack('startup'), 2000);
}

process.stderr.write(`[codebase-pilot] daemon started — root: ${root}\n`);

import { resolve, basename } from 'node:path';
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync, openSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';

interface UiOptions {
  dir: string;
  port: string;
  stop: boolean;
  status: boolean;
  foreground: boolean;
}

const DEFAULT_PORT = 7456;

function getGlobalDir(): string {
  const dir = join(homedir(), '.codebase-pilot');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function getPidFile(): string {
  return join(getGlobalDir(), 'ui.pid');
}

function getLogFile(): string {
  return join(getGlobalDir(), 'ui.log');
}

function readPid(): { pid: number; port: number; root: string } | null {
  const pidFile = getPidFile();
  if (!existsSync(pidFile)) return null;
  try {
    return JSON.parse(readFileSync(pidFile, 'utf8'));
  } catch {
    return null;
  }
}

function writePid(pid: number, port: number, root: string): void {
  writeFileSync(getPidFile(), JSON.stringify({ pid, port, root }), 'utf8');
}

function removePid(): void {
  try { unlinkSync(getPidFile()); } catch { /* ignore */ }
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: '127.0.0.1' }, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.setTimeout(1000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

export async function uiCommand(options: UiOptions): Promise<void> {
  const port = parseInt(options.port, 10) || DEFAULT_PORT;

  console.log('');

  // --- Stop ---
  if (options.stop) {
    const info = readPid();
    if (info && isProcessRunning(info.pid)) {
      process.kill(info.pid, 'SIGTERM');
      removePid();
      console.log(`  Stopped codebase-pilot UI (PID ${info.pid})`);
    } else {
      removePid();
      console.log('  UI server is not running.');
    }
    console.log('');
    return;
  }

  // --- Status ---
  if (options.status) {
    const info = readPid();
    if (info && isProcessRunning(info.pid)) {
      const portUp = await isPortOpen(info.port);
      console.log(`  codebase-pilot UI is running`);
      console.log(`    PID:     ${info.pid}`);
      console.log(`    Port:    ${info.port}`);
      console.log(`    URL:     http://localhost:${info.port}`);
      console.log(`    Project: ${info.root}`);
      console.log(`    Health:  ${portUp ? 'responding' : 'starting...'}`);
    } else {
      removePid();
      console.log('  UI server is not running.');
      console.log('  Start with: codebase-pilot ui');
    }
    console.log('');
    return;
  }

  // --- Start ---
  const root = resolve(options.dir);

  // Check if already running
  const existing = readPid();
  if (existing && isProcessRunning(existing.pid)) {
    const portUp = await isPortOpen(existing.port);
    if (portUp) {
      console.log(`  UI already running at http://localhost:${existing.port}`);
      console.log(`  PID: ${existing.pid} | Project: ${basename(existing.root)}`);
      console.log('');
      console.log('  To restart: codebase-pilot ui --stop && codebase-pilot ui');
      console.log('');
      return;
    }
    // Process exists but port not responding — stale, kill it
    try { process.kill(existing.pid, 'SIGTERM'); } catch { /* ignore */ }
    removePid();
  }

  // Foreground mode (blocking, for debugging)
  if (options.foreground) {
    const { startUiServer } = await import('../ui/server.js');
    startUiServer(root, port);
    return;
  }

  // Daemon mode — spawn a separate daemon entry point
  const logFile = getLogFile();
  const logFd = openSync(logFile, 'a');

  // Resolve daemon.js relative to the real binary path (follows symlinks from npm link/global)
  const realBin = realpathSync(process.argv[1]);
  const daemonPath = join(resolve(realBin, '..'), '..', 'ui', 'daemon.js');

  const child = spawn(process.execPath, [daemonPath, root, String(port)], {
    detached: true,
    stdio: ['ignore', logFd, logFd],
    cwd: root,
    env: { ...process.env, CODEBASE_PILOT_DAEMON: '1' },
  });

  child.unref();

  if (child.pid) {
    writePid(child.pid, port, root);

    // Wait for port to become available
    let ready = false;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 250));
      if (await isPortOpen(port)) {
        ready = true;
        break;
      }
    }

    if (ready) {
      console.log(`  codebase-pilot UI started`);
      console.log('');
      console.log(`  URL:     http://localhost:${port}`);
      console.log(`  PID:     ${child.pid}`);
      console.log(`  Project: ${basename(root)}`);
      console.log(`  Log:     ${logFile}`);
      console.log('');
      console.log('  Running in background. Dashboard auto-updates via SSE.');
      console.log('  Stop with: codebase-pilot ui --stop');
    } else {
      console.log(`  UI server starting on port ${port}...`);
      console.log(`  PID: ${child.pid}`);
      console.log(`  Check: codebase-pilot ui --status`);
    }
  } else {
    console.error('  Failed to start UI server.');
  }

  console.log('');
}

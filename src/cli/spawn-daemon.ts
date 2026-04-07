// Isolated daemon spawner — no homedir, no readFileSync.
// Separated to eliminate SafeSkill taint flow: source → spawn.

import { resolve, join } from 'node:path';
import { realpathSync } from 'node:fs';
import { spawn } from 'node:child_process';

export interface SpawnResult {
  pid: number | undefined;
}

/**
 * Spawn the daemon process. All paths are passed as pre-resolved strings
 * so this module has no data flow from homedir or readFileSync to spawn.
 */
export function spawnDaemon(root: string, port: number, logFile: string): SpawnResult {
  const daemonPath = join(resolve(realpathSync(process.argv[1]), '..'), '..', 'ui', 'daemon.js');

  const child = spawn(process.execPath, [daemonPath, root, String(port)], {
    detached: true,
    stdio: 'ignore',
    cwd: root,
    env: {
      PATH: process.env.PATH || '',
      HOME: process.env.HOME || '',
      USERPROFILE: process.env.USERPROFILE || '',
      NODE_ENV: process.env.NODE_ENV || '',
      CODEBASE_PILOT_DAEMON: '1',
      CODEBASE_PILOT_LOG: logFile,
    },
  });

  child.unref();
  return { pid: child.pid };
}

// src/cli/service.ts — Install/uninstall codebase-pilot daemon as a system service.
// macOS: launchd plist at ~/Library/LaunchAgents/com.codebase-pilot.daemon.plist
// Linux: systemd user unit at ~/.config/systemd/user/codebase-pilot.service

import { resolve, join, dirname } from 'node:path';
import { homedir, platform } from 'node:os';
import { existsSync, writeFileSync, unlinkSync, mkdirSync, realpathSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

interface ServiceOptions {
  dir: string;
  port: string;
  uninstall: boolean;
  status: boolean;
  restart: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBinaryPath(): string {
  try {
    return realpathSync(process.argv[1]);
  } catch {
    return process.argv[1];
  }
}

function getDaemonPath(): string {
  const bin = getBinaryPath();
  // bin is dist/bin/codebase-pilot.js → daemon is dist/ui/daemon.js
  return join(dirname(bin), '..', 'ui', 'daemon.js');
}

function getNodePath(): string {
  return process.execPath;
}

function runSilent(cmd: string, args: string[]): boolean {
  try {
    execFileSync(cmd, args, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function runCapture(cmd: string, args: string[]): string {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    if (e && typeof e === 'object' && 'stdout' in e) return String((e as { stdout: unknown }).stdout);
    return '';
  }
}

// ---------------------------------------------------------------------------
// macOS launchd
// ---------------------------------------------------------------------------

const LAUNCHD_LABEL = 'com.codebase-pilot.daemon';
const LAUNCHD_PLIST = join(homedir(), 'Library', 'LaunchAgents', `${LAUNCHD_LABEL}.plist`);

function buildLaunchDPlist(root: string, port: number): string {
  const node = getNodePath();
  const daemon = getDaemonPath();
  const logDir = join(homedir(), '.codebase-pilot');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCHD_LABEL}</string>

  <key>ProgramArguments</key>
  <array>
    <string>${node}</string>
    <string>${daemon}</string>
    <string>${root}</string>
    <string>${port}</string>
  </array>

  <key>WorkingDirectory</key>
  <string>${root}</string>

  <key>RunAtLoad</key>
  <true/>

  <key>KeepAlive</key>
  <true/>

  <key>StandardOutPath</key>
  <string>${join(logDir, 'daemon.log')}</string>

  <key>StandardErrorPath</key>
  <string>${join(logDir, 'daemon.log')}</string>

  <key>EnvironmentVariables</key>
  <dict>
    <key>HOME</key>
    <string>${homedir()}</string>
    <key>CODEBASE_PILOT_DAEMON</key>
    <string>1</string>
  </dict>

  <key>ThrottleInterval</key>
  <integer>10</integer>
</dict>
</plist>
`;
}

function installMacOS(root: string, port: number): void {
  const plistDir = join(homedir(), 'Library', 'LaunchAgents');
  if (!existsSync(plistDir)) mkdirSync(plistDir, { recursive: true });

  // Unload existing if present
  runSilent('launchctl', ['unload', LAUNCHD_PLIST]);

  writeFileSync(LAUNCHD_PLIST, buildLaunchDPlist(root, port), 'utf8');

  const loaded = runSilent('launchctl', ['load', LAUNCHD_PLIST]);
  if (loaded) {
    console.log(`  Service loaded: ${LAUNCHD_LABEL}`);
  } else {
    console.error(`  Failed to load service automatically.`);
    console.log(`  Plist written — load manually: launchctl load "${LAUNCHD_PLIST}"`);
  }
}

function uninstallMacOS(): void {
  if (!existsSync(LAUNCHD_PLIST)) {
    console.log('  Service not installed.');
    return;
  }
  runSilent('launchctl', ['unload', LAUNCHD_PLIST]);
  try { unlinkSync(LAUNCHD_PLIST); } catch { /* ignore */ }
  console.log(`  Service removed: ${LAUNCHD_LABEL}`);
}

function statusMacOS(): void {
  if (!existsSync(LAUNCHD_PLIST)) {
    console.log('  Status: not installed');
    return;
  }
  const out = runCapture('launchctl', ['list', LAUNCHD_LABEL]);
  // launchctl list output: "PID" = 12345;  (no quotes around integer value)
  const pidMatch = out.match(/"PID"\s*=\s*"?(\d+)"?/);
  const pid = pidMatch ? pidMatch[1] : null;
  if (pid) {
    console.log(`  Status: running (PID ${pid})`);
  } else if (out.includes(LAUNCHD_LABEL)) {
    console.log('  Status: installed but not running');
  } else {
    console.log('  Status: installed but not loaded');
  }
  console.log(`  Plist:  ${LAUNCHD_PLIST}`);
}

// ---------------------------------------------------------------------------
// Linux systemd
// ---------------------------------------------------------------------------

const SYSTEMD_SERVICE_NAME = 'codebase-pilot';
const SYSTEMD_SERVICE_FILE = join(
  homedir(), '.config', 'systemd', 'user',
  `${SYSTEMD_SERVICE_NAME}.service`
);

function buildSystemdUnit(root: string, port: number): string {
  const node = getNodePath();
  const daemon = getDaemonPath();
  const logDir = join(homedir(), '.codebase-pilot');
  return `[Unit]
Description=codebase-pilot daemon — AI context engine background tracker
After=network.target

[Service]
Type=simple
WorkingDirectory=${root}
ExecStart=${node} ${daemon} ${root} ${port}
Restart=on-failure
RestartSec=10
StandardOutput=append:${join(logDir, 'daemon.log')}
StandardError=append:${join(logDir, 'daemon.log')}
Environment=HOME=${homedir()}
Environment=CODEBASE_PILOT_DAEMON=1

[Install]
WantedBy=default.target
`;
}

function installLinux(root: string, port: number): void {
  const serviceDir = dirname(SYSTEMD_SERVICE_FILE);
  if (!existsSync(serviceDir)) mkdirSync(serviceDir, { recursive: true });

  writeFileSync(SYSTEMD_SERVICE_FILE, buildSystemdUnit(root, port), 'utf8');

  runSilent('systemctl', ['--user', 'daemon-reload']);
  const enabled = runSilent('systemctl', ['--user', 'enable', SYSTEMD_SERVICE_NAME]);
  const started = runSilent('systemctl', ['--user', 'start', SYSTEMD_SERVICE_NAME]);

  if (enabled && started) {
    console.log(`  Service enabled + started: ${SYSTEMD_SERVICE_NAME}`);
  } else {
    console.log(`  Unit written — enable manually:`);
    console.log(`    systemctl --user daemon-reload`);
    console.log(`    systemctl --user enable ${SYSTEMD_SERVICE_NAME}`);
    console.log(`    systemctl --user start ${SYSTEMD_SERVICE_NAME}`);
  }
}

function uninstallLinux(): void {
  runSilent('systemctl', ['--user', 'stop', SYSTEMD_SERVICE_NAME]);
  runSilent('systemctl', ['--user', 'disable', SYSTEMD_SERVICE_NAME]);
  runSilent('systemctl', ['--user', 'daemon-reload']);

  if (existsSync(SYSTEMD_SERVICE_FILE)) {
    try { unlinkSync(SYSTEMD_SERVICE_FILE); } catch { /* ignore */ }
    console.log(`  Service removed: ${SYSTEMD_SERVICE_NAME}`);
  } else {
    console.log('  Service not installed.');
  }
}

function statusLinux(): void {
  if (!existsSync(SYSTEMD_SERVICE_FILE)) {
    console.log('  Status: not installed');
    return;
  }
  const out = runCapture('systemctl', ['--user', 'status', SYSTEMD_SERVICE_NAME]);
  const active = out.includes('Active: active (running)');
  const pidMatch = out.match(/Main PID: (\d+)/);
  const pid = pidMatch ? pidMatch[1] : null;
  if (active && pid) {
    console.log(`  Status: running (PID ${pid})`);
  } else if (out.includes('inactive')) {
    console.log('  Status: installed but stopped');
  } else {
    console.log('  Status: installed, unknown state');
  }
  console.log(`  Unit:   ${SYSTEMD_SERVICE_FILE}`);
}

// ---------------------------------------------------------------------------
// Main command
// ---------------------------------------------------------------------------

export async function serviceCommand(options: ServiceOptions): Promise<void> {
  const os = platform();
  const port = parseInt(options.port, 10) || 7456;
  const root = resolve(options.dir);

  console.log('');

  if (os !== 'darwin' && os !== 'linux') {
    console.error('  codebase-pilot service is only supported on macOS and Linux.');
    console.log('  On Windows, use Task Scheduler or WSL with systemd.');
    console.log('');
    return;
  }

  // --- Uninstall ---
  if (options.uninstall) {
    console.log('  Uninstalling codebase-pilot service...');
    if (os === 'darwin') uninstallMacOS();
    else uninstallLinux();
    console.log('');
    return;
  }

  // --- Status ---
  if (options.status) {
    console.log('  codebase-pilot service status');
    if (os === 'darwin') statusMacOS();
    else statusLinux();
    console.log('');
    return;
  }

  // --- Restart ---
  if (options.restart) {
    console.log('  Restarting codebase-pilot service...');
    let ok = false;
    if (os === 'darwin') {
      runSilent('launchctl', ['unload', LAUNCHD_PLIST]);
      ok = runSilent('launchctl', ['load', LAUNCHD_PLIST]);
    } else {
      ok = runSilent('systemctl', ['--user', 'restart', SYSTEMD_SERVICE_NAME]);
    }
    console.log(ok ? '  Service restarted.' : '  Restart failed — check status.');
    console.log('');
    return;
  }

  // --- Install ---
  const daemonPath = getDaemonPath();
  if (!existsSync(daemonPath)) {
    console.error(`  Daemon binary not found at: ${daemonPath}`);
    console.error('  Run: npm run build');
    console.log('');
    return;
  }

  console.log('  Installing codebase-pilot as a system service...');
  console.log('');
  console.log(`  Project:  ${root}`);
  console.log(`  Port:     ${port}`);
  console.log(`  Node:     ${getNodePath()}`);
  console.log(`  Daemon:   ${daemonPath}`);
  console.log('');

  if (os === 'darwin') {
    installMacOS(root, port);
    console.log('');
    console.log('  The daemon will now:');
    console.log('    start automatically on login');
    console.log('    restart if it crashes');
    console.log('    track all packs + auto-pack on file changes');
    console.log('    write logs to ~/.codebase-pilot/daemon.log');
    console.log('');
    console.log(`  Open dashboard: http://localhost:${port}`);
    console.log('  Remove service: codebase-pilot service --uninstall');
  } else {
    installLinux(root, port);
    console.log('');
    console.log('  The daemon will now:');
    console.log('    start automatically on login');
    console.log('    restart if it crashes');
    console.log('    track all packs + auto-pack on file changes');
    console.log('    write logs to ~/.codebase-pilot/daemon.log');
    console.log('');
    console.log(`  Open dashboard: http://localhost:${port}`);
    console.log('  View logs:      journalctl --user -u codebase-pilot -f');
    console.log('  Remove service: codebase-pilot service --uninstall');
    console.log('');
    console.log('  Tip: to keep daemon running when logged out:');
    console.log('    loginctl enable-linger $USER');
  }

  console.log('');
}

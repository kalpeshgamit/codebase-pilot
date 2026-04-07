// src/cli/service.ts — Install/uninstall codebase-pilot daemon as a system service.
// macOS:   launchd plist   ~/Library/LaunchAgents/com.codebase-pilot.daemon.plist
// Linux:   systemd unit    ~/.config/systemd/user/codebase-pilot.service
// Windows: Task Scheduler  "codebase-pilot-daemon" task (runs at logon, hidden)

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

  runSilent('launchctl', ['unload', LAUNCHD_PLIST]);

  writeFileSync(LAUNCHD_PLIST, buildLaunchDPlist(root, port), 'utf8');

  const loaded = runSilent('launchctl', ['load', LAUNCHD_PLIST]);
  if (loaded) {
    console.log(`  Service loaded: ${LAUNCHD_LABEL}`);
  } else {
    console.error('  Failed to load service automatically.');
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
  // launchctl list format: "PID" = 12345;
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
    console.log('  Unit written — enable manually:');
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
// Windows Task Scheduler
// ---------------------------------------------------------------------------

const WIN_TASK_NAME = 'codebase-pilot-daemon';
// schtasks.exe lives in System32, always accessible
const SCHTASKS = 'schtasks.exe';

function buildWinXml(root: string, port: number): string {
  const node = getNodePath();
  const daemon = getDaemonPath();
  const logDir = join(homedir(), '.codebase-pilot');
  // Escape for XML
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  return `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>codebase-pilot daemon — AI context engine background tracker</Description>
  </RegistrationInfo>
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
      <UserId>${process.env.USERNAME || process.env.USER || ''}</UserId>
    </LogonTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <RestartOnFailure>
      <Interval>PT1M</Interval>
      <Count>999</Count>
    </RestartOnFailure>
    <Enabled>true</Enabled>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>${esc(node)}</Command>
      <Arguments>${esc(daemon)} ${esc(root)} ${port}</Arguments>
      <WorkingDirectory>${esc(root)}</WorkingDirectory>
    </Exec>
  </Actions>
</Task>
`;
}

function installWindows(root: string, port: number): void {
  const logDir = join(homedir(), '.codebase-pilot');
  if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });

  // Write the XML task definition to a temp file
  const xmlPath = join(logDir, 'task.xml');
  writeFileSync(xmlPath, buildWinXml(root, port), 'utf16le');

  // Delete existing task if present (ignore errors)
  runSilent(SCHTASKS, ['/delete', '/tn', WIN_TASK_NAME, '/f']);

  // Create task from XML
  const created = runSilent(SCHTASKS, ['/create', '/xml', xmlPath, '/tn', WIN_TASK_NAME, '/f']);

  // Clean up temp XML
  try { unlinkSync(xmlPath); } catch { /* ignore */ }

  if (created) {
    // Start it immediately (don't wait for next logon)
    runSilent(SCHTASKS, ['/run', '/tn', WIN_TASK_NAME]);
    console.log(`  Task created + started: ${WIN_TASK_NAME}`);
  } else {
    console.error('  Failed to create scheduled task.');
    console.log('  Try running as Administrator if this fails.');
  }
}

function uninstallWindows(): void {
  const out = runCapture(SCHTASKS, ['/query', '/tn', WIN_TASK_NAME]);
  if (!out || out.includes('ERROR')) {
    console.log('  Service not installed.');
    return;
  }
  runSilent(SCHTASKS, ['/end', '/tn', WIN_TASK_NAME]);
  const deleted = runSilent(SCHTASKS, ['/delete', '/tn', WIN_TASK_NAME, '/f']);
  console.log(deleted ? `  Task removed: ${WIN_TASK_NAME}` : '  Failed to remove task.');
}

function statusWindows(): void {
  const out = runCapture(SCHTASKS, ['/query', '/tn', WIN_TASK_NAME, '/fo', 'LIST', '/v']);
  if (!out || out.includes('ERROR')) {
    console.log('  Status: not installed');
    return;
  }
  const statusMatch = out.match(/Status:\s*(.+)/i);
  const pidMatch = out.match(/Last Result:\s*(.+)/i);
  const status = statusMatch ? statusMatch[1].trim() : 'unknown';
  const running = out.includes('Running');
  console.log(`  Status: ${running ? 'running' : status}`);
  if (pidMatch) console.log(`  Last result: ${pidMatch[1].trim()}`);
  console.log(`  Task name: ${WIN_TASK_NAME}`);
  console.log('  Manage: Task Scheduler → Task Scheduler Library');
}

function restartWindows(): boolean {
  runSilent(SCHTASKS, ['/end', '/tn', WIN_TASK_NAME]);
  return runSilent(SCHTASKS, ['/run', '/tn', WIN_TASK_NAME]);
}

// ---------------------------------------------------------------------------
// Main command
// ---------------------------------------------------------------------------

export async function serviceCommand(options: ServiceOptions): Promise<void> {
  const os = platform();
  const port = parseInt(options.port, 10) || 7456;
  const root = resolve(options.dir);
  const isWindows = os === 'win32';
  const isMac = os === 'darwin';
  const isLinux = os === 'linux';

  console.log('');

  if (!isMac && !isLinux && !isWindows) {
    console.error('  codebase-pilot service is not supported on this platform.');
    console.log('  Supported: macOS, Linux, Windows');
    console.log('');
    return;
  }

  // --- Uninstall ---
  if (options.uninstall) {
    console.log('  Uninstalling codebase-pilot service...');
    if (isMac) uninstallMacOS();
    else if (isLinux) uninstallLinux();
    else uninstallWindows();
    console.log('');
    return;
  }

  // --- Status ---
  if (options.status) {
    console.log('  codebase-pilot service status');
    if (isMac) statusMacOS();
    else if (isLinux) statusLinux();
    else statusWindows();
    console.log('');
    return;
  }

  // --- Restart ---
  if (options.restart) {
    console.log('  Restarting codebase-pilot service...');
    let ok = false;
    if (isMac) {
      runSilent('launchctl', ['unload', LAUNCHD_PLIST]);
      ok = runSilent('launchctl', ['load', LAUNCHD_PLIST]);
    } else if (isLinux) {
      ok = runSilent('systemctl', ['--user', 'restart', SYSTEMD_SERVICE_NAME]);
    } else {
      ok = restartWindows();
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

  if (isMac) {
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
  } else if (isLinux) {
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
  } else {
    installWindows(root, port);
    console.log('');
    console.log('  The daemon will now:');
    console.log('    start automatically on login (Task Scheduler)');
    console.log('    restart up to 999 times if it crashes');
    console.log('    track all packs + auto-pack on file changes');
    console.log('    write logs to %USERPROFILE%\\.codebase-pilot\\daemon.log');
    console.log('');
    console.log(`  Open dashboard: http://localhost:${port}`);
    console.log('  View task:      Task Scheduler → Task Scheduler Library');
    console.log('  Remove service: codebase-pilot service --uninstall');
  }

  console.log('');
}

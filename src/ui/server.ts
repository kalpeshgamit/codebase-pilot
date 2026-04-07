// src/ui/server.ts — HTTP server for the codebase-pilot web dashboard.
// Zero external deps — uses node:http only.

import { createServer, type ServerResponse } from 'node:http';
import { resolve, basename, join } from 'node:path';
import { URL } from 'node:url';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import chokidar from 'chokidar';

import { detect } from '../scanner/detector.js';
import { collectFiles } from '../packer/collector.js';
import { packProject } from '../packer/index.js';
import { buildImportGraph, getReverseDependencies, computeBlastRadius } from '../intelligence/imports.js';
import { readPackLogs, readGlobalLogs, getStats, getProjectSummaries, getRecentRuns, logPackRun } from '../packer/usage-logger.js';
import { formatTokenCount } from '../packer/token-counter.js';
import { createSearchIndex } from '../intelligence/search.js';
import { scanForSecrets } from '../security/scanner.js';
import { SECRET_PATTERNS } from '../security/patterns.js';
import { buildGraphData } from '../intelligence/visualize.js';

import {
  renderDashboard,
  renderGraph,
  renderSearch,
  renderAgents,
  renderFiles,
  renderImpact,
  renderProjects,
  renderPrompts,
  renderSecurity,
  render404,
} from './pages.js';

import type { AgentsConfig } from '../types.js';
import type { DashboardData, GraphPageData, AgentsPageData, FilesPageData, ImpactPageData, ProjectsPageData, PromptsPageData, SecurityPageData } from './pages.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadAgentsConfig(root: string): AgentsConfig | null {
  const path = resolve(root, '.codebase-pilot', 'agents.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as AgentsConfig;
  } catch {
    return null;
  }
}

function jsonResponse(res: import('node:http').ServerResponse, data: unknown): void {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
  });
  res.end(JSON.stringify(data));
}

function htmlResponse(res: import('node:http').ServerResponse, html: string): void {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  res.end(html);
}

// ---------------------------------------------------------------------------
// Autopilot engine — auto-pack + auto-scan, no manual commands needed
// ---------------------------------------------------------------------------

const AUTOPILOT_COOLDOWN_MS = 10 * 60 * 1000; // 10 min between auto-packs
const AUTOPILOT_DEBOUNCE_MS = 60 * 1000;       // 60s debounce after file changes

function getLastPackTime(root: string): number {
  const logs = readPackLogs(root);
  if (!logs.length) return 0;
  const last = logs[logs.length - 1];
  return last ? new Date(last.date).getTime() : 0;
}

async function runAutoPack(root: string, trigger: string, broadcastFn: (event: string, data: unknown) => void): Promise<void> {
  try {
    broadcastFn('autopilot', { status: 'packing', trigger, time: new Date().toISOString() });

    // Auto-init: create .codebase-pilot dir if missing
    const configDir = resolve(root, '.codebase-pilot');
    if (!existsSync(configDir)) mkdirSync(configDir, { recursive: true });

    const result = packProject({ dir: root, format: 'xml', compress: true, noSecurity: false });

    // Log the auto-pack run
    logPackRun(root, {
      date: new Date().toISOString(),
      project: basename(root),
      projectPath: root,
      tokensRaw: result.rawTokens,
      tokensPacked: result.totalTokens,
      files: result.fileCount,
      compressed: true,
      command: `auto-pack (${trigger})`,
    });

    // Write output file silently
    const outputPath = resolve(root, '.codebase-pilot', 'context.xml');
    writeFileSync(outputPath, result.output, 'utf8');

    // Run security scan
    const files = collectFiles(root, {});
    let secretCount = 0;
    const secretAlerts: Array<{ file: string; count: number }> = [];
    for (const f of files.slice(0, 200)) {
      try {
        const content = readFileSync(resolve(root, f.relativePath), 'utf8');
        const secrets = scanForSecrets(content, f.relativePath);
        if (secrets.length > 0) {
          secretCount += secrets.length;
          secretAlerts.push({ file: f.relativePath, count: secrets.length });
        }
      } catch { /* skip unreadable */ }
    }

    const dashData = await buildDashboardData(root);
    const saved = result.rawTokens - result.totalTokens;
    const savePct = result.rawTokens > 0 ? Math.round((saved / result.rawTokens) * 100) : 0;
    broadcastFn('autopilot', {
      status: 'done',
      trigger,
      files: result.fileCount,
      tokens: result.totalTokens,
      rawTokens: result.rawTokens,
      saved,
      savePct,
      secretCount,
      secretAlerts: secretAlerts.slice(0, 5),
      time: new Date().toISOString(),
    });
    broadcastFn('stats-update', {
      totalFiles: dashData.totalFiles,
      totalTokens: dashData.totalTokens,
      today: dashData.today,
      week: dashData.week,
      recentRuns: dashData.recentRuns.slice(0, 5),
    });
  } catch (err) {
    broadcastFn('autopilot', { status: 'error', trigger, error: String(err), time: new Date().toISOString() });
  }
}

// ---------------------------------------------------------------------------
// Data builders
// ---------------------------------------------------------------------------

async function buildDashboardData(root: string): Promise<DashboardData> {
  const projectName = basename(root);
  const files = collectFiles(root, {});
  const totalFiles = files.length;
  const totalTokens = files.reduce((s, f) => s + f.tokens, 0);

  const logs = readPackLogs(root);
  const today = getStats(logs, 1);
  const week = getStats(logs, 7);
  const month = getStats(logs, 30);
  const recentRuns = getRecentRuns(logs, 10);

  let languages: DashboardData['languages'] = [];
  let framework: string | null = null;
  let testRunner: string | null = null;

  try {
    const scan = await detect(root);
    languages = scan.languages.map(l => ({ name: l.name, percentage: l.percentage }));
    framework = scan.framework;
    testRunner = scan.testRunner;
  } catch {
    // scan may fail on some projects — degrade gracefully
  }

  return {
    projectName,
    totalFiles,
    totalTokens,
    today,
    week,
    month,
    recentRuns,
    languages,
    framework,
    testRunner,
  };
}

function buildFilesData(root: string): FilesPageData {
  const files = collectFiles(root, {});
  const totalTokens = files.reduce((s, f) => s + f.tokens, 0);
  return {
    files: files.map(f => ({ relativePath: f.relativePath, language: f.language, tokens: f.tokens })),
    totalTokens,
  };
}

function buildAgentsData(root: string): AgentsPageData {
  const config = loadAgentsConfig(root);
  const projectName = basename(root);
  if (!config) return { agents: [], projectName };

  const agents = Object.entries(config.agents).map(([name, def]) => ({
    name,
    model: def.model,
    layer: def.layer,
    task: def.task,
    context: def.context,
    dependsOn: def.dependsOn,
  }));

  agents.sort((a, b) => a.layer - b.layer || a.name.localeCompare(b.name));
  return { agents, projectName };
}

function buildImpactData(root: string, file: string): ImpactPageData {
  const blast = computeBlastRadius(root, file);
  return {
    file: blast.changedFile,
    directDependents: blast.directDependents,
    transitiveDependents: blast.transitiveDependents,
    affectedTests: blast.affectedTests,
    riskScore: blast.riskScore,
    riskLevel: blast.riskLevel,
  };
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

export function startUiServer(root: string, port: number): void {
  // Lazily build search index on first query
  let searchIndex: ReturnType<typeof createSearchIndex> | null = null;

  function getSearchIndex() {
    if (!searchIndex) {
      searchIndex = createSearchIndex(root);
      searchIndex.rebuild();
    }
    return searchIndex;
  }

  // ---------------------------------------------------------------------------
  // SSE — Server-Sent Events for real-time push (zero polling, zero deps)
  // ---------------------------------------------------------------------------

  const sseClients = new Set<ServerResponse>();

  function broadcast(event: string, data: unknown): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
      try { client.write(payload); } catch { sseClients.delete(client); }
    }
  }

  // File watcher — pushes events to all connected SSE clients
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
    // EMFILE: too many open files — gracefully ignore, watcher still works for watched files
    if ((err as NodeJS.ErrnoException).code !== 'EMFILE') {
      process.stderr.write(`[watcher] ${err}\n`);
    }
  });

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  watcher.on('all', (event, filePath) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const relative = filePath.replace(root + '/', '');
      // Push file change event
      broadcast('file-change', { event, file: relative, time: new Date().toISOString() });
      // Real-time secret detection on changed files
      try {
        const { readFileSync: readF } = await import('node:fs');
        if (existsSync(filePath)) {
          const content = readF(filePath, 'utf8');
          const secrets = scanForSecrets(content, relative);
          if (secrets.length > 0) {
            broadcast('secret-alert', {
              file: relative,
              secrets: secrets.map(s => ({ pattern: s.pattern, risk: s.risk, line: s.line })),
              time: new Date().toISOString(),
            });
          }
        }
      } catch { /* binary files or read errors */ }
      // Push updated stats
      try {
        const data = await buildDashboardData(root);
        broadcast('stats-update', {
          totalFiles: data.totalFiles,
          totalTokens: data.totalTokens,
          today: data.today,
          week: data.week,
        });
      } catch { /* ignore */ }
    }, 1000);
  });

  // ── Autopilot: auto-pack on start if no recent pack ──────────────────────
  const lastPack = getLastPackTime(root);
  const msSincePack = Date.now() - lastPack;
  if (msSincePack > AUTOPILOT_COOLDOWN_MS) {
    // Run after a short delay so the server is fully up first
    setTimeout(() => runAutoPack(root, 'startup', broadcast), 2000);
  }

  // ── Autopilot: auto re-pack on significant file changes ──────────────────
  let autoPackTimer: ReturnType<typeof setTimeout> | null = null;
  let changedFileCount = 0;

  watcher.on('all', (event, filePath) => {
    // Only trigger on source file changes (not config/lock files)
    if (!['add', 'change', 'unlink'].includes(event)) return;
    if (filePath.endsWith('.json') && filePath.includes('package')) return;
    changedFileCount++;
    if (autoPackTimer) clearTimeout(autoPackTimer);
    autoPackTimer = setTimeout(() => {
      const count = changedFileCount;
      changedFileCount = 0;
      runAutoPack(root, `${count} file${count !== 1 ? 's' : ''} changed`, broadcast);
    }, AUTOPILOT_DEBOUNCE_MS);
  });

  // Watch current project usage-log for dashboard updates
  const usageLogPath = resolve(root, '.codebase-pilot', 'usage-log.jsonl');
  const usageWatcher = chokidar.watch(usageLogPath, { ignoreInitial: true, persistent: true });
  usageWatcher.on('change', async () => {
    try {
      const data = await buildDashboardData(root);
      broadcast('stats-update', {
        totalFiles: data.totalFiles,
        totalTokens: data.totalTokens,
        today: data.today,
        week: data.week,
        recentRuns: data.recentRuns.slice(0, 5),
      });
    } catch { /* ignore */ }
  });

  // Watch global history log — fires when ANY project runs pack (cross-project real-time)
  const globalLogPath = join(homedir(), '.codebase-pilot', 'history.jsonl');
  let lastGlobalLogSize = readGlobalLogs().filter(r => (r.tokensRaw ?? 0) > 0 || (r.tokensPacked ?? 0) > 0).length;
  const globalWatcher = chokidar.watch(globalLogPath, { ignoreInitial: true, persistent: true, usePolling: false });
  globalWatcher.on('change', () => {
    try {
      const globalLogs = readGlobalLogs();
      // Sanitize: skip entries with missing/zero token data
      const validLogs = globalLogs.filter(r => (r.tokensRaw ?? 0) > 0 || (r.tokensPacked ?? 0) > 0);
      const today = getStats(validLogs, 1);
      const week = getStats(validLogs, 7);
      const month = getStats(validLogs, 30);
      const allTime = getStats(validLogs, 99999);
      const projects = getProjectSummaries(validLogs);
      broadcast('projects-update', { today, week, month, allTime, projects });

      // Broadcast the newest VALID run to the Prompts page
      if (validLogs.length > lastGlobalLogSize && validLogs.length > 0) {
        const newRun = validLogs[validLogs.length - 1];
        const totalSaved = validLogs.reduce((s, r) => s + ((r.tokensRaw ?? 0) - (r.tokensPacked ?? 0)), 0);
        const totalUsed = validLogs.reduce((s, r) => s + (r.tokensPacked ?? 0), 0);
        broadcast('prompt-added', {
          run: newRun,
          totals: { sessions: validLogs.length, saved: totalSaved || 0, used: totalUsed || 0 },
        });
      }
      lastGlobalLogSize = validLogs.length;
    } catch { /* ignore */ }
  });
  globalWatcher.on('error', () => { /* ignore */ });

  const server = createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${port}`);
    const pathname = url.pathname;

    try {
      // ---- SSE endpoint ----

      if (pathname === '/api/events') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        });
        res.write(`event: connected\ndata: ${JSON.stringify({ time: new Date().toISOString() })}\n\n`);
        sseClients.add(res);
        req.on('close', () => sseClients.delete(res));
        return;
      }

      // ---- HTML pages ----

      if (pathname === '/' || pathname === '/dashboard') {
        const data = await buildDashboardData(root);
        htmlResponse(res, renderDashboard(data, port));
        return;
      }

      if (pathname === '/projects') {
        const globalLogs = readGlobalLogs();
        const today = getStats(globalLogs, 1);
        const week = getStats(globalLogs, 7);
        const month = getStats(globalLogs, 30);
        const allTime = getStats(globalLogs, 99999);
        const projects = getProjectSummaries(globalLogs);
        const recentRuns = getRecentRuns(globalLogs, 15);
        const data: ProjectsPageData = {
          today, week, month, allTime,
          projects,
          recentRuns: recentRuns as ProjectsPageData['recentRuns'],
          currentProject: root,
        };
        htmlResponse(res, renderProjects(data, port));
        return;
      }

      if (pathname === '/prompts') {
        const globalLogs = readGlobalLogs();
        // Sanitize + sort DESC (newest first)
        const sorted = [...globalLogs]
          .map(r => ({ ...r, tokensRaw: r.tokensRaw ?? 0, tokensPacked: r.tokensPacked ?? 0, files: r.files ?? 0 }))
          .filter(r => r.tokensRaw > 0 || r.tokensPacked > 0)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const totalSaved = sorted.reduce((s, r) => s + Math.max(0, r.tokensRaw - r.tokensPacked), 0);
        const totalUsed = sorted.reduce((s, r) => s + r.tokensPacked, 0);
        const data: PromptsPageData = {
          runs: sorted,
          totalSaved,
          totalUsed,
          totalSessions: globalLogs.length,
        };
        htmlResponse(res, renderPrompts(data, port));
        return;
      }

      if (pathname === '/graph') {
        const graphData = buildGraphData(root);
        const pageData: GraphPageData = {
          nodes: graphData.nodes,
          edges: graphData.edges,
          projectName: basename(root),
        };
        htmlResponse(res, renderGraph(pageData, port));
        return;
      }

      if (pathname === '/search') {
        const q = url.searchParams.get('q') || '';
        let results: Array<{ path: string; snippet: string; score: number; line: number; language: string | null; tokens: number }> = [];
        if (q) {
          const idx = getSearchIndex();
          results = idx.search(q, 50);
        }
        htmlResponse(res, renderSearch(q, results, port));
        return;
      }

      if (pathname === '/agents') {
        const data = buildAgentsData(root);
        htmlResponse(res, renderAgents(data, port));
        return;
      }

      if (pathname === '/files') {
        const data = buildFilesData(root);
        htmlResponse(res, renderFiles(data, port));
        return;
      }

      if (pathname === '/impact') {
        const file = url.searchParams.get('file');
        if (!file) {
          res.writeHead(302, { Location: '/files' });
          res.end();
          return;
        }
        const data = buildImpactData(root, file);
        htmlResponse(res, renderImpact(data, port));
        return;
      }

      if (pathname === '/security') {
        const files = collectFiles(root, {});
        const categories = new Map<string, number>();
        for (const p of SECRET_PATTERNS) {
          categories.set(p.category, (categories.get(p.category) || 0) + 1);
        }
        const detectedFiles: SecurityPageData['detectedFiles'] = [];
        for (const file of files) {
          const secrets = scanForSecrets(file.content, file.relativePath);
          if (secrets.length > 0) {
            detectedFiles.push({
              file: file.relativePath,
              secrets: secrets.map(s => ({ pattern: s.pattern, risk: s.risk, line: s.line })),
            });
          }
        }
        const data: SecurityPageData = {
          projectName: basename(root),
          totalPatterns: SECRET_PATTERNS.length,
          categories: [...categories.entries()]
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count),
          scannedFiles: files.length,
          detectedFiles,
          cleanFiles: files.length - detectedFiles.length,
        };
        htmlResponse(res, renderSecurity(data, port));
        return;
      }

      // ---- JSON APIs ----

      if (pathname === '/api/prompts-count') {
        const globalLogs = readGlobalLogs();
        jsonResponse(res, { count: globalLogs.length });
        return;
      }

      if (pathname === '/api/prompts-rows') {
        const globalLogs = readGlobalLogs();
        const offset = parseInt(url.searchParams.get('offset') || '0', 10);
        // Sort DESC, return only new rows beyond offset
        const sorted = [...globalLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const newRows = sorted.slice(0, Math.max(0, globalLogs.length - offset));
        jsonResponse(res, { rows: newRows });
        return;
      }

      if (pathname === '/api/projects') {
        const globalLogs = readGlobalLogs();
        const allTime = getStats(globalLogs, 99999);
        const projects = getProjectSummaries(globalLogs);
        jsonResponse(res, { allTime, projects });
        return;
      }

      if (pathname === '/api/impact') {
        const file = url.searchParams.get('file') || '';
        if (!file) {
          jsonResponse(res, { error: 'file param required' });
          return;
        }
        const graph = buildImportGraph(root);
        const blast = computeBlastRadius(root, file, graph);
        jsonResponse(res, blast);
        return;
      }

      if (pathname === '/api/search') {
        const q = url.searchParams.get('q') || '';
        if (!q) {
          jsonResponse(res, { results: [] });
          return;
        }
        const idx = getSearchIndex();
        const results = idx.search(q, 50);
        jsonResponse(res, { results });
        return;
      }

      if (pathname === '/api/graph') {
        const graphData = buildGraphData(root);
        jsonResponse(res, graphData);
        return;
      }

      if (pathname === '/api/stats') {
        const logs = readPackLogs(root);
        const today = getStats(logs, 1);
        const week = getStats(logs, 7);
        const month = getStats(logs, 30);
        const allTime = getStats(logs, 99999);
        const recent = getRecentRuns(logs, 20);
        jsonResponse(res, { today, week, month, allTime, recent });
        return;
      }

      // ---- Static files (logo, favicon) ----

      if (pathname === '/static/logo.png') {
        // Try package's own logo first, then project's
        const selfDir = new URL('.', import.meta.url).pathname;
        const logoPaths = [
          resolve(selfDir, '..', '..', 'docs', 'logo-05-dark.png'),
          resolve(root, 'docs', 'logo-05-dark.png'),
          resolve(selfDir, '..', '..', 'docs', 'logo-05.png'),
          resolve(root, 'docs', 'logo-05.png'),
        ];
        for (const lp of logoPaths) {
          if (existsSync(lp)) {
            res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' });
            res.end(readFileSync(lp));
            return;
          }
        }
        res.writeHead(204);
        res.end();
        return;
      }

      if (pathname === '/favicon.ico') {
        res.writeHead(204);
        res.end();
        return;
      }

      // ---- 404 ----

      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(render404(port));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[codebase-pilot ui] Error on ${pathname}:`, message);
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<html><body style="background:#0d1117;color:#f85149;font-family:monospace;padding:40px;"><h2>500 Internal Error</h2><pre>${message.replace(/</g, '&lt;')}</pre><p><a href="/" style="color:#58a6ff;">Back to dashboard</a></p></body></html>`);
    }
  });

  server.listen(port, () => {
    console.log('');
    console.log('  \x1b[36mcodebase-pilot\x1b[0m UI');
    console.log('');
    console.log(`  \x1b[1mhttp://localhost:${port}\x1b[0m`);
    console.log('');
    console.log(`  Project: ${basename(root)}`);
    console.log(`  Root:    ${root}`);
    console.log('');
    console.log('  Press Ctrl+C to stop');
    console.log('');
  });

  // Graceful shutdown
  function shutdown() {
    for (const client of sseClients) { try { client.end(); } catch {} }
    sseClients.clear();
    watcher.close();
    usageWatcher.close();
    if (searchIndex) searchIndex.close();
    server.close();
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

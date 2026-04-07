// src/ui/server.ts — HTTP server for the codebase-pilot web dashboard.
// Zero external deps — uses node:http only.

import { createServer, type ServerResponse } from 'node:http';
import { resolve, basename } from 'node:path';
import { URL } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import { WsServer } from './ws.js';

import { detect } from '../scanner/detector.js';
import { collectFiles } from '../packer/collector.js';
import { buildImportGraph, getReverseDependencies, computeBlastRadius } from '../intelligence/imports.js';
import { readGlobalLogs, getStats, getProjectSummaries, getRecentRuns, readPackLogs, readPromptLogs } from '../packer/usage-logger.js';
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
// Cache — collectFiles + detect are expensive; cache with 60s TTL
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 60_000;
let cachedFiles: ReturnType<typeof collectFiles> | null = null;
let cachedFilesTime = 0;
let cachedScan: { languages: Array<{ name: string; percentage: number }>; framework: string | null; testRunner: string | null } | null = null;
let cachedScanTime = 0;

function getCachedFiles(root: string): ReturnType<typeof collectFiles> {
  if (cachedFiles && Date.now() - cachedFilesTime < CACHE_TTL_MS) return cachedFiles;
  cachedFiles = collectFiles(root, {});
  cachedFilesTime = Date.now();
  return cachedFiles;
}

async function getCachedScan(root: string) {
  if (cachedScan && Date.now() - cachedScanTime < CACHE_TTL_MS) return cachedScan;
  try {
    const scan = await detect(root);
    cachedScan = {
      languages: scan.languages.map(l => ({ name: l.name, percentage: l.percentage })),
      framework: scan.framework,
      testRunner: scan.testRunner,
    };
  } catch {
    cachedScan = { languages: [], framework: null, testRunner: null };
  }
  cachedScanTime = Date.now();
  return cachedScan;
}

/** Invalidate cache (called after file changes) */
export function invalidateCache(): void {
  cachedFiles = null;
  cachedScan = null;
}

/** Pre-warm cache on startup (non-blocking) */
export function warmCache(root: string): void {
  // Run in next tick so it doesn't block server startup
  setTimeout(async () => {
    try {
      getCachedFiles(root);
      await getCachedScan(root);
      process.stderr.write('[codebase-pilot] cache warmed\n');
    } catch { /* ignore */ }
  }, 100);
}

// ---------------------------------------------------------------------------
// Data builders
// ---------------------------------------------------------------------------

async function buildDashboardData(root: string): Promise<DashboardData> {
  const projectName = basename(root);
  const files = getCachedFiles(root);
  const totalFiles = files.length;
  const totalTokens = files.reduce((s, f) => s + f.tokens, 0);

  const logs = readPackLogs(root);
  const today = getStats(logs, 1);
  const week = getStats(logs, 7);
  const month = getStats(logs, 30);
  const recentRuns = getRecentRuns(logs, 10);

  const scan = await getCachedScan(root);

  return {
    projectName,
    totalFiles,
    totalTokens,
    today,
    week,
    month,
    recentRuns,
    languages: scan.languages,
    framework: scan.framework,
    testRunner: scan.testRunner,
  };
}

function buildFilesData(root: string): FilesPageData {
  const files = getCachedFiles(root);
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

export function startUiServer(root: string, port: number): { broadcast: (event: string, data: unknown) => void; actualPort: Promise<number> } {
  // Lazily build search index on first query
  let searchIndex: ReturnType<typeof createSearchIndex> | null = null;
  function getSearchIndex() {
    if (!searchIndex) { searchIndex = createSearchIndex(root); searchIndex.rebuild(); }
    return searchIndex;
  }

  // ---------------------------------------------------------------------------
  // WebSocket server — true bidirectional socket, zero deps
  // ---------------------------------------------------------------------------
  const ws = new WsServer();

  function broadcast(event: string, data: unknown): void {
    ws.broadcast(event, data);
  }

  const server = createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${port}`);
    const pathname = url.pathname;

    try {
      // WebSocket connections handled via server 'upgrade' event below

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
        const promptLogs = readPromptLogs()
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const data: PromptsPageData = {
          runs: sorted,
          promptLogs,
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
        const files = getCachedFiles(root);
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

      if (pathname === '/api/prompt-logs') {
        const prompts = readPromptLogs();
        jsonResponse(res, { prompts: prompts.slice(-200).reverse() });
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

      if (pathname === '/api/health') {
        jsonResponse(res, {
          status: 'ok',
          project: basename(root),
          root,
          uptime: process.uptime(),
          pid: process.pid,
          node: process.version,
          platform: process.platform,
          wsClients: ws.size,
        });
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

  // WebSocket upgrade handler
  server.on('upgrade', (req, socket, head) => {
    if (req.headers.upgrade?.toLowerCase() === 'websocket') {
      ws.handleUpgrade(req, socket as import('node:net').Socket);
    } else {
      socket.destroy();
    }
  });

  // Port retry logic — try requested port, then fallback to next 20 ports
  const MAX_PORT_RETRIES = 20;
  let resolvePort: (port: number) => void;
  const actualPort = new Promise<number>((resolve) => { resolvePort = resolve; });
  let listenDone = false;

  // Single 'listening' handler — fires once when any port succeeds
  server.once('listening', () => {
    listenDone = true;
    const addr = server.address();
    const usedPort = typeof addr === 'object' && addr ? addr.port : port;
    resolvePort(usedPort);
    console.log('');
    console.log('  \x1b[36mcodebase-pilot\x1b[0m UI');
    console.log('');
    console.log(`  \x1b[1mhttp://localhost:${usedPort}\x1b[0m`);
    console.log('');
    console.log(`  Project: ${basename(root)}`);
    console.log(`  Root:    ${root}`);
    if (usedPort !== port) {
      console.log(`  Note:    Port ${port} was in use, using ${usedPort} instead`);
    }
    console.log('');
    console.log('  Press Ctrl+C to stop');
    console.log('');
  });

  function tryListen(attempt: number): void {
    if (listenDone) return;
    const tryPort = port + attempt;
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (listenDone) return;
      if (err.code === 'EADDRINUSE') {
        if (attempt < MAX_PORT_RETRIES) {
          console.error(`[codebase-pilot] Port ${tryPort} in use, trying ${tryPort + 1}...`);
          tryListen(attempt + 1);
        } else {
          console.error(`[codebase-pilot] All ports ${port}-${port + MAX_PORT_RETRIES} are in use.`);
          console.error('[codebase-pilot] Try: codebase-pilot ui --port <number>');
          process.exit(1);
        }
      } else {
        console.error(`[codebase-pilot] Server error: ${err.message}`);
        process.exit(1);
      }
    });

    server.listen(tryPort, '127.0.0.1');
  }
  tryListen(0);

  // Graceful shutdown
  function shutdown() {
    if (searchIndex) searchIndex.close();
    server.close();
    process.exit(0);
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return { broadcast, actualPort };
}

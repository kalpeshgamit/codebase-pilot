// src/ui/server.ts — HTTP server for the codebase-pilot web dashboard.
// Zero external deps — uses node:http only.

import { createServer, type ServerResponse } from 'node:http';
import { resolve, basename } from 'node:path';
import { URL } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import chokidar from 'chokidar';

import { detect } from '../scanner/detector.js';
import { collectFiles } from '../packer/collector.js';
import { buildImportGraph, getReverseDependencies, computeBlastRadius } from '../intelligence/imports.js';
import { readPackLogs, readGlobalLogs, getStats, getProjectSummaries, getRecentRuns } from '../packer/usage-logger.js';
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
  renderSecurity,
  render404,
} from './pages.js';

import type { AgentsConfig } from '../types.js';
import type { DashboardData, GraphPageData, AgentsPageData, FilesPageData, ImpactPageData, ProjectsPageData, SecurityPageData } from './pages.js';

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
    ],
    ignoreInitial: true,
    persistent: true,
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

  // Also watch usage-log for pack run events
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

      if (pathname === '/api/projects') {
        const globalLogs = readGlobalLogs();
        const allTime = getStats(globalLogs, 99999);
        const projects = getProjectSummaries(globalLogs);
        jsonResponse(res, { allTime, projects });
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

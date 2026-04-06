// src/ui/pages.ts — HTML template functions for the codebase-pilot web dashboard.
// Each function returns a self-contained HTML string. No external deps.
// NOTE: All user-provided strings are escaped via esc() before interpolation
// to prevent XSS. The search live-update uses textContent-safe patterns.

import { basename } from 'node:path';

// ---------------------------------------------------------------------------
// Theme tokens
// ---------------------------------------------------------------------------

const T = {
  bg: '#0d1117',
  surface: '#161b22',
  surfaceHover: '#1c2129',
  border: '#30363d',
  text: '#e6edf3',
  textMuted: '#8b949e',
  accent: '#58a6ff',
  success: '#3fb950',
  warning: '#d29922',
  danger: '#f85149',
  font: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  mono: "ui-monospace, 'SF Mono', 'Cascadia Code', 'Fira Code', monospace",
} as const;

// ---------------------------------------------------------------------------
// Shared layout
// ---------------------------------------------------------------------------

function layout(title: string, activePage: string, body: string, port: number, headExtra = ''): string {
  const nav = [
    { href: '/', label: 'Dashboard', icon: 'layout-dashboard' },
    { href: '/projects', label: 'Projects', icon: 'folder-kanban' },
    { href: '/graph', label: 'Graph', icon: 'git-branch' },
    { href: '/search', label: 'Search', icon: 'search' },
    { href: '/agents', label: 'Agents', icon: 'bot' },
    { href: '/files', label: 'Files', icon: 'file-code-2' },
  ];

  const navItems = nav
    .map(n => {
      const active = n.href === activePage ? ' class="active"' : '';
      return `<a href="${n.href}"${active}><i data-lucide="${n.icon}" class="nav-icon"></i>${n.label}</a>`;
    })
    .join('\n        ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} - codebase-pilot</title>
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  :root {
    --bg: #0d1117;
    --surface: #161b22;
    --surface-hover: #1c2129;
    --border: #30363d;
    --text: #e6edf3;
    --text-muted: #8b949e;
    --text-dim: #484f58;
    --accent: #3fb950;
    --success: #3fb950;
    --warning: #d29922;
    --danger: #f85149;
    --purple: #a78bfa;
    --blue: #58a6ff;
  }

  body.light {
    --bg: #ffffff;
    --surface: #f6f8fa;
    --surface-hover: #eaeef2;
    --border: #d0d7de;
    --text: #1f2328;
    --text-muted: #656d76;
    --text-dim: #8b949e;
    --accent: #1a7f37;
    --success: #1a7f37;
    --warning: #9a6700;
    --danger: #cf222e;
    --purple: #8250df;
    --blue: #0969da;
  }

  html { scroll-behavior: smooth; }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-8px); }
    to { opacity: 1; transform: translateX(0); }
  }

  @keyframes barGrow {
    from { width: 0; }
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: ${T.font};
    font-size: 14px;
    line-height: 1.5;
    display: flex;
    min-height: 100vh;
  }

  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }

  /* Sidebar */
  .sidebar {
    width: 220px;
    min-height: 100vh;
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 50;
  }

  .sidebar-brand {
    padding: 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .sidebar-brand img {
    width: 170px;
    height: auto;
    margin-bottom: 4px;
    filter: drop-shadow(0 2px 12px rgba(0,0,0,0.4));
  }

  .sidebar-brand .brand-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    color: var(--text-muted);
  }

  .sidebar nav {
    flex: 1;
    padding: 12px 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .sidebar nav a {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 8px;
    color: var(--text-muted);
    font-size: 15px;
    transition: all 0.2s ease;
    text-decoration: none;
  }

  .sidebar nav a:hover {
    background: var(--surface-hover);
    color: var(--text);
    text-decoration: none;
  }

  .sidebar nav a.active {
    background: rgba(63, 185, 80, 0.12);
    color: var(--accent);
    font-weight: 600;
    border-left: 3px solid var(--accent);
    padding-left: 11px;
  }

  .sidebar nav .nav-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    stroke: currentColor;
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .sidebar-footer {
    padding: 12px 16px;
    border-top: 1px solid var(--border);
    font-size: 11px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .theme-toggle {
    background: rgba(48, 54, 61, 0.5);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 4px 8px;
    cursor: pointer;
    color: var(--text-muted);
    font-size: 14px;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
  }

  .theme-toggle:hover {
    background: rgba(63, 185, 80, 0.15);
    color: var(--accent);
    border-color: rgba(63, 185, 80, 0.3);
  }

  /* Light theme */
  body.light {
    --bg: #ffffff;
    --surface: #f6f8fa;
    --surface-hover: #eef1f4;
    --border: #d0d7de;
    --text: #1f2328;
    --text-muted: #656d76;
    --accent: #0969da;
    --success: #1a7f37;
    --warning: #9a6700;
    --danger: #cf222e;
  }

  /* Light mode specific overrides (CSS vars handle most, these handle rgba/special cases) */
  body.light .sidebar-brand img { filter: drop-shadow(0 2px 6px rgba(0,0,0,0.08)); }
  body.light .card { background: var(--surface); border-color: var(--border); backdrop-filter: none; }
  body.light .card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
  body.light .table-wrap { background: var(--surface); backdrop-filter: none; }
  body.light .badge-blue { background: rgba(26,127,55,0.1); }
  body.light .badge-green { background: rgba(26,127,55,0.1); }
  body.light .badge-yellow { background: rgba(154,103,0,0.1); }
  body.light .badge-red { background: rgba(207,34,46,0.1); }
  body.light .search-box { background: var(--surface); color: var(--text); }
  body.light .search-result { background: var(--surface); border-color: var(--border); }
  body.light a { color: var(--accent); }

  /* Main content */
  .main {
    flex: 1;
    margin-left: 220px;
    padding: 28px 36px;
    min-height: 100vh;
    animation: fadeIn 0.3s ease both;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .sidebar { width: 60px; }
    .sidebar nav a span:not(.nav-icon) { display: none; }
    .sidebar-brand span:not(.plane) { display: none; }
    .sidebar-footer { display: none; }
    .main { margin-left: 60px; padding: 20px 16px; }
    .cards { grid-template-columns: 1fr 1fr; }
  }

  .page-title {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 24px;
    letter-spacing: -0.01em;
    color: var(--text);
    animation: fadeIn 0.3s ease both;
  }

  /* Cards */
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 28px;
  }

  .card {
    background: rgba(22, 27, 34, 0.8);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(48, 54, 61, 0.5);
    border-radius: 12px;
    padding: 20px;
    transition: all 0.2s ease;
    animation: fadeIn 0.4s ease both;
  }

  .card:nth-child(1) { animation-delay: 0.05s; }
  .card:nth-child(2) { animation-delay: 0.1s; }
  .card:nth-child(3) { animation-delay: 0.15s; }
  .card:nth-child(4) { animation-delay: 0.2s; }

  .card:hover {
    transform: translateY(-2px);
    border-color: rgba(63, 185, 80, 0.3);
    box-shadow: 0 4px 24px rgba(63, 185, 80, 0.08);
  }

  .card-label {
    font-size: 12px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }

  .card-value {
    font-size: 2.2rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text);
    font-family: ${T.mono};
  }

  .card-sub {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 4px;
  }

  /* Tables */
  .table-wrap {
    background: rgba(22, 27, 34, 0.8);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(48, 54, 61, 0.5);
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 24px;
    animation: fadeIn 0.5s ease both;
    animation-delay: 0.2s;
  }

  .table-wrap h3 {
    padding: 14px 20px;
    font-size: 14px;
    font-weight: 600;
    border-bottom: 1px solid var(--border);
    color: var(--text);
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  thead th {
    text-align: left;
    padding: 10px 16px;
    font-size: 12px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.4px;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
  }

  thead th:hover { color: var(--text); }

  tbody td {
    padding: 10px 16px;
    font-size: 13px;
    border-bottom: 1px solid var(--border);
  }

  tbody tr:last-child td { border-bottom: none; }

  tbody tr:hover { background: var(--surface-hover); }

  .mono { font-family: ${T.mono}; font-size: 12px; }

  /* Bar */
  .bar-bg {
    height: 6px;
    background: var(--border);
    border-radius: 3px;
    overflow: hidden;
    min-width: 80px;
  }

  .bar-fill {
    height: 100%;
    border-radius: 3px;
    background: linear-gradient(90deg, var(--accent), #2ea043);
    animation: barGrow 0.8s ease both;
  }

  /* Badge */
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 500;
  }

  .badge-blue { background: rgba(63,185,80,0.12); color: var(--accent); }
  .badge-green { background: rgba(63,185,80,0.15); color: var(--success); border: 1px solid rgba(63,185,80,0.25); }
  .badge-yellow { background: rgba(210,153,34,0.15); color: var(--warning); }
  .badge-red { background: rgba(248,81,73,0.15); color: var(--danger); }

  /* Savings chart */
  .savings-chart {
    display: flex;
    gap: 24px;
    margin-bottom: 28px;
  }

  .savings-bar {
    flex: 1;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 16px 20px;
  }

  .savings-bar-label {
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 8px;
  }

  .savings-bar-track {
    height: 24px;
    background: var(--border);
    border-radius: 4px;
    overflow: hidden;
    display: flex;
  }

  .savings-bar-used {
    height: 100%;
    background: var(--accent);
  }

  .savings-bar-saved {
    height: 100%;
    background: var(--success);
  }

  .savings-bar-legend {
    display: flex;
    gap: 16px;
    margin-top: 8px;
    font-size: 11px;
    color: var(--text-muted);
  }

  .savings-bar-legend span::before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 2px;
    margin-right: 4px;
    vertical-align: middle;
  }

  .legend-used::before { background: var(--accent) !important; }
  .legend-saved::before { background: var(--success) !important; }

  /* Section */
  .section {
    margin-bottom: 28px;
  }

  .section-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 12px;
    color: var(--text);
  }

  /* Search */
  .search-box {
    width: 100%;
    max-width: 600px;
    padding: 12px 16px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-size: 15px;
    font-family: ${T.font};
    outline: none;
    transition: border-color 0.2s;
    margin-bottom: 20px;
  }

  .search-box:focus { border-color: var(--accent); }
  .search-box::placeholder { color: var(--text-muted); }

  .search-result {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 16px 20px;
    margin-bottom: 8px;
    transition: border-color 0.2s;
  }

  .search-result:hover { border-color: var(--accent); }

  .search-result-path {
    font-family: ${T.mono};
    font-size: 13px;
    color: var(--accent);
    margin-bottom: 4px;
  }

  .search-result-snippet {
    font-family: ${T.mono};
    font-size: 12px;
    color: var(--text-muted);
    white-space: pre-wrap;
    word-break: break-all;
  }

  .search-result-snippet mark {
    background: rgba(210, 153, 34, 0.3);
    color: var(--warning);
    border-radius: 2px;
    padding: 0 2px;
  }

  .search-result-meta {
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 4px;
    display: flex;
    gap: 16px;
  }

  .empty-state {
    text-align: center;
    padding: 48px 24px;
    color: var(--text-muted);
    font-size: 14px;
  }

  /* Agents */
  .agent-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 12px;
  }

  .agent-card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
  }

  .agent-card-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
  }

  .agent-card-task {
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 10px;
  }

  .agent-card-details {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 12px;
  }

  .agent-context {
    font-family: ${T.mono};
    font-size: 11px;
    background: rgba(88,166,255,0.08);
    padding: 2px 8px;
    border-radius: 4px;
    color: var(--accent);
  }

  /* Layer diagram */
  .layer-diagram {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 24px;
    margin-bottom: 24px;
  }

  .layer-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .layer-label {
    width: 60px;
    font-size: 12px;
    color: var(--text-muted);
    text-align: right;
    flex-shrink: 0;
  }

  .layer-items {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .layer-item {
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
  }

  /* Impact */
  .risk-meter {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }

  .risk-meter-bar {
    flex: 1;
    max-width: 300px;
    height: 12px;
    background: var(--border);
    border-radius: 6px;
    overflow: hidden;
  }

  .risk-meter-fill {
    height: 100%;
    border-radius: 6px;
    transition: width 0.3s;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
    margin-bottom: 20px;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .sidebar { display: none; }
    .main { margin-left: 0; padding: 16px; }
    .cards { grid-template-columns: 1fr 1fr; }
    .savings-chart { flex-direction: column; }
  }
</style>
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
${headExtra}
</head>
<body>
  <aside class="sidebar">
    <div class="sidebar-brand">
      <img src="/static/logo.png" alt="codebase-pilot" onerror="this.style.display='none'" />
    </div>
    <nav>
      ${navItems}
    </nav>
    <div class="sidebar-footer">
      <div>v0.2.0 &middot; localhost:${port}</div>
      <button class="theme-toggle" onclick="toggleTheme()" title="Toggle light/dark mode">
        <i data-lucide="moon" class="theme-icon-dark" style="width:14px;height:14px;"></i>
        <i data-lucide="sun" class="theme-icon-light" style="width:14px;height:14px;display:none;"></i>
      </button>
    </div>
  </aside>
  <main class="main">
    ${body}
  </main>
<script>
function toggleTheme() {
  var isLight = document.body.classList.toggle('light');
  localStorage.setItem('cp-theme', isLight ? 'light' : 'dark');
  document.querySelectorAll('.theme-icon-dark').forEach(function(el) { el.style.display = isLight ? 'none' : ''; });
  document.querySelectorAll('.theme-icon-light').forEach(function(el) { el.style.display = isLight ? '' : 'none'; });
}
(function() {
  var saved = localStorage.getItem('cp-theme');
  if (saved === 'light') {
    document.body.classList.add('light');
    document.querySelectorAll('.theme-icon-dark').forEach(function(el) { el.style.display = 'none'; });
    document.querySelectorAll('.theme-icon-light').forEach(function(el) { el.style.display = ''; });
  }
  // Initialize Lucide icons
  if (window.lucide) lucide.createIcons();
})();
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Escape HTML special characters to prevent XSS */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtNum(n: number): string {
  return n.toLocaleString('en-US');
}

function riskColor(level: string): string {
  if (level === 'critical') return T.danger;
  if (level === 'high') return T.danger;
  if (level === 'medium') return T.warning;
  return T.success;
}

function modelBadge(model: string): string {
  if (model === 'opus') return `<span class="badge badge-red">${esc(model)}</span>`;
  if (model === 'sonnet') return `<span class="badge badge-yellow">${esc(model)}</span>`;
  return `<span class="badge badge-green">${esc(model)}</span>`;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface DashboardData {
  projectName: string;
  totalFiles: number;
  totalTokens: number;
  today: { sessions: number; tokensSaved: number; tokensUsed: number };
  week: { sessions: number; tokensSaved: number; tokensUsed: number };
  month: { sessions: number; tokensSaved: number; tokensUsed: number };
  recentRuns: Array<{
    date: string;
    project: string;
    command: string;
    files: number;
    tokensRaw: number;
    tokensPacked: number;
    compressed: boolean;
    agent?: string;
  }>;
  languages: Array<{ name: string; percentage: number }>;
  framework: string | null;
  testRunner: string | null;
}

export function renderDashboard(data: DashboardData, port: number): string {
  const statCards = `
    <div class="cards">
      <div class="card">
        <div class="card-label">Total Files</div>
        <div class="card-value">${fmtNum(data.totalFiles)}</div>
      </div>
      <div class="card">
        <div class="card-label">Total Tokens</div>
        <div class="card-value">${fmtNum(data.totalTokens)}</div>
      </div>
      <div class="card">
        <div class="card-label">Sessions Today</div>
        <div class="card-value">${fmtNum(data.today.sessions)}</div>
      </div>
      <div class="card">
        <div class="card-label">Tokens Saved This Week</div>
        <div class="card-value">${fmtNum(data.week.tokensSaved)}</div>
        <div class="card-sub">${fmtNum(data.week.tokensUsed)} used</div>
      </div>
    </div>`;

  // Savings bars
  const maxTokens = Math.max(
    data.today.tokensUsed + data.today.tokensSaved,
    data.week.tokensUsed + data.week.tokensSaved,
    data.month.tokensUsed + data.month.tokensSaved,
    1,
  );

  function savingsBar(label: string, used: number, saved: number): string {
    const total = used + saved;
    const pctUsed = total > 0 ? (used / maxTokens) * 100 : 0;
    const pctSaved = total > 0 ? (saved / maxTokens) * 100 : 0;
    return `
      <div class="savings-bar">
        <div class="savings-bar-label">${label}</div>
        <div class="savings-bar-track">
          <div class="savings-bar-used" style="width:${pctUsed.toFixed(1)}%"></div>
          <div class="savings-bar-saved" style="width:${pctSaved.toFixed(1)}%"></div>
        </div>
        <div class="savings-bar-legend">
          <span class="legend-used">${fmtNum(used)} used</span>
          <span class="legend-saved">${fmtNum(saved)} saved</span>
        </div>
      </div>`;
  }

  const savingsChart = `
    <div class="savings-chart">
      ${savingsBar('Today', data.today.tokensUsed, data.today.tokensSaved)}
      ${savingsBar('This Week', data.week.tokensUsed, data.week.tokensSaved)}
      ${savingsBar('This Month', data.month.tokensUsed, data.month.tokensSaved)}
    </div>`;

  // Recent sessions
  let recentTable = '';
  if (data.recentRuns.length > 0) {
    const rows = data.recentRuns.slice(0, 10).map(r => {
      const d = new Date(r.date);
      const saved = r.tokensRaw - r.tokensPacked;
      const pct = r.tokensRaw > 0 ? Math.round((saved / r.tokensRaw) * 100) : 0;
      const compress = r.compressed ? ' <span class="badge badge-green">compressed</span>' : '';
      const agent = r.agent ? ` <span class="badge badge-blue">${esc(r.agent)}</span>` : '';
      return `<tr>
        <td class="mono">${esc(d.toLocaleString())}</td>
        <td>${esc(r.command || 'pack')}${compress}${agent}</td>
        <td class="mono">${r.files}</td>
        <td class="mono">${fmtNum(r.tokensRaw)}</td>
        <td class="mono">${fmtNum(r.tokensPacked)}</td>
        <td class="mono" style="color:var(--success)">${fmtNum(saved)} (${pct}%)</td>
      </tr>`;
    }).join('');

    recentTable = `
      <div class="table-wrap">
        <h3>Recent Sessions</h3>
        <table>
          <thead><tr>
            <th>Time</th><th>Command</th><th>Files</th><th>Raw</th><th>Packed</th><th>Saved</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  // Project info
  const langTags = data.languages.map(l =>
    `<span class="badge badge-blue">${esc(l.name)} ${l.percentage}%</span>`
  ).join(' ');

  const projectInfo = `
    <div class="section">
      <div class="section-title">Project Info</div>
      <div style="display:flex;gap:24px;flex-wrap:wrap;font-size:13px;">
        <div><span style="color:var(--text-muted)">Languages:</span> ${langTags || 'N/A'}</div>
        <div><span style="color:var(--text-muted)">Framework:</span> ${data.framework ? esc(data.framework) : 'None detected'}</div>
        <div><span style="color:var(--text-muted)">Test runner:</span> ${data.testRunner ? esc(data.testRunner) : 'None detected'}</div>
      </div>
    </div>`;

  const sseScript = `
    <div id="live-badge" style="display:none;position:fixed;top:16px;right:24px;
      background:rgba(63,185,80,0.15);color:var(--success);padding:4px 12px;
      border-radius:20px;font-size:11px;font-weight:500;z-index:100;
      animation:fadeIn 0.3s ease;backdrop-filter:blur(8px);
      border:1px solid rgba(63,185,80,0.3);">
      <span style="display:inline-block;width:6px;height:6px;background:var(--success);
        border-radius:50%;margin-right:6px;animation:pulse 2s infinite;"></span>Live
    </div>
    <style>@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}</style>
    <script>
    (function() {
      var es = new EventSource('/api/events');
      var badge = document.getElementById('live-badge');

      es.addEventListener('connected', function() {
        if (badge) badge.style.display = 'inline-flex';
      });

      es.addEventListener('stats-update', function(e) {
        try {
          var d = JSON.parse(e.data);
          var cards = document.querySelectorAll('.card-value');
          if (cards[0] && d.totalFiles) cards[0].textContent = Number(d.totalFiles).toLocaleString();
          if (cards[1] && d.totalTokens) cards[1].textContent = Number(d.totalTokens).toLocaleString();
          if (cards[2] && d.today) cards[2].textContent = Number(d.today.sessions).toLocaleString();
          if (cards[3] && d.week) cards[3].textContent = Number(d.week.tokensSaved).toLocaleString();

          // Flash updated cards
          cards.forEach(function(c) {
            c.style.transition = 'color 0.3s';
            c.style.color = 'var(--success)';
            setTimeout(function() { c.style.color = ''; }, 1500);
          });
        } catch(err) {}
      });

      es.addEventListener('file-change', function(e) {
        try {
          var d = JSON.parse(e.data);
          var toast = document.createElement('div');
          toast.style.cssText = 'position:fixed;bottom:20px;right:24px;background:rgba(22,27,34,0.95);color:var(--text);padding:10px 16px;border-radius:8px;font-size:12px;z-index:100;animation:fadeIn 0.3s ease;border:1px solid var(--border);backdrop-filter:blur(12px);font-family:${T.mono};';
          toast.textContent = d.event + ': ' + d.file;
          document.body.appendChild(toast);
          setTimeout(function() { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; }, 3000);
          setTimeout(function() { toast.remove(); }, 3500);
        } catch(err) {}
      });

      es.onerror = function() {
        if (badge) badge.style.display = 'none';
      };
    })();
    </script>`;

  const body = `
    <h1 class="page-title">${esc(data.projectName)}</h1>
    ${statCards}
    ${savingsChart}
    ${recentTable}
    ${projectInfo}
    ${sseScript}`;

  return layout('Dashboard', '/', body, port);
}

// ---------------------------------------------------------------------------
// Graph
// ---------------------------------------------------------------------------

export interface GraphPageData {
  nodes: Array<{ id: string; tokens: number; language: string | null; group: string }>;
  edges: Array<{ source: string; target: string }>;
  projectName: string;
}

export function renderGraph(data: GraphPageData, port: number): string {
  // Graph data is safe — comes from internal buildGraphData, not user input.
  // We serialize it as JSON which auto-escapes strings.
  const graphJson = JSON.stringify({ nodes: data.nodes, edges: data.edges });

  const graphScript = `
<script src="https://d3js.org/d3.v7.min.js"><\/script>
<script>
(function() {
  var data = ${graphJson};
  var container = document.getElementById('graph-container');
  var searchBox = document.getElementById('graph-search');
  var width = container.clientWidth;
  var height = container.clientHeight;

  var svg = d3.select('#graph-container')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  var g = svg.append('g');

  svg.call(d3.zoom().on('zoom', function(e) { g.attr('transform', e.transform); }));

  var groupColors = {};
  var palette = ['var(--accent)', 'var(--success)', 'var(--warning)', 'var(--danger)', '#bc8cff', '#f778ba', '#79c0ff', '#7ee787'];
  var ci = 0;
  data.nodes.forEach(function(n) {
    if (!groupColors[n.group]) groupColors[n.group] = palette[ci++ % palette.length];
  });

  var sim = d3.forceSimulation(data.nodes)
    .force('link', d3.forceLink(data.edges).id(function(d) { return d.id; }).distance(60))
    .force('charge', d3.forceManyBody().strength(-120))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(function(d) { return Math.sqrt(d.tokens / 50) + 8; }));

  var link = g.append('g')
    .selectAll('line')
    .data(data.edges)
    .join('line')
    .attr('stroke', 'var(--border)')
    .attr('stroke-width', 1)
    .attr('stroke-opacity', 0.6);

  var node = g.append('g')
    .selectAll('circle')
    .data(data.nodes)
    .join('circle')
    .attr('r', function(d) { return Math.max(4, Math.sqrt(d.tokens / 50) + 3); })
    .attr('fill', function(d) { return groupColors[d.group] || 'var(--accent)'; })
    .attr('stroke', '#0d1117')
    .attr('stroke-width', 1.5)
    .style('cursor', 'pointer')
    .call(d3.drag()
      .on('start', function(e, d) { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', function(e, d) { d.fx = e.x; d.fy = e.y; })
      .on('end', function(e, d) { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
    );

  var tooltipEl = document.getElementById('graph-tooltip');

  node.on('mouseover', function(e, d) {
    tooltipEl.style.display = 'block';
    tooltipEl.textContent = '';
    var b = document.createElement('strong');
    b.textContent = d.id;
    tooltipEl.appendChild(b);
    tooltipEl.appendChild(document.createElement('br'));
    tooltipEl.appendChild(document.createTextNode(d.tokens + ' tokens'));
    tooltipEl.appendChild(document.createElement('br'));
    tooltipEl.appendChild(document.createTextNode('group: ' + d.group));
    d3.select(e.target).attr('stroke', 'var(--accent)').attr('stroke-width', 2.5);
  }).on('mousemove', function(e) {
    tooltipEl.style.left = (e.pageX + 12) + 'px';
    tooltipEl.style.top = (e.pageY - 12) + 'px';
  }).on('mouseout', function(e) {
    tooltipEl.style.display = 'none';
    d3.select(e.target).attr('stroke', '#0d1117').attr('stroke-width', 1.5);
  }).on('click', function(e, d) {
    window.location.href = '/impact?file=' + encodeURIComponent(d.id);
  });

  sim.on('tick', function() {
    link
      .attr('x1', function(d) { return d.source.x; }).attr('y1', function(d) { return d.source.y; })
      .attr('x2', function(d) { return d.target.x; }).attr('y2', function(d) { return d.target.y; });
    node.attr('cx', function(d) { return d.x; }).attr('cy', function(d) { return d.y; });
  });

  searchBox.addEventListener('input', function() {
    var q = searchBox.value.toLowerCase();
    node.attr('opacity', function(d) { return !q || d.id.toLowerCase().indexOf(q) !== -1 ? 1 : 0.1; });
    link.attr('opacity', function(d) {
      if (!q) return 0.6;
      var s = (typeof d.source === 'object' ? d.source.id : d.source).toLowerCase();
      var t = (typeof d.target === 'object' ? d.target.id : d.target).toLowerCase();
      return s.indexOf(q) !== -1 || t.indexOf(q) !== -1 ? 0.6 : 0.05;
    });
  });

  document.getElementById('graph-stats').textContent = data.nodes.length + ' nodes, ' + data.edges.length + ' edges';
})();
<\/script>`;

  const body = `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;">
      <h1 class="page-title" style="margin-bottom:0">Import Graph</h1>
      <span id="graph-stats" class="mono" style="color:var(--text-muted);font-size:12px;"></span>
    </div>
    <input type="text" id="graph-search" class="search-box" placeholder="Filter nodes..." style="margin-bottom:12px;">
    <div id="graph-container" style="width:100%;height:calc(100vh - 140px);background:var(--surface);border:1px solid var(--border);border-radius:8px;position:relative;overflow:hidden;"></div>
    <div id="graph-tooltip" style="display:none;position:fixed;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px 12px;font-size:12px;pointer-events:none;z-index:100;color:var(--text);max-width:400px;"></div>
    ${graphScript}`;

  return layout('Graph', '/graph', body, port);
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export function renderSearch(query: string, results: Array<{ path: string; snippet: string; score: number; line: number; language: string | null; tokens: number }>, port: number): string {
  let resultsHtml: string;

  if (!query) {
    resultsHtml = '<div class="empty-state">Type a query above to search across the codebase.</div>';
  } else if (results.length === 0) {
    resultsHtml = `<div class="empty-state">No results found for "${esc(query)}".</div>`;
  } else {
    resultsHtml = results.map(r => {
      const escapedSnippet = esc(r.snippet);
      const escapedQuery = esc(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const highlighted = escapedSnippet.replace(
        new RegExp(escapedQuery, 'gi'),
        match => `<mark>${match}</mark>`,
      );
      return `
        <div class="search-result">
          <div class="search-result-path">
            <a href="/impact?file=${encodeURIComponent(r.path)}">${esc(r.path)}</a>
          </div>
          <div class="search-result-snippet">${highlighted}</div>
          <div class="search-result-meta">
            <span>Line ${r.line}</span>
            <span>Score: ${r.score.toFixed(2)}</span>
            ${r.language ? `<span>${esc(r.language)}</span>` : ''}
            <span>${fmtNum(r.tokens)} tokens</span>
          </div>
        </div>`;
    }).join('');
  }

  // The live search script builds DOM elements using textContent (safe)
  // and only uses the server-returned JSON data.
  const liveSearchScript = `
<script>
(function() {
  var input = document.getElementById('search-input');
  var container = document.getElementById('search-results');
  var timer;

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.textContent.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function buildResultDom(r, query) {
    var div = document.createElement('div');
    div.className = 'search-result';

    var pathDiv = document.createElement('div');
    pathDiv.className = 'search-result-path';
    var pathLink = document.createElement('a');
    pathLink.href = '/impact?file=' + encodeURIComponent(r.path);
    pathLink.textContent = r.path;
    pathDiv.appendChild(pathLink);
    div.appendChild(pathDiv);

    var snippetDiv = document.createElement('div');
    snippetDiv.className = 'search-result-snippet';
    // Highlight matching text safely
    var escapedSnippet = escapeHtml(r.snippet);
    var re = new RegExp(query.replace(/[.*+?^$\x7b\x7d()|[\\]\\\\]/g, '\\\\$&'), 'gi');
    snippetDiv.innerHTML = escapedSnippet.replace(re, function(m) { return '<mark>' + m + '</mark>'; });
    div.appendChild(snippetDiv);

    var metaDiv = document.createElement('div');
    metaDiv.className = 'search-result-meta';
    var lineSpan = document.createElement('span');
    lineSpan.textContent = 'Line ' + r.line;
    metaDiv.appendChild(lineSpan);
    var scoreSpan = document.createElement('span');
    scoreSpan.textContent = 'Score: ' + r.score.toFixed(2);
    metaDiv.appendChild(scoreSpan);
    if (r.language) {
      var langSpan = document.createElement('span');
      langSpan.textContent = r.language;
      metaDiv.appendChild(langSpan);
    }
    var tokSpan = document.createElement('span');
    tokSpan.textContent = r.tokens.toLocaleString() + ' tokens';
    metaDiv.appendChild(tokSpan);
    div.appendChild(metaDiv);

    return div;
  }

  input.addEventListener('input', function() {
    clearTimeout(timer);
    timer = setTimeout(function() {
      var q = input.value.trim();
      if (!q) {
        container.textContent = '';
        var empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = 'Type a query above to search across the codebase.';
        container.appendChild(empty);
        history.replaceState(null, '', '/search');
        return;
      }
      history.replaceState(null, '', '/search?q=' + encodeURIComponent(q));
      fetch('/api/search?q=' + encodeURIComponent(q))
        .then(function(res) { return res.json(); })
        .then(function(data) {
          container.textContent = '';
          if (data.results.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.textContent = 'No results found for "' + q + '".';
            container.appendChild(empty);
            return;
          }
          data.results.forEach(function(r) {
            container.appendChild(buildResultDom(r, q));
          });
        })
        .catch(function(e) {
          container.textContent = '';
          var err = document.createElement('div');
          err.className = 'empty-state';
          err.textContent = 'Search error: ' + e.message;
          container.appendChild(err);
        });
    }, 250);
  });
})();
<\/script>`;

  const body = `
    <h1 class="page-title">Search</h1>
    <input type="text" id="search-input" class="search-box" placeholder="Search files, functions, symbols..." value="${esc(query)}" autofocus>
    <div id="search-results">
      ${resultsHtml}
    </div>
    ${liveSearchScript}`;

  return layout('Search', '/search', body, port);
}

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

export interface AgentsPageData {
  agents: Array<{
    name: string;
    model: string;
    layer: number;
    task: string;
    context: string[];
    dependsOn: string[];
  }>;
  projectName: string;
}

export function renderAgents(data: AgentsPageData, port: number): string {
  if (data.agents.length === 0) {
    const body = `
      <h1 class="page-title">Agents</h1>
      <div class="empty-state">
        No agents configured.<br>
        Run <code style="font-family:${T.mono};color:var(--accent)">codebase-pilot init</code> to generate agents.json.
      </div>`;
    return layout('Agents', '/agents', body, port);
  }

  // Layer diagram
  const maxLayer = Math.max(...data.agents.map(a => a.layer));
  const layerColors = [T.accent, T.success, T.warning, T.danger, '#bc8cff'];

  let layerDiagram = '<div class="layer-diagram"><div class="section-title" style="margin-bottom:16px;">Layer Architecture</div>';
  for (let l = 0; l <= maxLayer; l++) {
    const agents = data.agents.filter(a => a.layer === l);
    if (agents.length === 0) continue;
    const color = layerColors[l % layerColors.length];
    const items = agents.map(a =>
      `<span class="layer-item" style="background:${color}22;color:${color};border:1px solid ${color}44;">${esc(a.name)}</span>`
    ).join('');
    layerDiagram += `
      <div class="layer-row">
        <div class="layer-label">Layer ${l}</div>
        <div class="layer-items">${items}</div>
      </div>`;
  }
  layerDiagram += '</div>';

  // Agent cards
  const cards = data.agents.map(a => {
    const deps = a.dependsOn.length > 0
      ? a.dependsOn.map(d => `<span class="badge badge-yellow">${esc(d)}</span>`).join(' ')
      : `<span style="color:var(--text-muted);font-size:12px;">none</span>`;
    const ctx = a.context.map(c => `<span class="agent-context">${esc(c)}</span>`).join(' ');
    return `
      <div class="agent-card">
        <div class="agent-card-header">
          <span class="agent-card-name">${esc(a.name)}</span>
          ${modelBadge(a.model)}
          <span class="badge badge-blue">layer ${a.layer}</span>
        </div>
        <div class="agent-card-task">${esc(a.task)}</div>
        <div class="agent-card-details">
          <div style="margin-right:16px;">
            <div style="color:var(--text-muted);font-size:11px;margin-bottom:4px;">Context</div>
            ${ctx || `<span style="color:var(--text-muted);font-size:12px;">none</span>`}
          </div>
          <div>
            <div style="color:var(--text-muted);font-size:11px;margin-bottom:4px;">Depends on</div>
            ${deps}
          </div>
        </div>
      </div>`;
  }).join('');

  const body = `
    <h1 class="page-title">Agents</h1>
    ${layerDiagram}
    ${cards}`;

  return layout('Agents', '/agents', body, port);
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

export interface FilesPageData {
  files: Array<{ relativePath: string; language: string | null; tokens: number }>;
  totalTokens: number;
}

export function renderFiles(data: FilesPageData, port: number): string {
  const sorted = [...data.files].sort((a, b) => b.tokens - a.tokens);
  const maxTokens = sorted.length > 0 ? sorted[0].tokens : 1;

  const rows = sorted.map(f => {
    const pct = data.totalTokens > 0 ? ((f.tokens / data.totalTokens) * 100).toFixed(1) : '0.0';
    const barPct = ((f.tokens / maxTokens) * 100).toFixed(1);
    return `<tr>
      <td class="mono"><a href="/impact?file=${encodeURIComponent(f.relativePath)}">${esc(f.relativePath)}</a></td>
      <td>${f.language ? esc(f.language) : `<span style="color:var(--text-muted)">-</span>`}</td>
      <td class="mono" style="text-align:right;">${fmtNum(f.tokens)}</td>
      <td style="text-align:right;">${pct}%</td>
      <td><div class="bar-bg"><div class="bar-fill" style="width:${barPct}%"></div></div></td>
    </tr>`;
  }).join('');

  const sortScript = `
<script>
(function() {
  var table = document.querySelector('#files-table');
  var headers = table.querySelectorAll('thead th');
  var sortCol = 2;
  var sortAsc = false;

  headers.forEach(function(th, i) {
    th.addEventListener('click', function() {
      if (sortCol === i) { sortAsc = !sortAsc; } else { sortCol = i; sortAsc = i === 0; }
      var tbody = table.querySelector('tbody');
      var rows = Array.from(tbody.querySelectorAll('tr'));
      rows.sort(function(a, b) {
        var av = a.children[i].textContent.trim();
        var bv = b.children[i].textContent.trim();
        if (i >= 2) {
          av = parseFloat(av.replace(/,/g, '')) || 0;
          bv = parseFloat(bv.replace(/,/g, '')) || 0;
          return sortAsc ? av - bv : bv - av;
        }
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      });
      rows.forEach(function(r) { tbody.appendChild(r); });
    });
  });
})();
<\/script>`;

  const body = `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
      <h1 class="page-title" style="margin-bottom:0">Files</h1>
      <span class="mono" style="color:var(--text-muted);font-size:12px;">${fmtNum(data.files.length)} files, ${fmtNum(data.totalTokens)} tokens total</span>
    </div>
    <div class="table-wrap">
      <table id="files-table">
        <thead><tr>
          <th>Path</th>
          <th>Language</th>
          <th style="text-align:right;">Tokens</th>
          <th style="text-align:right;">% Total</th>
          <th style="width:120px;"></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${sortScript}`;

  return layout('Files', '/files', body, port);
}

// ---------------------------------------------------------------------------
// Impact (blast radius)
// ---------------------------------------------------------------------------

export interface ImpactPageData {
  file: string;
  directDependents: string[];
  transitiveDependents: string[];
  affectedTests: string[];
  riskScore: number;
  riskLevel: string;
}

export function renderImpact(data: ImpactPageData, port: number): string {
  const color = riskColor(data.riskLevel);
  const riskBadgeClass = data.riskLevel === 'low' ? 'badge-green'
    : data.riskLevel === 'medium' ? 'badge-yellow'
    : 'badge-red';

  const depList = (items: string[], label: string) => {
    if (items.length === 0) return `<div class="section"><div class="section-title">${label} (0)</div><div style="color:var(--text-muted);font-size:13px;">None</div></div>`;
    const list = items.map(f =>
      `<div style="padding:4px 0;"><a href="/impact?file=${encodeURIComponent(f)}" class="mono" style="font-size:12px;">${esc(f)}</a></div>`
    ).join('');
    return `<div class="section"><div class="section-title">${label} (${items.length})</div>${list}</div>`;
  };

  const body = `
    <h1 class="page-title">Impact Analysis</h1>
    <div style="font-family:${T.mono};font-size:14px;color:var(--accent);margin-bottom:20px;">${esc(data.file)}</div>

    <div class="info-grid">
      <div class="card">
        <div class="card-label">Risk Score</div>
        <div class="card-value" style="color:${color}">${data.riskScore}</div>
      </div>
      <div class="card">
        <div class="card-label">Risk Level</div>
        <div class="card-value"><span class="badge ${riskBadgeClass}" style="font-size:14px;">${esc(data.riskLevel)}</span></div>
      </div>
      <div class="card">
        <div class="card-label">Direct Dependents</div>
        <div class="card-value">${data.directDependents.length}</div>
      </div>
      <div class="card">
        <div class="card-label">Total Affected</div>
        <div class="card-value">${data.transitiveDependents.length}</div>
      </div>
    </div>

    <div class="risk-meter">
      <span style="font-size:12px;color:var(--text-muted);">Risk</span>
      <div class="risk-meter-bar">
        <div class="risk-meter-fill" style="width:${data.riskScore}%;background:${color};"></div>
      </div>
      <span style="font-size:12px;color:${color};">${data.riskScore}/100</span>
    </div>

    ${depList(data.directDependents, 'Direct Dependents')}
    ${depList(data.transitiveDependents, 'All Transitive Dependents')}
    ${depList(data.affectedTests, 'Affected Tests')}`;

  return layout('Impact', '', body, port);
}

// ---------------------------------------------------------------------------
// Projects (system-wide consolidated view)
// ---------------------------------------------------------------------------

export interface ProjectsPageData {
  today: { sessions: number; tokensSaved: number; tokensUsed: number };
  week: { sessions: number; tokensSaved: number; tokensUsed: number };
  month: { sessions: number; tokensSaved: number; tokensUsed: number };
  allTime: { sessions: number; tokensSaved: number; tokensUsed: number };
  projects: Array<{
    project: string;
    projectPath: string;
    sessions: number;
    tokensSaved: number;
    tokensUsed: number;
    lastUsed: string;
  }>;
  recentRuns: Array<{
    date: string;
    project: string;
    tokensRaw: number;
    tokensPacked: number;
    files: number;
    compressed: boolean;
    agent?: string;
    command: string;
  }>;
  currentProject: string;
}

export function renderProjects(data: ProjectsPageData, port: number): string {
  // System-wide stat cards
  const cards = `
    <div class="cards">
      <div class="card" style="border-top:2px solid var(--accent);">
        <div class="card-label">Total Projects</div>
        <div class="card-value">${data.projects.length}</div>
      </div>
      <div class="card" style="border-top:2px solid var(--success);">
        <div class="card-label">Total Sessions</div>
        <div class="card-value">${fmtNum(data.allTime.sessions)}</div>
      </div>
      <div class="card" style="border-top:2px solid var(--warning);">
        <div class="card-label">Tokens Saved (All Time)</div>
        <div class="card-value">${fmtNum(data.allTime.tokensSaved)}</div>
      </div>
      <div class="card" style="border-top:2px solid #8b5cf6;">
        <div class="card-label">Tokens Used (All Time)</div>
        <div class="card-value">${fmtNum(data.allTime.tokensUsed)}</div>
      </div>
    </div>`;

  // Savings period comparison
  const maxS = Math.max(data.today.tokensSaved + data.today.tokensUsed, data.week.tokensSaved + data.week.tokensUsed, data.month.tokensSaved + data.month.tokensUsed, 1);
  function periodBar(label: string, saved: number, used: number): string {
    const total = saved + used;
    const pS = total > 0 ? (saved / maxS) * 100 : 0;
    const pU = total > 0 ? (used / maxS) * 100 : 0;
    return `<div class="savings-bar">
      <div class="savings-bar-label">${label}</div>
      <div class="savings-bar-track">
        <div class="savings-bar-used" style="width:${pU.toFixed(1)}%"></div>
        <div class="savings-bar-saved" style="width:${pS.toFixed(1)}%"></div>
      </div>
      <div class="savings-bar-legend">
        <span class="legend-used">${fmtNum(used)} used</span>
        <span class="legend-saved">${fmtNum(saved)} saved</span>
      </div>
    </div>`;
  }

  const savingsChart = `
    <div class="savings-chart">
      ${periodBar('Today', data.today.tokensSaved, data.today.tokensUsed)}
      ${periodBar('This Week', data.week.tokensSaved, data.week.tokensUsed)}
      ${periodBar('This Month', data.month.tokensSaved, data.month.tokensUsed)}
    </div>`;

  // Projects table
  let projectRows = '';
  if (data.projects.length > 0) {
    const rows = data.projects.map(p => {
      const lastDate = new Date(p.lastUsed).toLocaleDateString();
      const savePct = p.tokensSaved + p.tokensUsed > 0 ? Math.round((p.tokensSaved / (p.tokensSaved + p.tokensUsed)) * 100) : 0;
      const isActive = p.projectPath === data.currentProject;
      const activeTag = isActive ? ' <span class="badge badge-green">active</span>' : '';
      return `<tr>
        <td><strong>${esc(p.project)}</strong>${activeTag}</td>
        <td class="mono" style="font-size:11px;color:var(--text-muted)">${esc(p.projectPath)}</td>
        <td class="mono">${p.sessions}</td>
        <td class="mono" style="color:var(--success)">${fmtNum(p.tokensSaved)}</td>
        <td class="mono">${fmtNum(p.tokensUsed)}</td>
        <td class="mono" style="color:var(--accent)">${savePct}%</td>
        <td class="mono">${lastDate}</td>
      </tr>`;
    }).join('');

    projectRows = `
      <div class="table-wrap">
        <h3>All Projects</h3>
        <table>
          <thead><tr>
            <th>Project</th><th>Path</th><th>Sessions</th><th>Saved</th><th>Used</th><th>Efficiency</th><th>Last Used</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  // Recent sessions across all projects
  let recentTable = '';
  if (data.recentRuns.length > 0) {
    const rows = data.recentRuns.slice(0, 15).map(r => {
      const d = new Date(r.date);
      const saved = r.tokensRaw - r.tokensPacked;
      const pct = r.tokensRaw > 0 ? Math.round((saved / r.tokensRaw) * 100) : 0;
      const compress = r.compressed ? ' <span class="badge badge-green">compressed</span>' : '';
      const agent = r.agent ? ` <span class="badge badge-blue">${esc(r.agent)}</span>` : '';
      return `<tr>
        <td class="mono">${esc(d.toLocaleString())}</td>
        <td><strong>${esc(r.project || 'unknown')}</strong></td>
        <td>${esc(r.command || 'pack')}${compress}${agent}</td>
        <td class="mono">${r.files}</td>
        <td class="mono">${fmtNum(r.tokensRaw)}</td>
        <td class="mono">${fmtNum(r.tokensPacked)}</td>
        <td class="mono" style="color:var(--success)">${fmtNum(saved)} (${pct}%)</td>
      </tr>`;
    }).join('');

    recentTable = `
      <div class="table-wrap">
        <h3>Recent Sessions (All Projects)</h3>
        <table>
          <thead><tr>
            <th>Time</th><th>Project</th><th>Command</th><th>Files</th><th>Raw</th><th>Packed</th><th>Saved</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  const body = `
    <h1 class="page-title">System-Wide Overview</h1>
    ${cards}
    ${savingsChart}
    ${projectRows}
    ${recentTable}`;

  return layout('Projects', '/projects', body, port);
}

// ---------------------------------------------------------------------------
// 404
// ---------------------------------------------------------------------------

export function render404(port: number): string {
  const body = `
    <div class="empty-state" style="padding-top:120px;">
      <div style="font-size:48px;margin-bottom:16px;">404</div>
      <div>Page not found.</div>
      <div style="margin-top:12px;"><a href="/">Back to dashboard</a></div>
    </div>`;
  return layout('Not Found', '', body, port);
}

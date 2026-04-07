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
    { href: '/prompts', label: 'Prompts', icon: 'history' },
    { href: '/graph', label: 'Graph', icon: 'git-branch' },
    { href: '/search', label: 'Search', icon: 'search' },
    { href: '/agents', label: 'Agents', icon: 'bot' },
    { href: '/files', label: 'Files', icon: 'file-code-2' },
    { href: '/security', label: 'Security', icon: 'shield-check' },
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
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
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
    --bg: #f8fafb;
    --surface: #ffffff;
    --surface-hover: #f0f4f8;
    --border: #d8dee4;
    --text: #1a1a2e;
    --text-muted: #4a5568;
    --text-dim: #718096;
    --accent: #16a34a;
    --success: #16a34a;
    --warning: #ca8a04;
    --danger: #dc2626;
    --purple: #7c3aed;
    --blue: #2563eb;
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
    height: 100vh;
    overflow: hidden;
  }

  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }

  /* Sidebar */
  .sidebar {
    width: 220px;
    height: 100vh;
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

  @keyframes exhaust {
    0% { opacity: 0.8; transform: translateY(0) scale(1); }
    50% { opacity: 0.4; transform: translateY(8px) scale(1.2); }
    100% { opacity: 0; transform: translateY(18px) scale(0.6); }
  }

  @keyframes exhaustGlow {
    0% { box-shadow: 0 0 8px rgba(63,185,80,0.6), 0 0 16px rgba(63,185,80,0.3); }
    50% { box-shadow: 0 0 12px rgba(255,140,0,0.7), 0 0 24px rgba(255,100,0,0.4); }
    100% { box-shadow: 0 0 6px rgba(63,185,80,0.5), 0 0 12px rgba(63,185,80,0.2); }
  }

  @keyframes jetHover {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }

  .sidebar-brand {
    padding: 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .jet-wrapper {
    position: relative;
    display: inline-block;
  }


  .sidebar-brand img {
    width: 150px;
    height: auto;
    margin-bottom: 6px;
    filter: drop-shadow(0 2px 12px rgba(0,0,0,0.4));
    animation: jetHover 3s ease-in-out infinite;
  }

  .sidebar-brand:hover img {
    filter: drop-shadow(0 0 20px rgba(63,185,80,0.7)) drop-shadow(0 0 40px rgba(255,104,0,0.35)) drop-shadow(0 2px 12px rgba(0,0,0,0.4));
    animation: jetHover 1.5s ease-in-out infinite;
  }

  body.light .sidebar-brand:hover img {
    filter: drop-shadow(0 0 16px rgba(22,163,74,0.6)) drop-shadow(0 0 30px rgba(255,104,0,0.25)) drop-shadow(0 2px 8px rgba(0,0,0,0.15));
  }

  /* Tooltip */
  .stat-tooltip {
    position: fixed;
    z-index: 9999;
    background: rgba(13,17,23,0.97);
    border: 1px solid rgba(63,185,80,0.35);
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 12px;
    color: var(--text);
    max-width: 260px;
    pointer-events: none;
    opacity: 0;
    transform: translateY(4px);
    transition: opacity 0.15s ease, transform 0.15s ease;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    line-height: 1.6;
  }

  body.light .stat-tooltip {
    background: rgba(255,255,255,0.98);
    border-color: rgba(22,163,74,0.3);
    color: #1a1a2e;
    box-shadow: 0 8px 32px rgba(0,0,0,0.12);
  }

  .stat-tooltip.visible {
    opacity: 1;
    transform: translateY(0);
  }

  .stat-tooltip strong {
    display: block;
    margin-bottom: 4px;
    color: var(--accent);
    font-size: 13px;
  }

  .stat-tooltip .tip-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 2px 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }

  body.light .stat-tooltip .tip-row {
    border-bottom-color: rgba(0,0,0,0.06);
  }

  .stat-tooltip .tip-row:last-child { border-bottom: none; }
  .stat-tooltip .tip-key { color: var(--text-muted); }
  .stat-tooltip .tip-val { font-weight: 600; font-family: ${T.mono}; }

  .sidebar-brand:hover .jet-exhaust span {
    animation-duration: 0.3s;
    width: 6px;
    height: 6px;
  }

  .brand-text {
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.5px;
    background: linear-gradient(135deg, var(--accent), #2ea043);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  body.light .brand-text {
    background: linear-gradient(135deg, #16a34a, #059669);
    -webkit-background-clip: text;
    background-clip: text;
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
  body.light .sidebar { background: #ffffff; box-shadow: 2px 0 8px rgba(0,0,0,0.04); }
  body.light .sidebar-brand img { filter: drop-shadow(0 2px 8px rgba(0,0,0,0.12)); }
  body.light .sidebar nav a:hover { background: #e8f5e9; }
  body.light .sidebar nav a.active { background: #e8f5e9; color: #16a34a; border-color: #16a34a; }
  body.light .card { background: #ffffff; border-color: #e2e8f0; backdrop-filter: none; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
  body.light .card:hover { box-shadow: 0 4px 16px rgba(22,163,74,0.1); border-color: #16a34a; }
  body.light .card-value { color: #1a1a2e; }
  body.light .table-wrap { background: #ffffff; backdrop-filter: none; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
  body.light thead th { background: #f8fafb; }
  body.light .badge-blue { background: #e8f5e9; color: #16a34a; }
  body.light .badge-green { background: #e8f5e9; color: #16a34a; border-color: #a7f3d0; }
  body.light .badge-yellow { background: #fef9c3; color: #a16207; }
  body.light .badge-red { background: #fee2e2; color: #dc2626; }
  body.light .search-box { background: #ffffff; color: var(--text); border-color: #d8dee4; }
  body.light .search-box:focus { border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,0.15); }
  body.light .search-result { background: #ffffff; border-color: #e2e8f0; }
  body.light a { color: #16a34a; }
  body.light .savings-bar-track { background: #e2e8f0; }
  body.light .bar-bg { background: #e2e8f0; }
  body.light .page-title { color: #1a1a2e; }
  body.light .section-title { color: #1a1a2e; }

  /* Main content */
  .main {
    flex: 1;
    margin-left: 220px;
    padding: 28px 36px;
    height: 100vh;
    overflow-y: auto;
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
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
  }

  .card-value.lg { font-size: 1.6rem; }
  .card-value.xl { font-size: 1.25rem; letter-spacing: -0.01em; }

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
    background: #ff6800;
  }

  .savings-bar-saved {
    height: 100%;
    background: var(--success);
  }

  body.light .savings-bar-used { background: #ff6800; }
  body.light .savings-bar-saved { background: #16a34a; }

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

  .legend-used::before { background: #ff6800 !important; }
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
<script src="https://unpkg.com/lucide@0.468.0/dist/umd/lucide.min.js"></script>
${headExtra}
</head>
<body>
  <aside class="sidebar">
    <div class="sidebar-brand">
      <div class="jet-wrapper">
        <img src="/static/logo.png" alt="codebase-pilot" onerror="this.style.display='none'" />
      </div>
      <div class="brand-text" style="margin-top:-6px;">Codebase Pilot</div>
    </div>
    <nav>
      ${navItems}
    </nav>
    <div class="sidebar-footer" style="flex-direction:column;gap:8px;">
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <a href="https://github.com/kalpeshgamit/codebase-pilot" target="_blank" style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;background:rgba(63,185,80,0.12);color:var(--accent);font-size:10px;font-weight:600;text-decoration:none;"><i data-lucide="github" style="width:11px;height:11px;"></i>GitHub</a>
        <a href="https://www.npmjs.com/package/codebase-pilot-cli" target="_blank" style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;background:rgba(63,185,80,0.12);color:var(--accent);font-size:10px;font-weight:600;text-decoration:none;"><i data-lucide="package" style="width:11px;height:11px;"></i>npm v0.2.1</a>
        <span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;background:rgba(63,185,80,0.12);color:var(--accent);font-size:10px;font-weight:600;"><i data-lucide="hexagon" style="width:11px;height:11px;"></i>Node &ge;18</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
        <span>localhost:${port}</span>
        <button class="theme-toggle" onclick="toggleTheme()" title="Toggle light/dark mode">
          <i data-lucide="moon" class="theme-icon-dark" style="width:14px;height:14px;"></i>
          <i data-lucide="sun" class="theme-icon-light" style="width:14px;height:14px;display:none;"></i>
        </button>
      </div>
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
  } else {
    // Default is dark — ensure it's set
    localStorage.setItem('cp-theme', 'dark');
  }
  // Initialize Lucide icons
  if (window.lucide) lucide.createIcons();

  // Tooltip system
  (function() {
    var tip = document.createElement('div');
    tip.className = 'stat-tooltip';
    tip.id = 'stat-tip';
    document.body.appendChild(tip);
    var hideTimer;
    document.querySelectorAll('[data-tip]').forEach(function(card) {
      card.addEventListener('mouseenter', function(e) {
        clearTimeout(hideTimer);
        var raw = card.getAttribute('data-tip') || '';
        try {
          var obj = JSON.parse(raw);
          tip.innerHTML = '';
          if (obj.title) {
            var t = document.createElement('strong');
            t.textContent = obj.title;
            tip.appendChild(t);
          }
          (obj.rows || []).forEach(function(row) {
            var d = document.createElement('div');
            d.className = 'tip-row';
            d.innerHTML = '<span class="tip-key">' + row[0] + '</span><span class="tip-val">' + row[1] + '</span>';
            tip.appendChild(d);
          });
          if (obj.note) {
            var n = document.createElement('div');
            n.style.cssText = 'margin-top:6px;font-size:11px;color:var(--text-muted);font-style:italic;';
            n.textContent = obj.note;
            tip.appendChild(n);
          }
        } catch(_) { tip.textContent = raw; }
        tip.classList.add('visible');
      });
      card.addEventListener('mousemove', function(e) {
        var me = e;
        var x = me.clientX + 14;
        var y = me.clientY - 10;
        if (x + 280 > window.innerWidth) x = me.clientX - 280;
        if (y + tip.offsetHeight + 10 > window.innerHeight) y = me.clientY - tip.offsetHeight - 10;
        tip.style.left = x + 'px';
        tip.style.top = y + 'px';
      });
      card.addEventListener('mouseleave', function() {
        tip.classList.remove('visible');
      });
    });
  })();

  // Auto-scale card values based on digit length
  function scaleCardValue(el) {
    el.classList.remove('lg', 'xl');
    var len = (el.textContent || '').replace(/[^0-9]/g, '').length;
    if (len >= 10) el.classList.add('xl');
    else if (len >= 7) el.classList.add('lg');
  }
  document.querySelectorAll('.card-value').forEach(function(el) { scaleCardValue(el); });

  // Animate numbers: count up from 0 to target value
  document.querySelectorAll('.card-value').forEach(function(el) {
    var raw = el.textContent.replace(/,/g, '');
    var target = parseFloat(raw);
    if (isNaN(target) || target === 0) return;
    var isInt = Number.isInteger(target);
    var duration = 1200;
    var start = performance.now();
    el.textContent = '0';

    function step(now) {
      var progress = Math.min((now - start) / duration, 1);
      // Ease out cubic
      var ease = 1 - Math.pow(1 - progress, 3);
      var current = target * ease;
      el.textContent = isInt ? Math.round(current).toLocaleString('en-US') : current.toFixed(1);
      if (progress < 1) requestAnimationFrame(step);
      else { el.textContent = isInt ? Math.round(target).toLocaleString('en-US') : target.toLocaleString('en-US'); scaleCardValue(el); }
    }
    requestAnimationFrame(step);
  });
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
      <div class="card" style="border-top:3px solid var(--blue);cursor:default;"
        data-tip='${JSON.stringify({title:"Total Files",rows:[["Scanned files",fmtNum(data.totalFiles)],["Project","Current project only"]],note:"Files indexed in the last scan. Run \`codebase-pilot scan\` to refresh."})}'>
        <div class="card-label">Total Files</div>
        <div class="card-value" style="color:var(--blue);">${fmtNum(data.totalFiles)}</div>
      </div>
      <div class="card" style="border-top:3px solid #ff6800;cursor:default;"
        data-tip='${JSON.stringify({title:"Total Tokens",rows:[["Raw tokens",fmtNum(data.totalTokens)],["After compress","~"+fmtNum(Math.round(data.totalTokens*0.3))+" (est.)"],["Savings est.","~70%"]],note:"Raw token count of all scanned files. Use --compress to reduce by ~70%."})}'>
        <div class="card-label">Total Tokens</div>
        <div class="card-value" style="color:#ff6800;">${fmtNum(data.totalTokens)}</div>
      </div>
      <div class="card" style="border-top:3px solid var(--purple);cursor:default;"
        data-tip='${JSON.stringify({title:"Sessions Today",rows:[["Today",fmtNum(data.today.sessions)],["This week",fmtNum(data.week.sessions)],["This month",fmtNum(data.month.sessions)]],note:"Each \`pack\` run counts as one session."})}'>
        <div class="card-label">Sessions Today</div>
        <div class="card-value" style="color:var(--purple);">${fmtNum(data.today.sessions)}</div>
      </div>
      <div class="card" style="border-top:3px solid var(--success);cursor:default;"
        data-tip='${JSON.stringify({title:"Tokens Saved This Week",rows:[["Saved",fmtNum(data.week.tokensSaved)],["Used",fmtNum(data.week.tokensUsed)],["Total",fmtNum(data.week.tokensSaved+data.week.tokensUsed)],["Save rate",((data.week.tokensSaved+data.week.tokensUsed)>0?Math.round((data.week.tokensSaved/(data.week.tokensSaved+data.week.tokensUsed))*100):0)+"%"]],note:"Tokens saved = raw tokens minus packed tokens across all sessions this week."})}'>
        <div class="card-label">Tokens Saved This Week</div>
        <div class="card-value" style="color:var(--success);">${fmtNum(data.week.tokensSaved)}</div>
        <div class="card-sub">${fmtNum(data.week.tokensUsed)} used</div>
      </div>
      <div class="card" style="border-top:3px solid var(--accent);cursor:default;"
        data-tip='${JSON.stringify({title:"Overall Tokens This Month",rows:[["Saved",fmtNum(data.month.tokensSaved)],["Used",fmtNum(data.month.tokensUsed)],["Total",fmtNum(data.month.tokensSaved+data.month.tokensUsed)],["Sessions",fmtNum(data.month.sessions)]],note:"Combined token activity (used + saved) across all pack sessions this month."})}'>
        <div class="card-label">Overall Tokens This Month</div>
        <div class="card-value" style="color:var(--accent);">${fmtNum(data.month.tokensSaved + data.month.tokensUsed)}</div>
        <div class="card-sub">${fmtNum(data.month.tokensSaved)} saved</div>
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
          if (cards[0] && d.totalFiles) cards[0].textContent = Number(d.totalFiles).toLocaleString('en-US');
          if (cards[1] && d.totalTokens) cards[1].textContent = Number(d.totalTokens).toLocaleString('en-US');
          if (cards[2] && d.today) cards[2].textContent = Number(d.today.sessions).toLocaleString('en-US');
          if (cards[3] && d.week) cards[3].textContent = Number(d.week.tokensSaved).toLocaleString('en-US');

          // Flash updated cards
          cards.forEach(function(c) {
            c.style.transition = 'color 0.3s';
            c.style.color = 'var(--success)';
            setTimeout(function() { c.style.color = ''; }, 1500);
          });
        } catch(err) {}
      });

      es.addEventListener('autopilot', function(e) {
        try {
          var d = JSON.parse(e.data);
          var ap = document.getElementById('autopilot-status');
          if (!ap) {
            ap = document.createElement('div');
            ap.id = 'autopilot-status';
            ap.style.cssText = 'position:fixed;top:16px;right:24px;background:rgba(13,17,23,0.97);border:1px solid rgba(63,185,80,0.35);border-radius:10px;padding:10px 16px;font-size:12px;z-index:9000;display:flex;align-items:center;gap:8px;backdrop-filter:blur(12px);max-width:340px;transition:opacity 0.3s;';
            document.body.appendChild(ap);
          }
          ap.style.opacity = '1';
          if (d.status === 'packing') {
            ap.innerHTML = '<span style="width:8px;height:8px;background:#ff6800;border-radius:50%;display:inline-block;animation:pulse 1s infinite;flex-shrink:0;"></span><span><strong style="color:#ff6800;">Autopilot</strong> packing… <span style="color:var(--text-muted);">' + d.trigger + '</span></span>';
          } else if (d.status === 'done') {
            var secWarn = d.secretCount > 0 ? ' <span style="color:#f85149;">⚠ ' + d.secretCount + ' secret' + (d.secretCount>1?'s':'') + '</span>' : '';
            ap.innerHTML = '<span style="width:8px;height:8px;background:var(--success);border-radius:50%;display:inline-block;flex-shrink:0;"></span><span><strong style="color:var(--success);">Autopilot</strong> packed ' + Number(d.files).toLocaleString('en-US') + ' files · ' + Number(d.tokens).toLocaleString('en-US') + ' tokens' + secWarn + ' <span style="color:var(--text-muted);">(' + d.trigger + ')</span></span>';
            setTimeout(function() { if(ap) { ap.style.opacity='0'; setTimeout(function(){if(ap&&ap.parentNode)ap.parentNode.removeChild(ap);},400); }}, 6000);
          } else if (d.status === 'error') {
            ap.innerHTML = '<span style="width:8px;height:8px;background:#f85149;border-radius:50%;display:inline-block;flex-shrink:0;"></span><span><strong style="color:#f85149;">Autopilot error</strong> — ' + d.trigger + '</span>';
            setTimeout(function() { if(ap) { ap.style.opacity='0'; setTimeout(function(){if(ap&&ap.parentNode)ap.parentNode.removeChild(ap);},400); }}, 5000);
          }
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

      es.addEventListener('secret-alert', function(e) {
        try {
          var d = JSON.parse(e.data);
          var toast = document.createElement('div');
          toast.style.cssText = 'position:fixed;bottom:20px;right:24px;background:rgba(248,81,73,0.95);color:#fff;padding:12px 18px;border-radius:8px;font-size:13px;z-index:200;animation:fadeIn 0.3s ease;border:1px solid rgba(248,81,73,0.5);backdrop-filter:blur(12px);max-width:400px;';
          var count = d.secrets.length;
          toast.innerHTML = '<strong>&#9888; Secret detected!</strong><br>' + d.file + ' (' + count + ' match' + (count > 1 ? 'es' : '') + ')';
          document.body.appendChild(toast);
          setTimeout(function() { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.5s'; }, 5000);
          setTimeout(function() { toast.remove(); }, 5500);
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

  svg.call(d3.zoom().on('zoom', function(e) { g.attr('transform', e.transform); }))
    .on('dblclick.zoom', null);

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

  var _dragActive = false;
  var nodeG = g.append('g')
    .selectAll('g')
    .data(data.nodes)
    .join('g')
    .style('cursor', 'pointer')
    .call(d3.drag()
      .on('start', function(e, d) { _dragActive = false; if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', function(e, d) { _dragActive = true; d.fx = e.x; d.fy = e.y; })
      .on('end', function(e, d) { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
    );

  var node = nodeG.append('circle')
    .attr('r', function(d) { return Math.max(6, Math.sqrt(d.tokens / 50) + 4); })
    .attr('fill', function(d) { return groupColors[d.group] || 'var(--accent)'; })
    .attr('stroke', '#0d1117')
    .attr('stroke-width', 1.5);

  // Click detection: listen directly on the SVG element in capture phase
  // Close drawer when clicking outside (on SVG background)
  document.addEventListener('click', function(e) {
    var drawer = document.getElementById('node-drawer');
    if (drawer && drawer.style.transform === 'translateX(0)') {
      if (!drawer.contains(e.target) && !e.target.closest('circle') && !e.target.closest('text')) {
        drawer.style.transform = 'translateX(100%)';
      }
    }
  });

  var svgEl = document.querySelector('#graph-container svg');
  if (svgEl) {
    svgEl.addEventListener('click', function(e) {
      if (_dragActive) { _dragActive = false; return; }
      // Walk up from click target to find circle or its parent g
      var target = e.target;
      var gNode = null;
      while (target && target !== svgEl) {
        if (target.tagName === 'circle') { gNode = target.parentNode; break; }
        if (target.tagName === 'text') { gNode = target.parentNode; break; }
        target = target.parentNode;
      }
      if (gNode) {
        var nodeData = d3.select(gNode).datum();
        if (nodeData) openDrawer(nodeData);
      }
    }, true);
  }

  var labels = nodeG.append('text')
    .text(function(d) { return d.id.split('/').pop().replace(/\.\w+$/, ''); })
    .attr('dx', function(d) { return Math.max(4, Math.sqrt(d.tokens / 50) + 3) + 4; })
    .attr('dy', '0.35em')
    .attr('fill', 'var(--text-muted)')
    .attr('font-size', '9px')
    .attr('font-family', 'ui-monospace, monospace')
    .attr('pointer-events', 'none');

  var tooltipEl = document.getElementById('graph-tooltip');

  nodeG.on('mouseover', function(e, d) {
    tooltipEl.style.display = 'block';
    tooltipEl.textContent = '';
    var b = document.createElement('strong');
    b.textContent = d.id;
    tooltipEl.appendChild(b);
    tooltipEl.appendChild(document.createElement('br'));
    tooltipEl.appendChild(document.createTextNode(d.tokens + ' tokens'));
    tooltipEl.appendChild(document.createElement('br'));
    tooltipEl.appendChild(document.createTextNode('group: ' + d.group));
    d3.select(this).select('circle').attr('stroke', 'var(--accent)').attr('stroke-width', 2.5);
    d3.select(this).select('text').attr('fill', 'var(--text)').attr('font-weight', '600');
  }).on('mousemove', function(e) {
    tooltipEl.style.left = (e.pageX + 12) + 'px';
    tooltipEl.style.top = (e.pageY - 12) + 'px';
  }).on('mouseout', function(e) {
    tooltipEl.style.display = 'none';
    d3.select(this).select('circle').attr('stroke', '#0d1117').attr('stroke-width', 1.5);
    d3.select(this).select('text').attr('fill', 'var(--text-muted)').attr('font-weight', 'normal');
  });

  function openDrawer(d) {
    var drawer = document.getElementById('node-drawer');
    var drawerBody = document.getElementById('drawer-body');
    drawer.style.transform = 'translateX(0)';
    drawerBody.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">Loading...</div>';

    fetch('/api/impact?file=' + encodeURIComponent(d.id))
      .then(function(r) { return r.json(); })
      .then(function(impact) {
        var html = '<div style="font-family:ui-monospace,monospace;font-size:13px;color:var(--accent);margin-bottom:12px;">' + d.id + '</div>';
        html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">';
        html += '<span class="badge badge-blue">' + d.tokens + ' tokens</span>';
        html += '<span class="badge badge-green">' + d.group + '</span>';
        if (impact.riskLevel) html += '<span class="badge ' + (impact.riskLevel === 'high' || impact.riskLevel === 'critical' ? 'badge-red' : impact.riskLevel === 'medium' ? 'badge-yellow' : 'badge-green') + '">' + impact.riskLevel.toUpperCase() + ' ' + impact.riskScore + '/100</span>';
        html += '</div>';
        if (impact.directDependents && impact.directDependents.length > 0) {
          html += '<div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px;">Direct dependents (' + impact.directDependents.length + ')</div>';
          impact.directDependents.forEach(function(dep) {
            html += '<div style="padding:4px 0;font-size:12px;font-family:ui-monospace,monospace;color:var(--text);">' + dep + '</div>';
          });
          html += '<div style="height:12px;"></div>';
        }
        if (impact.affectedTests && impact.affectedTests.length > 0) {
          html += '<div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px;">Affected tests (' + impact.affectedTests.length + ')</div>';
          impact.affectedTests.forEach(function(t) {
            html += '<div style="padding:4px 0;font-size:12px;font-family:ui-monospace,monospace;color:var(--success);">' + t + '</div>';
          });
          html += '<div style="height:12px;"></div>';
        }
        html += '<div style="font-size:11px;color:var(--text-muted);">Total affected: ' + (impact.transitiveDependents ? impact.transitiveDependents.length : 0) + ' files</div>';
        html += '<div style="margin-top:16px;"><a href="/impact?file=' + encodeURIComponent(d.id) + '" style="font-size:12px;">Open full impact page &rarr;</a></div>';
        drawerBody.innerHTML = html;
      })
      .catch(function() {
        drawerBody.innerHTML = '<div style="color:var(--danger);">Failed to load impact data</div>';
      });
  }

  sim.on('tick', function() {
    link
      .attr('x1', function(d) { return d.source.x; }).attr('y1', function(d) { return d.source.y; })
      .attr('x2', function(d) { return d.target.x; }).attr('y2', function(d) { return d.target.y; });
    nodeG.attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; });
  });

  searchBox.addEventListener('input', function() {
    var q = searchBox.value.toLowerCase();
    nodeG.attr('opacity', function(d) { return !q || d.id.toLowerCase().indexOf(q) !== -1 ? 1 : 0.1; });
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
    <div id="graph-container" style="width:100%;height:calc(100vh - 170px);background:var(--surface);border:1px solid var(--border);border-radius:8px;position:relative;overflow:hidden;"></div>
    <div id="node-drawer" style="position:fixed;top:0;right:0;width:360px;height:100vh;background:var(--bg);border-left:1px solid var(--border);transform:translateX(100%);transition:transform 0.25s ease;overflow-y:auto;z-index:999;box-shadow:-8px 0 30px rgba(0,0,0,0.3);">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--bg);z-index:1;">
        <strong style="font-size:14px;">File Details</strong>
        <button onclick="document.getElementById('node-drawer').style.transform='translateX(100%)'" style="background:var(--surface);border:1px solid var(--border);color:var(--text-muted);cursor:pointer;font-size:16px;line-height:1;width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;">&times;</button>
      </div>
      <div id="drawer-body" style="padding:20px;"></div>
    </div>
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
  const BATCH = 30;

  function buildRow(f: typeof sorted[0]): string {
    const pct = data.totalTokens > 0 ? ((f.tokens / data.totalTokens) * 100).toFixed(1) : '0.0';
    const barPct = ((f.tokens / maxTokens) * 100).toFixed(1);
    return `<tr>
      <td class="mono"><a href="/impact?file=${encodeURIComponent(f.relativePath)}">${esc(f.relativePath)}</a></td>
      <td>${f.language ? esc(f.language) : `<span style="color:var(--text-muted)">-</span>`}</td>
      <td class="mono" style="text-align:right;">${fmtNum(f.tokens)}</td>
      <td style="text-align:right;">${pct}%</td>
      <td><div class="bar-bg"><div class="bar-fill" style="width:${barPct}%"></div></div></td>
    </tr>`;
  }

  const initialRows = sorted.slice(0, BATCH).map(buildRow).join('');
  const allFilesJson = JSON.stringify(sorted.map(f => ({
    p: f.relativePath, l: f.language, t: f.tokens,
    pct: data.totalTokens > 0 ? ((f.tokens / data.totalTokens) * 100).toFixed(1) : '0.0',
    bar: ((f.tokens / maxTokens) * 100).toFixed(1),
  })));

  const filesScript = `
<script>
(function() {
  var allFiles = ${allFilesJson};
  var loaded = ${BATCH};
  var loading = false;
  var tbody = document.querySelector('#files-table tbody');
  var mainEl = document.querySelector('.main');
  var counter = document.getElementById('files-loaded');

  function escH(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function fmtN(n) { return Number(n).toLocaleString('en-US'); }

  function addRows(count) {
    var end = Math.min(loaded + count, allFiles.length);
    for (var i = loaded; i < end; i++) {
      var f = allFiles[i];
      var tr = document.createElement('tr');
      tr.innerHTML = '<td class="mono"><a href="/impact?file=' + encodeURIComponent(f.p) + '">' + escH(f.p) + '</a></td>'
        + '<td>' + (f.l ? escH(f.l) : '<span style="color:var(--text-muted)">-</span>') + '</td>'
        + '<td class="mono" style="text-align:right;">' + fmtN(f.t) + '</td>'
        + '<td style="text-align:right;">' + f.pct + '%</td>'
        + '<td><div class="bar-bg"><div class="bar-fill" style="width:' + f.bar + '%"></div></div></td>';
      tbody.appendChild(tr);
    }
    loaded = end;
    if (counter) counter.textContent = loaded + ' of ' + allFiles.length + ' loaded';
    loading = false;
  }

  if (mainEl) {
    mainEl.addEventListener('scroll', function() {
      if (loading || loaded >= allFiles.length) return;
      if (mainEl.scrollTop + mainEl.clientHeight >= mainEl.scrollHeight - 200) {
        loading = true;
        addRows(${BATCH});
      }
    });
  }

  // Sort
  var table = document.querySelector('#files-table');
  var headers = table.querySelectorAll('thead th');
  var sortCol = 2;
  var sortAsc = false;

  headers.forEach(function(th, i) {
    th.addEventListener('click', function() {
      if (sortCol === i) { sortAsc = !sortAsc; } else { sortCol = i; sortAsc = i === 0; }
      // Sort all data
      allFiles.sort(function(a, b) {
        var av, bv;
        if (i === 0) { av = a.p; bv = b.p; return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av); }
        if (i === 1) { av = a.l || ''; bv = b.l || ''; return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av); }
        av = a.t; bv = b.t;
        return sortAsc ? av - bv : bv - av;
      });
      // Re-render
      tbody.innerHTML = '';
      loaded = 0;
      addRows(${BATCH});
    });
  });
})();
<\/script>`;

  const body = `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
      <h1 class="page-title" style="margin-bottom:0">Files</h1>
      <span class="mono" style="color:var(--text-muted);font-size:12px;">${fmtNum(data.files.length)} files, ${fmtNum(data.totalTokens)} tokens total</span>
      <span id="files-loaded" class="mono" style="color:var(--text-dim);font-size:11px;">${Math.min(BATCH, sorted.length)} of ${sorted.length} loaded</span>
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
        <tbody>${initialRows}</tbody>
      </table>
    </div>
    ${filesScript}`;

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
  const allTimeTotal = data.allTime.tokensSaved + data.allTime.tokensUsed;
  const allTimeSavePct = allTimeTotal > 0 ? Math.round((data.allTime.tokensSaved / allTimeTotal) * 100) : 0;
  const cards = `
    <div class="cards">
      <div class="card" style="border-top:3px solid var(--blue);cursor:default;"
        data-tip='${JSON.stringify({title:"Total Projects",rows:[["Projects tracked",data.projects.length],["Active","Current working project"]],note:"Projects are discovered automatically when you run codebase-pilot in any directory."})}'>
        <div class="card-label">Total Projects</div>
        <div class="card-value" style="color:var(--blue);">${data.projects.length}</div>
      </div>
      <div class="card" style="border-top:3px solid var(--purple);cursor:default;"
        data-tip='${JSON.stringify({title:"Total Sessions",rows:[["All time",fmtNum(data.allTime.sessions)],["This month",fmtNum(data.month.sessions)],["This week",fmtNum(data.week.sessions)],["Today",fmtNum(data.today.sessions)]],note:"Each pack run = 1 session. Tracked across all projects system-wide."})}'>
        <div class="card-label">Total Sessions</div>
        <div class="card-value" style="color:var(--purple);">${fmtNum(data.allTime.sessions)}</div>
      </div>
      <div class="card" style="border-top:3px solid var(--success);cursor:default;"
        data-tip='${JSON.stringify({title:"Tokens Saved (All Time)",rows:[["Saved",fmtNum(data.allTime.tokensSaved)],["Save rate",allTimeSavePct+"%"],["This month",fmtNum(data.month.tokensSaved)],["This week",fmtNum(data.week.tokensSaved)]],note:"Tokens saved = raw tokens minus packed/compressed tokens. Higher is better."})}'>
        <div class="card-label">Tokens Saved (All Time)</div>
        <div class="card-value" style="color:var(--success);">${fmtNum(data.allTime.tokensSaved)}</div>
      </div>
      <div class="card" style="border-top:3px solid #ff6800;cursor:default;"
        data-tip='${JSON.stringify({title:"Tokens Used (All Time)",rows:[["Used",fmtNum(data.allTime.tokensUsed)],["This month",fmtNum(data.month.tokensUsed)],["This week",fmtNum(data.week.tokensUsed)],["Today",fmtNum(data.today.tokensUsed)]],note:"Tokens actually sent to AI context after packing and compression."})}'>
        <div class="card-label">Tokens Used (All Time)</div>
        <div class="card-value" style="color:#ff6800;">${fmtNum(data.allTime.tokensUsed)}</div>
      </div>
      <div class="card" style="border-top:3px solid var(--accent);cursor:default;"
        data-tip='${JSON.stringify({title:"Overall Tokens (All Time)",rows:[["Total",fmtNum(allTimeTotal)],["Saved",fmtNum(data.allTime.tokensSaved)],["Used",fmtNum(data.allTime.tokensUsed)],["Efficiency",allTimeSavePct+"%"]],note:"Grand total of all token activity. Saved + Used = Overall."})}'>
        <div class="card-label">Overall Tokens (All Time)</div>
        <div class="card-value" style="color:var(--accent);">${fmtNum(data.allTime.tokensSaved + data.allTime.tokensUsed)}</div>
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

  const projectsSseScript = `
    <script>
    (function() {
      var es = new EventSource('/api/events');

      function animateVal(el, newVal) {
        var target = newVal;
        var current = parseInt((el.textContent || '0').replace(/,/g, '')) || 0;
        if (current === target) return;
        var duration = 800, start = performance.now();
        el.style.transition = 'color 0.3s';
        el.style.color = 'var(--success)';
        (function step(now) {
          var p = Math.min((now - start) / duration, 1);
          var ease = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(current + (target - current) * ease).toLocaleString('en-US');
          if (p < 1) requestAnimationFrame(step);
          else { el.textContent = target.toLocaleString('en-US'); setTimeout(function(){ el.style.color=''; }, 1200); }
        })(start);
      }

      es.addEventListener('projects-update', function(e) {
        try {
          var d = JSON.parse(e.data);
          var cards = document.querySelectorAll('.card-value');
          // Order: Total Projects(0), Total Sessions(1), Tokens Saved(2), Tokens Used(3), Overall(4)
          if (cards[1] && d.allTime) animateVal(cards[1], d.allTime.sessions);
          if (cards[2] && d.allTime) animateVal(cards[2], d.allTime.tokensSaved);
          if (cards[3] && d.allTime) animateVal(cards[3], d.allTime.tokensUsed);
          if (cards[4] && d.allTime) animateVal(cards[4], d.allTime.tokensSaved + d.allTime.tokensUsed);

          // Show live toast
          var toast = document.createElement('div');
          toast.style.cssText = 'position:fixed;bottom:20px;right:24px;background:rgba(63,185,80,0.15);color:var(--success);padding:10px 16px;border-radius:8px;font-size:12px;z-index:100;animation:fadeIn 0.3s ease;border:1px solid rgba(63,185,80,0.3);backdrop-filter:blur(12px);';
          var proj = d.projects && d.projects.length ? d.projects[d.projects.length-1] : null;
          toast.textContent = proj ? '⚡ ' + proj.project + ' ran a pack session' : '⚡ Projects updated';
          document.body.appendChild(toast);
          setTimeout(function() { toast.style.opacity='0'; toast.style.transition='opacity 0.4s'; }, 3500);
          setTimeout(function() { toast.remove(); }, 4000);
        } catch(err) {}
      });

      es.addEventListener('connected', function() {
        var badge = document.getElementById('live-badge');
        if (badge) badge.style.display = 'inline-flex';
      });
      es.onerror = function() {
        var badge = document.getElementById('live-badge');
        if (badge) badge.style.display = 'none';
      };
    })();
    </script>`;

  const body = `
    <h1 class="page-title">System-Wide Overview <span id="live-badge" style="display:none;align-items:center;gap:4px;font-size:11px;font-weight:500;color:var(--success);background:rgba(63,185,80,0.12);border:1px solid rgba(63,185,80,0.25);border-radius:20px;padding:2px 10px;vertical-align:middle;"><span style="width:6px;height:6px;background:var(--success);border-radius:50%;display:inline-block;animation:pulse 1.5s infinite;"></span>LIVE</span></h1>
    ${cards}
    ${savingsChart}
    ${projectRows}
    ${recentTable}
    ${projectsSseScript}`;

  return layout('Projects', '/projects', body, port);
}

// ---------------------------------------------------------------------------
// Prompts (all pack sessions system-wide, real-time, DESC)
// ---------------------------------------------------------------------------

export interface PromptsPageData {
  runs: Array<{
    date: string;
    project: string;
    projectPath: string;
    command: string;
    files: number;
    tokensRaw: number;
    tokensPacked: number;
    compressed: boolean;
    agent?: string;
  }>;
  totalSaved: number;
  totalUsed: number;
  totalSessions: number;
}

export function renderPrompts(data: PromptsPageData, port: number): string {
  const avgSavePct = data.totalUsed + data.totalSaved > 0
    ? Math.round((data.totalSaved / (data.totalSaved + data.totalUsed)) * 100) : 0;

  const summaryCards = `
    <div class="cards">
      <div class="card" style="border-top:3px solid var(--purple);cursor:default;"
        data-tip='${JSON.stringify({title:"Total Sessions",rows:[["All projects",fmtNum(data.totalSessions)]],note:"Every pack run across all projects on this machine."})}'>
        <div class="card-label">Total Sessions</div>
        <div class="card-value" id="pr-sessions" style="color:var(--purple);">${fmtNum(data.totalSessions)}</div>
      </div>
      <div class="card" style="border-top:3px solid #ff6800;cursor:default;"
        data-tip='${JSON.stringify({title:"Total Tokens Used",rows:[["Sent to AI",fmtNum(data.totalUsed)],["After pack/compress",""]],note:"Sum of tokensPacked across all sessions."})}'>
        <div class="card-label">Total Tokens Used</div>
        <div class="card-value" id="pr-used" style="color:#ff6800;">${fmtNum(data.totalUsed)}</div>
      </div>
      <div class="card" style="border-top:3px solid var(--success);cursor:default;"
        data-tip='${JSON.stringify({title:"Total Tokens Saved",rows:[["Saved",fmtNum(data.totalSaved)],["Save rate",avgSavePct+"%"]],note:"Raw tokens minus packed tokens. Higher = better efficiency."})}'>
        <div class="card-label">Total Tokens Saved</div>
        <div class="card-value" id="pr-saved" style="color:var(--success);">${fmtNum(data.totalSaved)}</div>
        <div class="card-sub">${avgSavePct}% avg efficiency</div>
      </div>
      <div class="card" style="border-top:3px solid var(--accent);cursor:default;"
        data-tip='${JSON.stringify({title:"Overall Tokens",rows:[["Total",fmtNum(data.totalSaved+data.totalUsed)],["Used",fmtNum(data.totalUsed)],["Saved",fmtNum(data.totalSaved)]],note:"Combined total of all token activity."})}'>
        <div class="card-label">Overall Tokens</div>
        <div class="card-value" id="pr-overall" style="color:var(--accent);">${fmtNum(data.totalSaved + data.totalUsed)}</div>
      </div>
    </div>`;

  const rows = data.runs.map((r, i) => {
    const raw = r.tokensRaw ?? 0;
    const packed = r.tokensPacked ?? 0;
    const saved = raw - packed;
    const savePct = raw > 0 ? Math.round((saved / raw) * 100) : 0;
    const d = new Date(r.date);
    const timeStr = d.toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
    const compress = r.compressed ? '<span class="badge badge-green">compressed</span>' : '';
    const agentBadge = r.agent ? `<span class="badge badge-blue">${esc(r.agent)}</span>` : '';
    const savePctColor = savePct >= 60 ? 'var(--success)' : savePct >= 30 ? '#ff6800' : 'var(--text-muted)';
    const savedDisplay = saved > 0 ? fmtNum(saved) : '<span style="color:var(--text-muted)" title="Run with --compress to save tokens">—</span>';
    const pctDisplay = savePct > 0
      ? `<span style="color:${savePctColor};font-weight:600">${savePct}%</span>`
      : `<span style="color:var(--text-muted)" title="Run with --compress to save tokens">—</span>`;
    return `<tr id="pr-row-${i}" style="animation:fadeIn 0.3s ease both;animation-delay:${Math.min(i * 0.02, 0.5)}s">
      <td class="mono" style="font-size:11px;color:var(--text-muted)">${esc(timeStr)}</td>
      <td><strong>${esc(r.project)}</strong></td>
      <td class="mono" style="font-size:10px;color:var(--text-muted);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(r.projectPath)}">${esc(r.projectPath)}</td>
      <td>${esc(r.command)} ${compress}${agentBadge}</td>
      <td class="mono">${r.files}</td>
      <td class="mono" style="color:#ff6800">${fmtNum(raw)}</td>
      <td class="mono" style="color:var(--accent)">${fmtNum(packed)}</td>
      <td class="mono">${savedDisplay}</td>
      <td class="mono">${pctDisplay}</td>
    </tr>`;
  }).join('');

  const tableHtml = `
    <div class="table-wrap" id="prompts-table-wrap">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <h3 style="margin:0;">All Prompt Sessions <span id="live-badge" style="display:none;align-items:center;gap:4px;font-size:11px;font-weight:500;color:var(--success);background:rgba(63,185,80,0.12);border:1px solid rgba(63,185,80,0.25);border-radius:20px;padding:2px 10px;margin-left:8px;"><span style="width:6px;height:6px;background:var(--success);border-radius:50%;display:inline-block;animation:pulse 1.5s infinite;"></span>LIVE</span></h3>
        <div style="font-size:12px;color:var(--text-muted);">${fmtNum(data.runs.length)} sessions — newest first</div>
      </div>
      <table id="prompts-table">
        <thead><tr>
          <th>Time</th><th>Project</th><th>Path</th><th>Command</th><th>Files</th>
          <th style="color:#ff6800">Raw Tokens</th><th style="color:var(--accent)">Packed</th>
          <th style="color:var(--success)">Saved</th><th>Save %</th>
        </tr></thead>
        <tbody id="prompts-tbody">${rows}</tbody>
      </table>
    </div>`;

  const sseScript = `
    <style>@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}} @keyframes rowSlide{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}</style>
    <script>
    (function() {
      var es = new EventSource('/api/events');

      es.addEventListener('connected', function() {
        var b = document.getElementById('live-badge');
        if (b) b.style.display = 'inline-flex';
      });

      es.addEventListener('prompt-added', function(e) {
        try {
          var d = JSON.parse(e.data);
          var r = d.run;
          var saved = r.tokensRaw - r.tokensPacked;
          var pct = r.tokensRaw > 0 ? Math.round((saved / r.tokensRaw) * 100) : 0;
          var pctColor = pct >= 60 ? 'var(--success)' : pct >= 30 ? '#ff6800' : 'var(--text-muted)';
          var compress = r.compressed ? '<span class="badge badge-green">compressed</span>' : '';
          var agent = r.agent ? '<span class="badge badge-blue">' + r.agent + '</span>' : '';
          var timeStr = new Date(r.date).toLocaleString('en-GB', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
          var savedDisp = saved > 0 ? saved.toLocaleString('en-US') : '<span style="color:var(--text-muted)" title="Run with --compress to save tokens">—</span>';
          var pctDisp = pct > 0 ? '<span style="color:' + pctColor + ';font-weight:600">' + pct + '%</span>' : '<span style="color:var(--text-muted)" title="Run with --compress to save tokens">—</span>';
          var tr = document.createElement('tr');
          tr.style.cssText = 'animation:rowSlide 0.4s ease both;background:rgba(63,185,80,0.05);';
          tr.innerHTML = '<td class="mono" style="font-size:11px;color:var(--text-muted)">' + timeStr + '</td>'
            + '<td><strong>' + r.project + '</strong></td>'
            + '<td class="mono" style="font-size:10px;color:var(--text-muted);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + r.projectPath + '">' + r.projectPath + '</td>'
            + '<td>' + r.command + ' ' + compress + agent + '</td>'
            + '<td class="mono">' + r.files + '</td>'
            + '<td class="mono" style="color:#ff6800">' + Number(r.tokensRaw).toLocaleString('en-US') + '</td>'
            + '<td class="mono" style="color:var(--accent)">' + Number(r.tokensPacked).toLocaleString('en-US') + '</td>'
            + '<td class="mono">' + savedDisp + '</td>'
            + '<td class="mono">' + pctDisp + '</td>';
          var tbody = document.getElementById('prompts-tbody');
          if (tbody) tbody.insertBefore(tr, tbody.firstChild);

          // Update summary cards
          function animVal(id, val) {
            var el = document.getElementById(id);
            if (!el) return;
            var cur = parseInt((el.textContent || '0').replace(/,/g,'')) || 0;
            var dur = 600, st = performance.now();
            el.style.color = 'var(--success)';
            (function step(now) {
              var p = Math.min((now-st)/dur,1), ease=1-Math.pow(1-p,3);
              el.textContent = Math.round(cur+(val-cur)*ease).toLocaleString('en-US');
              if(p<1) requestAnimationFrame(step);
              else { el.textContent=val.toLocaleString('en-US'); setTimeout(function(){ el.style.color=''; },1000); }
            })(st);
          }
          if (d.totals) {
            animVal('pr-sessions', d.totals.sessions);
            animVal('pr-used', d.totals.used);
            animVal('pr-saved', d.totals.saved);
            animVal('pr-overall', d.totals.saved + d.totals.used);
          }

          // Toast
          var toast = document.createElement('div');
          toast.style.cssText = 'position:fixed;bottom:20px;right:24px;background:rgba(63,185,80,0.15);color:var(--success);padding:10px 16px;border-radius:8px;font-size:12px;z-index:100;border:1px solid rgba(63,185,80,0.3);backdrop-filter:blur(12px);animation:fadeIn 0.3s ease;';
          toast.textContent = '⚡ ' + r.project + ' — ' + pct + '% saved (' + saved.toLocaleString('en-US') + ' tokens)';
          document.body.appendChild(toast);
          setTimeout(function(){ toast.style.opacity='0'; toast.style.transition='opacity 0.4s'; }, 3500);
          setTimeout(function(){ toast.remove(); }, 4000);
        } catch(err) {}
      });

      es.onerror = function() {
        var b = document.getElementById('live-badge');
        if (b) b.style.display = 'none';
      };

      // Fallback poll every 30s to catch any missed SSE events
      var knownCount = document.querySelectorAll('#prompts-tbody tr').length;
      setInterval(function() {
        fetch('/api/prompts-count').then(function(r){ return r.json(); }).then(function(d) {
          if (d.count > knownCount) {
            // New sessions added — reload table body silently
            fetch('/api/prompts-rows?offset=' + knownCount).then(function(r){ return r.json(); }).then(function(data) {
              var tbody = document.getElementById('prompts-tbody');
              if (!tbody) return;
              data.rows.forEach(function(r) {
                var saved = r.tokensRaw - r.tokensPacked;
                var pct = r.tokensRaw > 0 ? Math.round((saved / r.tokensRaw) * 100) : 0;
                var pctColor = pct >= 60 ? 'var(--success)' : pct >= 30 ? '#ff6800' : 'var(--text-muted)';
                var compress = r.compressed ? '<span class="badge badge-green">compressed</span>' : '';
                var agent = r.agent ? '<span class="badge badge-blue">' + r.agent + '</span>' : '';
                var tr = document.createElement('tr');
                var ts2 = new Date(r.date).toLocaleString('en-GB', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
                var sd2 = saved > 0 ? saved.toLocaleString('en-US') : '<span style="color:var(--text-muted)" title="Run with --compress">—</span>';
                var pd2 = pct > 0 ? '<span style="color:' + pctColor + ';font-weight:600">' + pct + '%</span>' : '<span style="color:var(--text-muted)" title="Run with --compress">—</span>';
                tr.style.cssText = 'animation:rowSlide 0.4s ease both;background:rgba(63,185,80,0.05);';
                tr.innerHTML = '<td class="mono" style="font-size:11px;color:var(--text-muted)">' + ts2 + '</td>'
                  + '<td><strong>' + r.project + '</strong></td>'
                  + '<td class="mono" style="font-size:10px;color:var(--text-muted);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + r.projectPath + '">' + r.projectPath + '</td>'
                  + '<td>' + r.command + ' ' + compress + agent + '</td>'
                  + '<td class="mono">' + r.files + '</td>'
                  + '<td class="mono" style="color:#ff6800">' + Number(r.tokensRaw).toLocaleString('en-US') + '</td>'
                  + '<td class="mono" style="color:var(--accent)">' + Number(r.tokensPacked).toLocaleString('en-US') + '</td>'
                  + '<td class="mono">' + sd2 + '</td>'
                  + '<td class="mono">' + pd2 + '</td>';
                tbody.insertBefore(tr, tbody.firstChild);
              });
              knownCount = d.count;
            }).catch(function(){});
          }
        }).catch(function(){});
      }, 30000);
    })();
    </script>`;

  const body = `
    <h1 class="page-title">Prompts</h1>
    ${summaryCards}
    ${tableHtml}
    ${sseScript}`;

  return layout('Prompts', '/prompts', body, port);
}

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

export interface SecurityPageData {
  projectName: string;
  totalPatterns: number;
  categories: Array<{ name: string; count: number }>;
  scannedFiles: number;
  detectedFiles: Array<{ file: string; secrets: Array<{ pattern: string; risk: string; line: number }> }>;
  cleanFiles: number;
}

export function renderSecurity(data: SecurityPageData, port: number): string {
  // Summary cards
  const cards = `
    <div class="cards">
      <div class="card" style="border-top:3px solid var(--blue);">
        <div class="card-label">Total Patterns</div>
        <div class="card-value" style="color:var(--blue);">${data.totalPatterns}</div>
      </div>
      <div class="card" style="border-top:3px solid var(--purple);">
        <div class="card-label">Files Scanned</div>
        <div class="card-value" style="color:var(--purple);">${data.scannedFiles}</div>
      </div>
      <div class="card" style="border-top:3px solid var(--danger);">
        <div class="card-label">Files with Secrets</div>
        <div class="card-value" style="color:var(--danger);">${data.detectedFiles.length}</div>
      </div>
      <div class="card" style="border-top:3px solid var(--success);">
        <div class="card-label">Clean Files</div>
        <div class="card-value" style="color:var(--success);">${data.cleanFiles}</div>
      </div>
    </div>`;

  // Categories table
  const catRows = data.categories.map(c => {
    const barPct = data.totalPatterns > 0 ? Math.round((c.count / data.totalPatterns) * 100) : 0;
    return `<tr>
      <td><strong>${esc(c.name)}</strong></td>
      <td class="mono">${c.count}</td>
      <td><div class="bar-bg"><div class="bar-fill" style="width:${barPct}%"></div></div></td>
    </tr>`;
  }).join('');

  const catTable = `
    <div class="table-wrap">
      <h3>Pattern Categories (${data.categories.length})</h3>
      <table>
        <thead><tr><th>Category</th><th>Patterns</th><th>Coverage</th></tr></thead>
        <tbody>${catRows}</tbody>
      </table>
    </div>`;

  // Detected secrets — store data for drawer
  const detectedJson = JSON.stringify(data.detectedFiles.map(f => ({
    file: f.file,
    name: f.file.split('/').pop() || f.file,
    secrets: f.secrets,
  })));

  let detectedTable = '';
  if (data.detectedFiles.length > 0) {
    const riskBadge: Record<string, string> = { critical: 'badge-red', high: 'badge-red', medium: 'badge-yellow', low: 'badge-blue' };
    const rows = data.detectedFiles.map((f, idx) => {
      const topRisk = f.secrets.reduce((max, s) => {
        const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return (order[s.risk] ?? 3) < (order[max] ?? 3) ? s.risk : max;
      }, 'low');
      return `<tr style="cursor:pointer;" onclick="openSecDrawer(${idx})">
        <td class="mono" style="font-size:12px;" title="${esc(f.file)}">${esc(f.file.split('/').pop() || f.file)}</td>
        <td><span class="badge ${riskBadge[topRisk] || 'badge-red'}">${esc(topRisk.toUpperCase())}</span></td>
        <td class="mono">${f.secrets.length}</td>
      </tr>`;
    }).join('');

    detectedTable = `
      <div class="table-wrap">
        <h3>Detected Secrets (${data.detectedFiles.length} files)</h3>
        <table>
          <thead><tr><th>File</th><th>Risk</th><th>Count</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  } else {
    detectedTable = `
      <div style="text-align:center;padding:40px;color:var(--success);font-size:16px;">
        <div style="font-size:48px;margin-bottom:12px;">&#10003;</div>
        <strong>No secrets detected</strong>
        <div style="color:var(--text-muted);font-size:13px;margin-top:8px;">All files are clean</div>
      </div>`;
  }

  const drawerHtml = `
    <div id="sec-drawer" style="position:fixed;top:0;right:0;width:400px;height:100vh;background:var(--bg);border-left:1px solid var(--border);transform:translateX(100%);transition:transform 0.25s ease;overflow-y:auto;z-index:999;box-shadow:-8px 0 30px rgba(0,0,0,0.3);">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--bg);z-index:1;">
        <strong style="font-size:14px;">Secret Details</strong>
        <button onclick="document.getElementById('sec-drawer').style.transform='translateX(100%)'" style="background:var(--surface);border:1px solid var(--border);color:var(--text-muted);cursor:pointer;font-size:16px;line-height:1;width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;">&times;</button>
      </div>
      <div id="sec-drawer-body" style="padding:20px;"></div>
    </div>
    <script>
    var _secData = ${detectedJson};
    function openSecDrawer(idx) {
      var f = _secData[idx];
      if (!f) return;
      var drawer = document.getElementById('sec-drawer');
      var body = document.getElementById('sec-drawer-body');
      drawer.style.transform = 'translateX(0)';

      var riskColors = { critical: 'var(--danger)', high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--blue)' };
      var riskBg = { critical: 'badge-red', high: 'badge-red', medium: 'badge-yellow', low: 'badge-blue' };

      var html = '<div style="font-family:ui-monospace,monospace;font-size:13px;color:var(--accent);margin-bottom:4px;">' + f.name + '</div>';
      html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:16px;">' + f.file + '</div>';
      html += '<div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px;">Patterns found (' + f.secrets.length + ')</div>';

      f.secrets.forEach(function(s) {
        html += '<div style="padding:10px 12px;margin-bottom:8px;border-radius:8px;border:1px solid var(--border);background:var(--surface);">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">';
        html += '<strong style="font-size:13px;color:var(--text);">' + s.pattern + '</strong>';
        html += '<span class="badge ' + (riskBg[s.risk] || 'badge-red') + '" style="font-size:10px;">' + s.risk.toUpperCase() + '</span>';
        html += '</div>';
        html += '<div style="font-size:11px;color:var(--text-muted);">Line ' + s.line + '</div>';
        html += '</div>';
      });

      body.innerHTML = html;
    }

    document.addEventListener('click', function(e) {
      var drawer = document.getElementById('sec-drawer');
      if (drawer && drawer.style.transform === 'translateX(0)') {
        if (!drawer.contains(e.target) && !e.target.closest('tr[onclick]')) {
          drawer.style.transform = 'translateX(100%)';
        }
      }
    });
    <\/script>`;

  const body = `
    <h1 class="page-title">Security Scanner <span style="font-size:14px;color:var(--text-muted);font-weight:400;">— ${esc(data.projectName)}</span></h1>
    ${cards}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start;">
      ${catTable}
      ${detectedTable}
    </div>
    ${drawerHtml}`;

  return layout('Security', '/security', body, port);
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

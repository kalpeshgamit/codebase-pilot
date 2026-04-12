// src/ui/kit.ts — codebase-ui-kit: shared design tokens, layout shell, and theme system.
// Import { layout, T } in any page module — zero duplication, single source of truth.

import { dirname, resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Read version from package.json (works from both src/ui/ and dist/)
const __kit_dir = dirname(fileURLToPath(import.meta.url));
let PKG_VERSION = '0.3.5';
for (const rel of ['..', '../..']) {
  try {
    const p = resolve(__kit_dir, rel, 'package.json');
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, 'utf8');
    if (raw.includes('"codebase-pilot')) { PKG_VERSION = JSON.parse(raw).version; break; }
  } catch { /* try next */ }
}

// Inline logo as data URI — works regardless of install method (npm global, local, dev)
let LOGO_DATA_URI = '';
for (const rel of ['..', '../..']) {
  try {
    const logoPath = resolve(__kit_dir, rel, 'dist', 'logo.png');
    const docsPath = resolve(__kit_dir, rel, 'docs', 'logo-05-dark.png');
    const p = existsSync(logoPath) ? logoPath : existsSync(docsPath) ? docsPath : '';
    if (p) { LOGO_DATA_URI = `data:image/png;base64,${readFileSync(p).toString('base64')}`; break; }
  } catch { /* try next */ }
}

// ---------------------------------------------------------------------------
// Design tokens — single source of truth for all colors, fonts, spacing
// ---------------------------------------------------------------------------

export const T = {
  bg: '#0d1117',
  surface: '#161b22',
  surfaceHover: '#1c2129',
  border: '#30363d',
  text: '#e6edf3',
  textMuted: '#8b949e',
  accent: '#E8823A',
  success: '#FFB347',
  warning: '#d29922',
  danger: '#f85149',
  font: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  mono: "ui-monospace, 'SF Mono', 'Cascadia Code', 'Fira Code', monospace",
} as const;

// ---------------------------------------------------------------------------
// Shared layout — assembles full HTML page with sidebar, nav, theme system
// ---------------------------------------------------------------------------

export function layout(title: string, activePage: string, body: string, port: number, headExtra = ''): string {
  const NAV_GREEN = '#E8823A';
  const NAV_GREEN_DARK = '#D4722E';
  const NAV_GREEN_LIGHT = '#E8823A';
  const NAV_GREEN_LIGHT_DARK = '#C4621E';
  const nav = [
    { href: '/', label: 'Dashboard', icon: 'layout-dashboard', color: NAV_GREEN, lightColor: NAV_GREEN_LIGHT, gradient: `linear-gradient(135deg, ${NAV_GREEN}, ${NAV_GREEN_DARK})`, lightGradient: `linear-gradient(135deg, ${NAV_GREEN_LIGHT}, ${NAV_GREEN_LIGHT_DARK})` },
    { href: '/projects', label: 'Projects', icon: 'folder-kanban', color: NAV_GREEN, lightColor: NAV_GREEN_LIGHT, gradient: `linear-gradient(135deg, ${NAV_GREEN}, ${NAV_GREEN_DARK})`, lightGradient: `linear-gradient(135deg, ${NAV_GREEN_LIGHT}, ${NAV_GREEN_LIGHT_DARK})` },
    { href: '/prompts', label: 'Prompts', icon: 'history', color: NAV_GREEN, lightColor: NAV_GREEN_LIGHT, gradient: `linear-gradient(135deg, ${NAV_GREEN}, ${NAV_GREEN_DARK})`, lightGradient: `linear-gradient(135deg, ${NAV_GREEN_LIGHT}, ${NAV_GREEN_LIGHT_DARK})` },
    { href: '/graph', label: 'Graph', icon: 'git-branch', color: NAV_GREEN, lightColor: NAV_GREEN_LIGHT, gradient: `linear-gradient(135deg, ${NAV_GREEN}, ${NAV_GREEN_DARK})`, lightGradient: `linear-gradient(135deg, ${NAV_GREEN_LIGHT}, ${NAV_GREEN_LIGHT_DARK})` },
    { href: '/search', label: 'Search', icon: 'search', color: NAV_GREEN, lightColor: NAV_GREEN_LIGHT, gradient: `linear-gradient(135deg, ${NAV_GREEN}, ${NAV_GREEN_DARK})`, lightGradient: `linear-gradient(135deg, ${NAV_GREEN_LIGHT}, ${NAV_GREEN_LIGHT_DARK})` },
    { href: '/agents', label: 'Agents', icon: 'bot', color: NAV_GREEN, lightColor: NAV_GREEN_LIGHT, gradient: `linear-gradient(135deg, ${NAV_GREEN}, ${NAV_GREEN_DARK})`, lightGradient: `linear-gradient(135deg, ${NAV_GREEN_LIGHT}, ${NAV_GREEN_LIGHT_DARK})` },
    { href: '/files', label: 'Files', icon: 'file-code-2', color: NAV_GREEN, lightColor: NAV_GREEN_LIGHT, gradient: `linear-gradient(135deg, ${NAV_GREEN}, ${NAV_GREEN_DARK})`, lightGradient: `linear-gradient(135deg, ${NAV_GREEN_LIGHT}, ${NAV_GREEN_LIGHT_DARK})` },
    { href: '/security', label: 'Security', icon: 'shield-check', color: NAV_GREEN, lightColor: NAV_GREEN_LIGHT, gradient: `linear-gradient(135deg, ${NAV_GREEN}, ${NAV_GREEN_DARK})`, lightGradient: `linear-gradient(135deg, ${NAV_GREEN_LIGHT}, ${NAV_GREEN_LIGHT_DARK})` },
  ];

  const activeNavColor = nav.find(n => n.href === activePage)?.color || '#E8823A';

  const navItems = nav
    .map(n => {
      const isActive = n.href === activePage;
      const cls = isActive ? ' class="active"' : '';
      const activeStyle = isActive ? ` style="border-left:3px solid var(--nav-color);"` : '';
      const iconStyle = isActive
        ? ` style="color:var(--nav-color);"`
        : ` style="color:var(--text-muted);"`;
      const labelStyle = isActive
        ? ` style="color:var(--nav-color);font-weight:600;"`
        : ` style="color:var(--text-muted);"`;
      // Design rule: inactive = gray, active/hover = orange (signature accent)
      return `<a href="${n.href}"${cls}${activeStyle} data-color="${n.color}" data-light-color="${n.lightColor}"><i data-lucide="${n.icon}" class="nav-icon"${iconStyle}></i><span${labelStyle}>${n.label}</span></a>`;
    })
    .join('\n        ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script>try{if(localStorage.getItem('cp-theme')==='light')document.documentElement.classList.add('light');}catch(e){}</script>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
<title>${title} - codebase-pilot</title>
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility; }

  :root {
    --bg: #141824;
    --sidebar-bg: #1c1c1e;
    --sidebar-border: rgba(255, 255, 255, 0.07);
    --surface: #1a1e2e;
    --surface-hover: #222738;
    --border: #2a2f42;
    --glass: rgba(26, 30, 46, 0.85);
    --glass-border: rgba(255, 255, 255, 0.05);
    --nav-color: #E8823A;
    --nav-color-dashboard: #E8823A;
    --nav-color-projects: #E8823A;
    --nav-color-prompts: #E8823A;
    --nav-color-graph: #E8823A;
    --nav-color-search: #E8823A;
    --nav-color-agents: #E8823A;
    --nav-color-files: #E8823A;
    --nav-color-security: #E8823A;
    --nav-gradient: linear-gradient(135deg, #E8823A, #D4722E);
    --nav-gradient-dashboard: linear-gradient(135deg, #E8823A, #D4722E);
    --nav-gradient-projects: linear-gradient(135deg, #E8823A, #D4722E);
    --nav-gradient-prompts: linear-gradient(135deg, #E8823A, #D4722E);
    --nav-gradient-graph: linear-gradient(135deg, #E8823A, #D4722E);
    --nav-gradient-search: linear-gradient(135deg, #E8823A, #D4722E);
    --nav-gradient-agents: linear-gradient(135deg, #E8823A, #D4722E);
    --nav-gradient-files: linear-gradient(135deg, #E8823A, #D4722E);
    --nav-gradient-security: linear-gradient(135deg, #E8823A, #D4722E);
    --nav-active-bg: linear-gradient(135deg, rgba(232,130,58,0.22), rgba(212,114,46,0.14));
    --nav-hover-bg: rgba(232, 130, 58, 0.1);
    --text: #e6edf3;
    --text-muted: #9ca3af;
    --text-dim: #6b7280;
    --accent: #E8823A;
    --success: #FFB347;
    --warning: #d29922;
    --danger: #f85149;
    --purple: #FFB347;
    --blue: #F4A261;
  }

  html.light {
    --bg: #FAF7F4;
    --sidebar-bg: #ffffff;
    --sidebar-border: rgba(0, 0, 0, 0.07);
    --surface: #ffffff;
    --surface-hover: #f5f0eb;
    --border: #e8ddd4;
    --glass: rgba(255, 255, 255, 0.7);
    --glass-border: rgba(0, 0, 0, 0.06);
    --nav-color: #E8823A;
    --nav-color-dashboard: #E8823A;
    --nav-color-projects: #E8823A;
    --nav-color-prompts: #E8823A;
    --nav-color-graph: #E8823A;
    --nav-color-search: #E8823A;
    --nav-color-agents: #E8823A;
    --nav-color-files: #E8823A;
    --nav-color-security: #E8823A;
    --nav-gradient: linear-gradient(135deg, #E8823A, #D4722E);
    --nav-gradient-dashboard: linear-gradient(135deg, #E8823A, #D4722E);
    --nav-gradient-projects: linear-gradient(135deg, #E8823A, #D4722E);
    --nav-gradient-prompts: linear-gradient(135deg, #E8823A, #D4722E);
    --nav-gradient-graph: linear-gradient(135deg, #E8823A, #D4722E);
    --nav-gradient-search: linear-gradient(135deg, #E8823A, #D4722E);
    --nav-gradient-agents: linear-gradient(135deg, #E8823A, #D4722E);
    --nav-gradient-files: linear-gradient(135deg, #E8823A, #D4722E);
    --nav-gradient-security: linear-gradient(135deg, #E8823A, #D4722E);
    --nav-active-bg: linear-gradient(135deg, rgba(232,130,58,0.18), rgba(212,114,46,0.1));
    --nav-hover-bg: rgba(232, 130, 58, 0.08);
    --text: #1a1a1a;
    --text-muted: #6b7280;
    --text-dim: #9ca3af;
    --accent: #E8823A;
    --success: #D4722E;
    --warning: #ca8a04;
    --danger: #dc2626;
    --purple: #F4A261;
    --blue: #E8823A;
  }

  html { scroll-behavior: smooth; }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-10px); }
    to { opacity: 1; transform: translateX(0); }
  }

  @keyframes slideCard {
    from { opacity: 0; transform: translateY(16px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  @keyframes subtlePulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
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
    background: var(--sidebar-bg);
    border-right: 1px solid var(--sidebar-border);
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
    0% { box-shadow: 0 0 8px rgba(232,130,58,0.6), 0 0 16px rgba(232,130,58,0.3); }
    50% { box-shadow: 0 0 12px rgba(255,140,0,0.7), 0 0 24px rgba(255,100,0,0.4); }
    100% { box-shadow: 0 0 6px rgba(232,130,58,0.5), 0 0 12px rgba(232,130,58,0.2); }
  }

  @keyframes jetHover {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }

  .sidebar-brand {
    padding: 12px 16px 10px;
    border-bottom: 1px solid var(--sidebar-border);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .jet-wrapper {
    position: relative;
    display: inline-block;
  }

  .sidebar-brand img {
    width: 200px;
    height: auto;
    margin-bottom: 6px;
    filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    animation: jetHover 3s ease-in-out infinite;
  }

  .sidebar-brand:hover img {
    filter: drop-shadow(0 0 16px rgba(232,130,58,0.6)) drop-shadow(0 0 32px rgba(212,114,46,0.3));
    animation: jetHover 1.5s ease-in-out infinite;
    transform: scale(1.02);
  }

  html.light .sidebar-brand:hover img {
    filter: drop-shadow(0 0 12px rgba(22,163,74,0.5)) drop-shadow(0 0 24px rgba(8,145,178,0.25));
  }

  /* Tooltip */
  .stat-tooltip {
    position: fixed;
    z-index: 9999;
    background: rgba(13,17,23,0.97);
    border: 1px solid rgba(232,130,58,0.35);
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

  html.light .stat-tooltip {
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

  html.light .stat-tooltip .tip-row {
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
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.5px;
    background: linear-gradient(90deg, #E8823A, #FFB347, #E8823A);
    background-size: 300% 100%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: brandShimmer 6s ease-in-out infinite;
  }

  @keyframes brandShimmer {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  .sidebar-brand:hover .brand-text {
    animation-duration: 2s;
  }

  html.light .brand-text {
    background: linear-gradient(90deg, #E8823A, #FFB347, #E8823A);
    background-size: 300% 100%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: brandShimmer 6s ease-in-out infinite;
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
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .sidebar nav a {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: 8px;
    color: var(--text-muted);
    font-size: 13.5px;
    font-weight: 500;
    transition: all 0.18s ease;
    text-decoration: none;
    letter-spacing: 0.01em;
  }

  /* Inactive = always gray/neutral — orange is signature accent only */
  .sidebar nav a:hover {
    background: var(--nav-hover-bg);
    text-decoration: none;
  }
  .sidebar nav a:hover .nav-icon,
  .sidebar nav a:hover span {
    color: var(--nav-color) !important;
  }
  .sidebar nav a.active {
    font-weight: 600;
    padding-left: 9px;
    background: var(--nav-active-bg);
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
    background: rgba(232, 130, 58, 0.15);
    color: var(--accent);
    border-color: rgba(232, 130, 58, 0.3);
  }

  /* Light theme (overrides from html.light block above take full precedence) */
  html.light {
    --bg: #FAF7F4;
    --surface: #ffffff;
    --surface-hover: #f5f0eb;
    --border: #e8ddd4;
    --text: #1a1a1a;
    --text-muted: #6b7280;
    --accent: #E8823A;
    --success: #D4722E;
    --warning: #9a6700;
    --danger: #cf222e;
    --blue: #E8823A;
    --purple: #F4A261;
  }

  /* Light mode specific overrides (CSS vars handle most, these handle rgba/special cases) */
  html.light .sidebar { background: var(--sidebar-bg); box-shadow: 2px 0 12px rgba(0,0,0,0.06); }
  html.light .sidebar-brand { border-bottom-color: rgba(0,0,0,0.08); }
  html.light .sidebar-brand img { filter: drop-shadow(0 2px 8px rgba(0,0,0,0.12)); }
  html.light .sidebar nav a:hover { background: var(--nav-hover-bg); }
  html.light .sidebar nav a.active { background: rgba(232,130,58,0.13); color: #E8823A; }
  html.light .sidebar nav a:hover { color: #E8823A; }
  html.light .sidebar-footer { border-top-color: rgba(0,0,0,0.08); }
  html.light .card-value { color: #1a1a2e; }
  html.light thead th { background: #f8fafb; }
  html.light .badge-blue { background: #fef0e6; color: #E8823A; }
  html.light .badge-green { background: #fef0e6; color: #E8823A; border-color: #f4c9a0; }
  html.light .badge-yellow { background: #fef9c3; color: #a16207; }
  html.light .badge-red { background: #fee2e2; color: #dc2626; }
  html.light .search-box { background: #ffffff; color: var(--text); border-color: #d8dee4; }
  html.light .search-box:focus { border-color: #E8823A; box-shadow: 0 0 0 3px rgba(232,130,58,0.15); }
  html.light .search-result { background: #ffffff; border-color: #e2e8f0; }
  html.light a { color: #E8823A; }
  html.light .savings-bar-track { background: #e2e8f0; }
  html.light .bar-bg { background: #e2e8f0; }
  html.light .page-title { color: #1a1a2e; }
  html.light .section-title { color: #1a1a2e; }

  /* Main content */
  .main {
    flex: 1;
    margin-left: 220px;
    padding: 28px 36px;
    height: 100vh;
    overflow-y: auto;
    animation: fadeIn 0.3s ease both;
    background: var(--bg);
    position: relative;
  }

  /* Animated gradient mesh — uses active page color */
  .main::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 100%;
    min-height: 100vh;
    pointer-events: none;
    z-index: 0;
    opacity: 0.04;
    background:
      radial-gradient(ellipse 500px 350px at 30% 20%, var(--page-color, #E8823A), transparent),
      radial-gradient(ellipse 400px 350px at 70% 70%, var(--page-color, #E8823A), transparent);
    animation: meshFloat 20s ease-in-out infinite alternate;
  }
  html.light .main::before { opacity: 0.03; }

  @keyframes meshFloat {
    0% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(20px, -15px) scale(1.02); }
    66% { transform: translate(-15px, 10px) scale(0.98); }
    100% { transform: translate(10px, 5px) scale(1.01); }
  }

  .main > * { position: relative; z-index: 1; }

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
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    animation: slideCard 0.5s cubic-bezier(0.4, 0, 0.2, 1) both;
    position: relative;
    overflow: hidden;
  }

  /* Subtle top highlight line */
  .card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
  }

  .card:nth-child(1) { animation-delay: 0.05s; }
  .card:nth-child(2) { animation-delay: 0.1s; }
  .card:nth-child(3) { animation-delay: 0.15s; }
  .card:nth-child(4) { animation-delay: 0.2s; }
  .card:nth-child(5) { animation-delay: 0.25s; }

  .card:hover {
    transform: translateY(-2px);
    border-color: rgba(232, 130, 58, 0.35);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(232, 130, 58, 0.1);
  }

  html.light .card {
    background: #ffffff;
    border-color: #e2e8f0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  html.light .card::before { background: linear-gradient(90deg, transparent, rgba(0,0,0,0.03), transparent); }
  html.light .card:hover { transform: translateY(-2px); border-color: rgba(22,163,74,0.3); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }

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
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 24px;
    animation: fadeIn 0.5s ease both;
    animation-delay: 0.2s;
  }

  html.light .table-wrap {
    background: #ffffff;
    border-color: #e2e8f0;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
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
    background: linear-gradient(90deg, var(--accent), #D4722E);
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

  .badge-blue { background: rgba(232,130,58,0.12); color: var(--accent); }
  .badge-green { background: rgba(232,130,58,0.15); color: var(--success); border: 1px solid rgba(232,130,58,0.25); }
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
    background: #4a4a55;
  }

  .savings-bar-saved {
    height: 100%;
    background: #E8823A;
  }

  html.light .savings-bar-used { background: #555560; }
  html.light .savings-bar-saved { background: #E8823A; }
  html.light .savings-bar-track { background: #f0e8df; }

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

  .legend-used::before { background: #4a4a55 !important; }
  .legend-saved::before { background: #E8823A !important; }

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
<script>
// CoPilot WebSocket client — wraps native WS to provide EventEmitter-style API
window.CpSocket = (function() {
  var handlers = {};
  var ws;
  var reconnectDelay = 1000;
  function connect() {
    var proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(proto + '://' + location.host);
    ws.onopen = function() { reconnectDelay = 1000; };
    ws.onmessage = function(e) {
      try {
        var msg = JSON.parse(e.data);
        var fns = handlers[msg.event] || [];
        for (var i = 0; i < fns.length; i++) fns[i]({ data: JSON.stringify(msg.data) });
        var all = handlers['*'] || [];
        for (var j = 0; j < all.length; j++) all[j](msg);
      } catch(err) {}
    };
    ws.onerror = function() {};
    ws.onclose = function() {
      setTimeout(connect, Math.min(reconnectDelay, 30000));
      reconnectDelay = Math.min(reconnectDelay * 2, 30000);
      var fns = handlers['_close'] || [];
      for (var i = 0; i < fns.length; i++) fns[i]();
    };
  }
  connect();
  return {
    addEventListener: function(event, fn) {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(fn);
    },
    on: function(event, fn) { this.addEventListener(event, fn); },
    get onerror() { return null; },
    set onerror(fn) { handlers['_close'] = handlers['_close'] || []; handlers['_close'].push(fn); }
  };
})();
</script>
</head>
<body>
  <aside class="sidebar">
    <div class="sidebar-brand">
      <div class="jet-wrapper">
        <img src="${LOGO_DATA_URI || '/static/logo.png'}" alt="codebase-pilot" onerror="this.style.display='none'" />
      </div>
      <div class="brand-text" style="margin-top:-6px;text-align:center;">Codebase Pilot</div>
    </div>
    <nav>
      ${navItems}
    </nav>
    <div class="sidebar-footer" style="flex-direction:column;gap:8px;">
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <a href="https://github.com/kalpeshgamit/codebase-pilot" target="_blank" style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;background:rgba(232,130,58,0.12);color:var(--accent);font-size:10px;font-weight:600;text-decoration:none;"><i data-lucide="github" style="width:11px;height:11px;"></i>GitHub</a>
        <a href="https://www.npmjs.com/package/codebase-pilot-cli" target="_blank" style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;background:rgba(232,130,58,0.12);color:var(--accent);font-size:10px;font-weight:600;text-decoration:none;"><i data-lucide="package" style="width:11px;height:11px;"></i>npm v${PKG_VERSION}</a>
        <span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;background:rgba(232,130,58,0.12);color:var(--accent);font-size:10px;font-weight:600;"><i data-lucide="hexagon" style="width:11px;height:11px;"></i>Node &ge;18</span>
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
  <main class="main" style="--page-color:${activeNavColor}">
    ${body}
  </main>
<script>
function toggleTheme() {
  var isLight = document.documentElement.classList.toggle('light');
  localStorage.setItem('cp-theme', isLight ? 'light' : 'dark');
  document.querySelectorAll('.theme-icon-dark').forEach(function(el) { el.style.display = isLight ? 'none' : ''; });
  document.querySelectorAll('.theme-icon-light').forEach(function(el) { el.style.display = isLight ? '' : 'none'; });
}
(function() {
  var saved = localStorage.getItem('cp-theme');
  if (saved === 'light') {
    document.documentElement.classList.add('light');
    document.querySelectorAll('.theme-icon-dark').forEach(function(el) { el.style.display = 'none'; });
    document.querySelectorAll('.theme-icon-light').forEach(function(el) { el.style.display = ''; });
  } else {
    localStorage.setItem('cp-theme', 'dark');
  }
  if (window.lucide) lucide.createIcons();

  // Tooltip system — uses safe DOM methods (textContent only, no innerHTML)
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
          while (tip.firstChild) tip.removeChild(tip.firstChild);
          if (obj.title) {
            var t = document.createElement('strong');
            t.textContent = obj.title;
            tip.appendChild(t);
          }
          (obj.rows || []).forEach(function(row) {
            var d = document.createElement('div');
            d.className = 'tip-row';
            var kSpan = document.createElement('span');
            kSpan.className = 'tip-key';
            kSpan.textContent = row[0];
            var vSpan = document.createElement('span');
            vSpan.className = 'tip-val';
            vSpan.textContent = row[1];
            d.appendChild(kSpan);
            d.appendChild(vSpan);
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

  // Abbreviate large numbers: 9.9M, 15.1M, 130K etc.
  function fmtShortJS(n) {
    var safe = Number(n) || 0;
    if (safe >= 1e9) return (safe / 1e9).toFixed(safe >= 1e10 ? 1 : 2).replace(/\\.?0+$/, '') + 'B';
    if (safe >= 1e6) return (safe / 1e6).toFixed(safe >= 1e8 ? 1 : 2).replace(/\\.?0+$/, '') + 'M';
    if (safe >= 1e4) return (safe / 1e3).toFixed(1).replace(/\\.?0+$/, '') + 'K';
    return safe.toLocaleString('en-US');
  }

  function scaleCardValue(el) {
    el.classList.remove('lg', 'xl');
    var txt = (el.textContent || '');
    if (txt.endsWith('B') || txt.endsWith('M') || txt.endsWith('K')) return;
    var len = txt.replace(/[^0-9]/g, '').length;
    if (len >= 10) el.classList.add('xl');
    else if (len >= 7) el.classList.add('lg');
  }
  document.querySelectorAll('.card-value').forEach(function(el) { scaleCardValue(el); });

  // Animate numbers: count up from 0 to target value
  document.querySelectorAll('.card-value').forEach(function(el) {
    var titleVal = el.querySelector('span[title]');
    var rawText = titleVal ? titleVal.getAttribute('title').replace(/,/g, '') : (el.textContent || '').replace(/,/g, '');
    var target = parseFloat(rawText);
    if (isNaN(target) || target === 0) return;
    var duration = 1200;
    var start = performance.now();
    el.textContent = '0';

    function step(now) {
      var progress = Math.min((now - start) / duration, 1);
      var ease = 1 - Math.pow(1 - progress, 3);
      var current = Math.round(target * ease);
      el.textContent = fmtShortJS(current);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        var abbr = fmtShortJS(target);
        var full = Math.round(target).toLocaleString('en-US');
        if (abbr !== full) {
          var sp = document.createElement('span');
          sp.setAttribute('title', full);
          sp.textContent = abbr;
          while (el.firstChild) el.removeChild(el.firstChild);
          el.appendChild(sp);
        } else {
          el.textContent = abbr;
        }
        scaleCardValue(el);
      }
    }
    requestAnimationFrame(step);
  });
})();

</script>
</body>
</html>`;
}

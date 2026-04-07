# Changelog

All notable changes to codebase-pilot are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/).

## [0.8.2] — 2026-04-07

### Added
- **`codebase-pilot compare`** — token impact of changes with $ cost
- **Cost estimation ($)** — real dollar values in CLI, dashboard, tooltips
- **Project Health Score** — circular SVG indicator (0-100) on dashboard
- **Pre-commit hook** — `init` auto-installs git hook for secret scanning
- **GitHub Action** — `action.yml` for CI/CD, PR token report workflow
- **`/api/export`** — full dashboard data as JSON
- **`/api/badge`** — dynamic SVG badge showing savings %
- **Sparklines** in dashboard stat cards (7-day trends)
- **7-day token trend chart** — stacked daily bars
- **Smart suggestions card** — actionable tips on dashboard
- **Welcome screen** — 3-step guide for new users
- **Security health score** — 97% Excellent badge
- **Risk distribution chart** — color-coded severity bar
- **Language distribution bar** — visual breakdown on dashboard
- **File size warnings** — red L (>10K), orange M (>5K) on Files page
- **Project comparison chart** — horizontal bars on Projects page
- **Agent summary stats** — model cost indicators ($/$$$/$$$$)
- **Search tips** — quick-search buttons
- **Graph stats overlay** — nodes, edges, directories, tokens
- **Impact flow diagram** — visual dependency chain

## [0.5.1] — 2026-04-07

### Security
- Added `.safeskill.yml` machine-readable permissions manifest
- Removed `child_process` from `log-prompt.ts` — reads `.git/HEAD` directly
- 2 fewer critical SafeSkill findings

## [0.5.0] — 2026-04-07

### Security
- Comprehensive `SECURITY.md` with full permissions manifest
- Privacy policy: zero AI API access, zero telemetry, zero cloud
- Dynamic SafeSkill badge in README

## [0.4.x] — 2026-04-07

### Added
- **Claude Code Plugin Marketplace** — `/plugin marketplace add kalpeshgamit/codebase-pilot`
- **4 Skills**: pack-context, impact-analysis, scan-secrets, token-budget
- **`--dry-run`** flag: preview pack without writing output
- **`--affected`** flag: incremental pack using SHA-256 change detection
- **`--prune <file>`** flag: minimum context via import graph traversal
- **Git context tracking**: branch, commit, hash, dirty count, duration
- **Prompt session drawer**: click any row for detailed breakdown
- **User prompt capture** via Claude Code `UserPromptSubmit` hook
- **MCP tool call tracking**: `pack_codebase` calls logged automatically
- **Lazy loading tables**: 10 initial + "Show more" across all pages
- **Auto port fallback**: tries next 20 ports on EADDRINUSE
- `/api/health` and `/api/prompt-logs` endpoints

### Fixed
- EMFILE crash on large projects — watch only source dirs at depth 3
- Phantom sessions on fresh install — no auto-pack without prior history
- Logo missing on npm installs — embedded as base64 data URI
- Version showing v0.2.0 — dynamic read from package.json
- Autopilot cooldown not enforced on file changes
- Drawer broken by newlines/quotes in prompt text

## [0.3.x] — 2026-04-07

### Added
- `codebase-pilot service` — macOS launchd, Linux systemd, Windows Task Scheduler
- Native WebSocket server replacing SSE
- Autopilot daemon — always-on background tracking
- Background worker thread for non-blocking pack
- K/M/B number abbreviation with hover tooltips
- Prompts page with live table
- Content-hash cache for fast page loads

## [0.2.0] — 2026-04-06

### Added
- Web dashboard (8 pages): Dashboard, Projects, Prompts, Graph, Search, Agents, Files, Security
- MCP server: 10 tools + 3 prompts over stdio
- Blast radius analysis with risk scoring (0-100)
- Full-text search (SQLite FTS5, BM25 ranking)
- D3.js import graph visualization
- Watch mode with chokidar
- Multi-platform configs (Cursor, Windsurf, Codex)
- Benchmarks (`eval` command)
- Usage stats (project + system-wide)
- Incremental SHA-256 change detection

## [0.1.0] — 2026-04-05

### Added
- Initial release
- `init`, `scan`, `pack`, `tokens`, `health`, `fix`, `eject` commands
- Security scanner: 180 patterns, 15 categories
- Code compression: 8 languages, 60-90% token reduction
- 76 languages, 58 frameworks, 39 test runners, 32 ORMs
- CI: GitHub Actions (ubuntu, macos, windows)

[0.5.1]: https://github.com/kalpeshgamit/codebase-pilot/releases/tag/v0.5.1
[0.5.0]: https://github.com/kalpeshgamit/codebase-pilot/releases/tag/v0.5.0
[0.2.0]: https://github.com/kalpeshgamit/codebase-pilot/releases/tag/v0.2.0
[0.1.0]: https://github.com/kalpeshgamit/codebase-pilot/releases/tag/v0.1.0

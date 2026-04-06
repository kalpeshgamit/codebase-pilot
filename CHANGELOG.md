# Changelog

## [0.2.0] — 2026-04-06

### Added

**Web Dashboard UI**
- `codebase-pilot ui` — web dashboard at http://localhost:7456 (PILOT on phone keypad)
- Background daemon mode — starts, stops, auto-restarts, survives terminal close
- `--stop`, `--status`, `--foreground` flags for daemon control
- PID tracking at `~/.codebase-pilot/ui.pid`, logs at `~/.codebase-pilot/ui.log`
- 6 pages: Dashboard, Graph, Search, Agents, Files, Impact
- Real-time updates via Server-Sent Events (SSE) — zero polling
- File watcher pushes live changes to all connected browsers
- Dark theme with glassmorphism, staggered animations, gradient accents
- Responsive sidebar collapses on mobile
- JSON APIs: `/api/stats`, `/api/search`, `/api/graph`, `/api/events`

**MCP Server**
- `codebase-pilot serve` — MCP server over stdio transport
- 10 tools: `scan_project`, `pack_codebase`, `count_tokens`, `health_check`, `scan_secrets`, `list_agents`, `get_agent`, `detect_languages`, `get_savings`, `list_files`
- 3 prompts: `review`, `onboard`, `optimize`
- Zero external deps — pure JSON-RPC over Content-Length framed stdio
- Works with Claude Code, Cursor, Zed, and any MCP-compatible tool

**Blast Radius / Change Impact**
- `codebase-pilot impact` — project-wide import graph summary
- `codebase-pilot impact --file <path>` — blast radius for a specific file
- Import graph: regex-based extraction for TS/JS/Python/Go/Rust
- ESM `.js` → `.ts` resolution for TypeScript projects
- Risk scoring (0–100): low/medium/high/critical based on dependent count, test coverage, file type
- Shows direct dependents, transitive dependents, affected tests

**Full-Text Search**
- `codebase-pilot search <query>` — FTS5 full-text search with BM25 ranking
- SQLite-backed search index at `.codebase-pilot/search.db`
- Snippet extraction with highlighted matches
- `--rebuild` flag to re-index, `--limit` for result count

**Code Visualization**
- `codebase-pilot visualize` — D3.js interactive force-directed import graph
- Self-contained HTML file with dark theme
- Nodes sized by token count, colored by directory
- Drag, zoom, search, hover tooltips, click-to-focus

**Watch Mode**
- `codebase-pilot watch` — file watching with chokidar, debounced re-scan
- Auto-updates agents.json on file changes
- Ignores node_modules, dist, .git, coverage

**Multi-Platform Config**
- `codebase-pilot init --platform cursor,windsurf,codex`
- `.cursorrules` — Cursor AI rules file
- `.windsurfrules` — Windsurf/Codeium rules file
- `AGENTS.md` — OpenAI Codex agent definitions
- Non-destructive merge: appends `[codebase-pilot]` section if file exists

**Benchmarks**
- `codebase-pilot eval` — benchmark tokens, compression ratio, import graph, timing
- Multi-project support: point to a directory of projects
- Table output with per-project details

**Usage Stats**
- `codebase-pilot stats` — project-level usage history
- `codebase-pilot stats --global` — system-wide stats across all projects
- Today / week / month / all-time breakdowns
- Per-project summary table with savings and last-used date
- Recent sessions with full details (command, flags, raw/packed/saved)

**Incremental Updates**
- SHA-256 hash-based change detection
- Only re-scans modified files on subsequent runs
- File hashes stored in `.codebase-pilot/file-hashes.json`

**System-Wide Storage**
- Global config directory: `~/.codebase-pilot/`
- `history.jsonl` — all pack runs across all projects
- `ui.pid` — daemon process tracking
- `ui.log` — daemon output log

**Governance**
- `SECURITY.md` — vulnerability reporting policy
- `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1

### Changed
- Version bumped to 0.2.0
- Description updated: "AI context engine — pack, compress, and optimize any codebase"
- `pack` command now logs project name, path, and command to both project and global logs
- `tokens` command shows savings estimate + daily/weekly stats from pack history
- `init` command prints new commands (pack, impact) in post-init guidance
- README fully rewritten with all new features, MCP setup, multi-platform docs

### Summary

| Metric | v0.1.0 | v0.2.0 |
|--------|--------|--------|
| CLI commands | 7 | **16** |
| MCP tools | 0 | **10** |
| MCP prompts | 0 | **3** |
| Web UI pages | 0 | **6** |
| Languages | 56 | 56 |
| Frameworks | 58 | 58 |
| Security patterns | 152 | 152 |
| Test runners | 39 | 39 |
| ORM detectors | 32 | 32 |
| Platform support | Claude Code | **Claude Code, Cursor, Windsurf, Codex** |
| Real-time updates | None | **SSE (Server-Sent Events)** |
| Background daemon | No | **Yes (port 7456)** |

[0.2.0]: https://github.com/nicgamit/codebase-pilot/releases/tag/v0.2.0

## [0.1.0] — 2026-04-03

### Added

**Context engine (pack + tokens)**
- `codebase-pilot pack` — pack codebase into XML or Markdown for AI context
- `codebase-pilot tokens` — per-file token breakdown with savings estimates and weekly stats
- `--compress` flag — regex-based code compression, 60-90% token reduction
- `--agent <name>` flag — scope pack/tokens to a single agent's context paths
- `--copy` flag — write output to stdout for clipboard piping
- Usage logger — tracks each pack run, shows today/weekly savings in `tokens` output

**Security scanner**
- 152 patterns across 15 categories
- Runs automatically on every `pack`, skips files with detected secrets

**Language registry (56 languages)**
- Tier 1 (17): full ecosystem detection
- Tier 2 (21): package manager + test runner
- Tier 3 (18): extension-only recognition

**Detection**
- 58 framework detectors across 14 languages
- 39 test runner detectors
- 32 ORM/database detectors

**Core commands**
- `init`, `scan`, `fix`, `health`, `eject`, `pack`, `tokens`

**CI / cross-platform**
- GitHub Actions: ubuntu, macos, windows x Node 18, 20, 22

[0.1.0]: https://github.com/nicgamit/codebase-pilot/releases/tag/v0.1.0

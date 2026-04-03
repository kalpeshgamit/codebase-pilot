# Roadmap

## v0.1.0 (Current) — Foundation

- [x] CLI entry point with 5 commands (init, scan, fix, health, eject)
- [x] Scanner: language detection (20+ languages)
- [x] Scanner: framework detection (25+ frameworks, monorepo-aware)
- [x] Scanner: database/ORM detection (12 ORMs, monorepo-aware)
- [x] Scanner: test runner detection (9 runners, monorepo-aware)
- [x] Scanner: monorepo + package boundary detection
- [x] Scanner: existing Claude Code config detection (merge, don't overwrite)
- [x] Agent generator: scan → agents.json with layers, models, dependencies
- [x] Pattern generator: auto-create dispatch patterns from detected packages
- [x] CLAUDE.md generator from scan results
- [x] .claudeignore generator with smart defaults
- [x] Slash commands: /dispatch and /healthcheck
- [x] .gitignore auto-updater
- [x] Healthcheck CLI: validates agents, paths, dependencies, layer ordering
- [x] Fix CLI: auto-repair stale context paths
- [x] Eject CLI: export + remove dependency
- [x] Tested on real monorepo (MCPHub: Express + Drizzle + 6 packages)

## v0.2.0 — Code Intelligence

- [ ] tree-sitter AST parsing engine
- [ ] `pilot_search` — semantic symbol search across codebase
- [ ] `pilot_outline` — structural file view (signatures only, bodies folded)
- [ ] `pilot_unfold` — expand single symbol by name
- [ ] AST indexer: build + cache symbol index in SQLite
- [ ] chokidar watcher: auto-reindex on file changes
- [ ] Dynamic grammar loading: only install detected language grammars

## v0.3.0 — Memory System

- [ ] SQLite memory DB (observations, file_history, ast_symbols tables)
- [ ] `pilot_memory_store` — save decisions/observations
- [ ] `pilot_memory_search` — query past decisions by keyword/tag
- [ ] `pilot_timeline` — file or session history
- [ ] Auto-save on significant events

## v0.4.0 — MCP Server

- [ ] stdio MCP server exposing all tools to Claude Code
- [ ] `codebase-pilot mcp-install` — register with Claude Code
- [ ] All 8 tools: search, outline, unfold, memory_store, memory_search, timeline, health, dispatch
- [ ] Zero-config: auto-detects project root, loads index

## v0.5.0 — Templates + Polish

- [ ] Pre-built project templates (monorepo, express-api, nextjs, fastapi, go-api)
- [ ] CLAUDE.md templates per stack
- [ ] Agent prompt templates (standards, supervisor review prompts)
- [ ] Vitest test suite
- [ ] CI/CD with GitHub Actions
- [ ] npm publish

## v1.0.0 — Production Release

- [ ] All features stable
- [ ] Test coverage > 80%
- [ ] Documentation complete
- [ ] Published to npm
- [ ] README with examples and screenshots
- [ ] GitHub repo public

## Future Ideas

- [ ] VS Code extension: visual agent dispatch
- [ ] Custom tool plugins: drop JS files in .codebase-pilot/tools/
- [ ] Multi-project support: shared memory across repos
- [ ] Token budget tracking: estimate cost before dispatch
- [ ] AI-powered scan: use Claude to analyze unknown project structures

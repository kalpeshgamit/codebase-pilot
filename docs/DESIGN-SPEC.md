# Design Specification

Date: 2026-04-03
Status: Approved

## Problem

Every Claude Code user wastes tokens through context bloat, no agent orchestration, no review gates, no memory persistence, and no noise filtering. We solved this for MCPHub with a 14-agent architecture and 7-layer context system. codebase-pilot packages it for any project.

## Solution

A zero-cloud CLI (7 commands) + optional MCP server that auto-detects any project's structure, generates a complete Claude Code optimization setup, and provides a context engine for packing, token estimation, security scanning, and code compression.

## Core Principles

1. Zero cloud — everything runs locally, no API calls, no accounts
2. Zero lock-in — eject anytime, all generated files are plain text
3. Zero runtime overhead — CLI generates static files, MCP server is optional
4. Language-agnostic — detects any language via file patterns + tree-sitter
5. Auto-everything — scans project, generates configs, detects drift, auto-fixes

## Context Engine

The context engine provides codebase packing and token management:

- **`pack` command** — Collect files, apply .claudeignore + agent scoping, detect secrets, optionally compress, output as XML or Markdown
- **`tokens` command** — Estimate token counts for files or agent-scoped contexts
- **Security scanning** — 152 regex patterns across 15 categories (API keys, cloud credentials, private keys, database URLs, JWT secrets, OAuth tokens, etc.)
- **Compression** — Tier A: regex-based function body folding for 8 languages; Tier B: tree-sitter AST compression (optional stub)

## Token Savings Target

~60-70% reduction through:
- Sub-agents load 2-4 files each vs entire codebase
- Targeted reads via AST search (50 tokens vs 3,000)
- CLAUDE.md auto-cached by Anthropic
- .claudeignore filters 100K+ tokens of junk
- Minimal MCP server overhead (1 optional vs 5)

## Dependencies (Total ~6MB)

| Package | Purpose |
|---------|---------|
| commander | CLI argument parsing |
| better-sqlite3 | Memory + AST index DB |
| chokidar | File watcher for auto-reindex |
| tree-sitter | AST parsing engine (optional) |
| tree-sitter-* | Language grammars (on-demand, optional) |

## Generated Files

| File | Purpose | Gitignored |
|------|---------|------------|
| CLAUDE.md | Prompt cache | Yes (recommended) |
| .claudeignore | Noise filter | Yes |
| .codebase-pilot/agents.json | Agent definitions | Yes |
| .codebase-pilot/index.sqlite | AST + memory DB | Yes |
| .claude/commands/dispatch.md | Dispatch slash command | Yes |
| .claude/commands/healthcheck.md | Healthcheck slash command | Yes |

## MCP Tools (v0.4.0)

| Tool | Tokens | Description |
|------|--------|-------------|
| pilot_search | ~50 | tree-sitter AST search |
| pilot_outline | ~200 | Structural file view |
| pilot_unfold | ~150 | Expand single symbol |
| pilot_memory_store | ~10 | Save decision to SQLite |
| pilot_memory_search | ~300 | Query past decisions |
| pilot_timeline | ~200 | File/session history |
| pilot_health | ~500 | Run healthcheck |
| pilot_dispatch | ~200 | Dispatch sub-agents |

## Origin

Designed and proven in the MCPHub project (Express + Drizzle + 6-package monorepo). Architecture evolved through:
1. 14-agent orchestration spec
2. Healthcheck pre-flight system
3. Standards-agent (SOLID review) + supervisor-agent (behavior audit)
4. 7-layer context architecture optimization
5. Reduced MCP servers from 5 → 2
6. Tested with real dispatch (mcphub doctor --verbose)

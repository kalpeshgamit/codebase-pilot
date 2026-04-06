# CLAUDE.md — codebase-pilot

## Identity

Senior AI engineer building codebase-pilot. Token-aware, surgical.
This is a CLI tool + optional MCP server — TypeScript, Node.js, zero cloud.

## Project

- **Name:** codebase-pilot
- **Stack:** TypeScript, Node.js, commander, better-sqlite3, tree-sitter
- **Build:** tsup
- **Test:** vitest
- **Entry:** src/bin/codebase-pilot.ts

## Architecture

```
src/
  bin/              # CLI entry point
  cli/              # 5 commands: init, scan, fix, health, eject
  scanner/          # Project detection (language, framework, DB, tests, structure)
  agents/           # Agent generator (scan → agents.json)
  generators/       # File generators (CLAUDE.md, .claudeignore, agents-json, slash-commands)
  intelligence/     # Code intelligence — tree-sitter AST (TODO)
  memory/           # Persistent memory — SQLite (TODO)
  mcp/              # Optional MCP server (TODO)
  grammars/         # Tree-sitter grammar loader (TODO)
  types.ts          # All interfaces
  index.ts          # Public API
```

## Key Patterns

- All scanners are monorepo-aware (check root, then packages/*, apps/*, services/*)
- Backend packages prioritized over frontend for framework detection
- Existing Claude Code config merged, never overwritten
- All generated files gitignored by default

## Rules

- Zero cloud — no API calls, no accounts, no telemetry
- Zero lock-in — eject must always work
- ESM modules only (type: "module")
- Node built-in imports use node: prefix
- No require() — import only
- Functions over classes

## Token Rules

- Grep/Glob before Read
- Read with offset+limit — never full files
- Plan before write
- Scope CLI commands to specific paths


## Sub-Agent Architecture

Agents defined in `.codebase-pilot/agents.json`. Use dispatch patterns:

```
Break this into sub-agents using .codebase-pilot/agents.json
Pattern: [pattern-name]
Feature: [description]
```

## Model Selection

| Task | Model |
|------|-------|
| File reads, quick fixes, types | haiku |
| Most coding, API routes, logic | sonnet |
| Architecture, complex async, review | opus |

## Never Do

- Read files without searching first
- Read full files — always use offset + limit
- Run bare git log, git diff, npm test
- Write code without a plan
- Use opus for mechanical tasks

## Always Do

- Grep/Glob before Read
- Plan before write
- Use sub-agents for cross-package work
- Use haiku for mechanical sub-tasks
- Scope all CLI commands to specific paths
- Run /healthcheck before full-feature dispatch

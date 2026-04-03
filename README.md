# codebase-pilot

Claude Code Optimization Kit — auto-detect, orchestrate, and optimize any project.

Zero cloud. Zero lock-in. Zero runtime overhead.

## What it does

```bash
npx codebase-pilot init
```

Scans your project and generates a complete Claude Code optimization setup:

- **CLAUDE.md** — project-specific prompt cache (auto-cached by Anthropic)
- **.claudeignore** — noise filter (excludes junk from Claude's context)
- **agents.json** — sub-agent orchestration with layered execution
- **/dispatch** — slash command to spawn focused agents by pattern
- **/healthcheck** — slash command to validate agent setup

## Install

```bash
# Run directly (no install needed)
npx codebase-pilot init

# Or install globally
npm install -g codebase-pilot
```

## Commands

| Command | Description |
|---------|-------------|
| `codebase-pilot init` | Scan project, generate everything |
| `codebase-pilot scan` | Re-detect structure, update configs |
| `codebase-pilot fix` | Auto-repair drift (stale paths) |
| `codebase-pilot health` | Run healthcheck on agent setup |
| `codebase-pilot eject` | Export all files, remove dependency |

## What it detects

- **20+ languages** — TypeScript, Python, Go, Rust, Java, Ruby, PHP, C#, etc.
- **25+ frameworks** — Express, Next.js, Django, FastAPI, Gin, Actix, Spring Boot, etc.
- **12 ORMs** — Prisma, Drizzle, SQLAlchemy, GORM, Diesel, TypeORM, etc.
- **9 test runners** — Vitest, Jest, pytest, Go test, Cargo test, etc.
- **Monorepo detection** — pnpm workspaces, Lerna, Nx, Turborepo
- **Existing Claude config** — merges with existing CLAUDE.md, .claudeignore

## How agents work

codebase-pilot maps your project packages to focused sub-agents:

```
Orchestrator (opus)
├── L1: schema-agent (haiku)    — DB schema only
├── L1: types-agent (haiku)     — TypeScript interfaces
├── L2: api-agent (sonnet)      — API routes + controllers
├── L2: cli-agent (haiku)       — CLI commands
├── L3: frontend-agent (haiku)  — React/Vue pages
├── L4: standards-agent (opus)  — SOLID review gate
├── L5: supervisor-agent (opus) — behavior audit
└── L6: docs-agent (haiku)      — documentation
```

Each agent reads only 2-4 files. Haiku for mechanical work, opus for reasoning. ~60% token savings.

## Dispatch patterns

After init, use slash commands in Claude Code:

```
/dispatch new-feature Add payment processing
/dispatch api-feature Subscription CRUD endpoints
/dispatch cli-command mcphub export
/healthcheck
```

## Eject anytime

```bash
codebase-pilot eject
```

All generated files stay. Zero lock-in. Everything is plain text that works with vanilla Claude Code.

## Token savings

| Without | With codebase-pilot | Savings |
|---------|-------------------|---------|
| Single agent reads everything | Sub-agents read 2-4 files each | ~60% |
| Full file reads | Targeted line ranges | ~90% per read |
| 5 MCP servers | Built-in tools only | ~2,000 tokens/session |
| No prompt cache | CLAUDE.md auto-cached | ~5,000 tokens/session |

## Requirements

- Node.js 18+
- Claude Code CLI

## License

MIT

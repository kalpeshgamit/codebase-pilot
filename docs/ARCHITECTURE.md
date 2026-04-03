# Architecture

## Project Structure

```
codebase-pilot/
├── src/
│   ├── bin/codebase-pilot.ts     # CLI entry point (commander)
│   ├── cli/                      # CLI commands
│   │   ├── init.ts               # Scan + generate everything
│   │   ├── scan.ts               # Re-detect + update configs
│   │   ├── fix.ts                # Auto-repair drift
│   │   ├── health.ts             # Healthcheck runner
│   │   └── eject.ts              # Export + remove dependency
│   ├── scanner/                  # Project detection engine
│   │   ├── detector.ts           # Main orchestrator
│   │   ├── language.ts           # Detect 20+ languages by extension
│   │   ├── framework.ts          # Detect 25+ frameworks by deps/configs
│   │   ├── database.ts           # Detect 12 ORMs by schema files
│   │   ├── testing.ts            # Detect 9 test runners
│   │   ├── structure.ts          # Monorepo/single + package boundaries
│   │   └── existing.ts           # Detect existing Claude Code config
│   ├── agents/                   # Agent orchestration
│   │   ├── generator.ts          # Scan results → agents.json
│   │   └── templates/            # Prompt templates (standards, supervisor)
│   ├── generators/               # File generators
│   │   ├── claude-md.ts          # CLAUDE.md from scan results
│   │   ├── claudeignore.ts       # .claudeignore with smart defaults
│   │   ├── agents-json.ts        # agents.json writer
│   │   ├── slash-commands.ts     # /dispatch + /healthcheck commands
│   │   └── gitignore.ts          # .gitignore updater
│   ├── packer/                   # Codebase packing engine
│   │   ├── index.ts              # Pack orchestrator
│   │   ├── collector.ts          # File collector (.claudeignore + agent scoping)
│   │   ├── formatter-xml.ts      # XML output format
│   │   ├── formatter-md.ts       # Markdown output format
│   │   └── token-counter.ts      # Token estimation
│   ├── security/                 # Secret detection
│   │   ├── scanner.ts            # Regex-based scanner
│   │   └── patterns.ts           # 152 secret patterns (15 categories)
│   ├── compress/                 # Code compression
│   │   ├── index.ts              # Compression orchestrator (Tier A + B)
│   │   ├── regex-compress.ts     # Tier A: regex-based (8 languages)
│   │   ├── treesitter-compress.ts # Tier B: tree-sitter (optional)
│   │   └── patterns.ts           # Per-language compression patterns
│   ├── intelligence/             # Code intelligence (TODO)
│   │   ├── ast-parser.ts         # tree-sitter AST parsing
│   │   ├── smart-search.ts       # Semantic symbol search
│   │   ├── smart-outline.ts      # File structure view
│   │   ├── smart-unfold.ts       # Expand single symbol
│   │   ├── indexer.ts            # Build AST index
│   │   └── watcher.ts            # chokidar auto-reindex
│   ├── memory/                   # Persistent memory (TODO)
│   │   ├── db.ts                 # SQLite schema + wrapper
│   │   ├── store.ts              # Save observations
│   │   ├── search.ts             # Query past decisions
│   │   └── timeline.ts           # File/session history
│   ├── mcp/                      # Optional MCP server (TODO)
│   │   ├── server.ts             # stdio MCP server
│   │   └── tools.ts              # Register all tools
│   ├── grammars/                 # Tree-sitter grammar loader (TODO)
│   │   └── loader.ts             # Dynamic grammar loading
│   ├── types.ts                  # All TypeScript interfaces
│   └── index.ts                  # Public API exports
├── templates/                    # Pre-built templates (TODO)
│   ├── monorepo.json
│   ├── express-api.json
│   └── claude-md/*.md
├── tests/                        # Vitest tests
│   ├── security/                 # Secret detection tests
│   ├── packer/                   # Pack engine tests
│   └── compress/                 # Compression tests
├── docs/                         # Documentation
├── package.json
└── tsconfig.json
```

## Data Flow

```
npx codebase-pilot init
         │
         ▼
    Scanner (detector.ts)
    ├── language.ts   → detect file extensions
    ├── framework.ts  → detect deps + configs (monorepo-aware)
    ├── database.ts   → detect ORM + schema (monorepo-aware)
    ├── testing.ts    → detect test runner (monorepo-aware)
    ├── structure.ts  → detect monorepo + packages
    └── existing.ts   → detect CLAUDE.md, .claudeignore, MCP servers
         │
         ▼
    ProjectScan object
         │
         ▼
    Agent Generator (generator.ts)
    ├── Map packages → agents (type-based: api→sonnet, web→haiku, etc.)
    ├── Assign layers (L1-L6)
    ├── Set dependencies
    └── Generate dispatch patterns
         │
         ▼
    File Generators
    ├── claude-md.ts      → CLAUDE.md
    ├── claudeignore.ts   → .claudeignore
    ├── agents-json.ts    → .codebase-pilot/agents.json
    ├── slash-commands.ts → .claude/commands/*.md
    └── gitignore.ts      → .gitignore (update)
```

## Pack Command Data Flow

```
pack command → collector (walk + .claudeignore + agent scoping)
            → security scanner (skip files with secrets)
            → compressor (optional, fold function bodies)
            → formatter (XML or Markdown)
            → output file or stdout
```

## Agent Layer System

```
L0: healthcheck-agent (haiku)  — pre-flight validation (read-only)
L1: schema-agent, types-agent  — foundation (sequential)
L2: api-agent, cli-agent, plugin-agent — logic (parallel)
L3: frontend-agent             — presentation (parallel, after L2)
L4: standards-agent (opus)     — code quality gate
L5: supervisor-agent (opus)    — behavior audit gate
L6: docs-agent (haiku)         — documentation (last)
```

## Dependencies

| Package | Purpose | Required |
|---------|---------|----------|
| commander | CLI argument parsing | Yes |
| better-sqlite3 | Memory + AST index | Yes |
| chokidar | File watcher for auto-reindex | Yes |
| tree-sitter | AST parsing engine | Optional |
| tree-sitter-* | Language grammars | Optional (on-demand) |

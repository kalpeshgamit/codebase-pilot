# codebase-pilot

**Auto-detect, orchestrate, and optimize any project for Claude Code.**

Zero cloud. Zero lock-in. Zero runtime overhead.

[![npm version](https://img.shields.io/npm/v/codebase-pilot)](https://www.npmjs.com/package/codebase-pilot)
[![CI](https://github.com/nicgamit/codebase-pilot/actions/workflows/ci.yml/badge.svg)](https://github.com/nicgamit/codebase-pilot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)

---

## What it does

codebase-pilot scans your project and generates a complete Claude Code optimization setup in seconds. It detects your languages, frameworks, databases, and test runners, then produces targeted sub-agent configurations that cut token usage by ~60%.

- **CLAUDE.md** -- project-specific prompt cache, auto-cached by Anthropic's system
- **.claudeignore** -- smart noise filter that excludes build artifacts, deps, and junk
- **agents.json** -- sub-agent orchestration with layered execution and model routing
- **Slash commands** -- `/dispatch` and `/healthcheck` for Claude Code integration
- **Monorepo-aware** -- detects workspaces and maps each package to a focused agent

## Quick start

```bash
npx codebase-pilot init
```

No install required. One command scans your project and generates everything:

```
codebase-pilot v0.1.0

  Scanning project...

  Detected:
    Language:   TypeScript (85%), Python (15%)
    Framework:  Express
    Database:   Prisma -> PostgreSQL
    Tests:      Vitest
    Structure:  Monorepo (3 packages)
    Packages:
      packages/api              -> api      (45 files)
      packages/web              -> web      (32 files)
      packages/shared           -> lib      (12 files)

  Generating:
    * CLAUDE.md (express template)
    * .claudeignore (smart defaults)
    * .codebase-pilot/agents.json (8 agents, 3 patterns)
    * .claude/commands/dispatch.md
    * .claude/commands/healthcheck.md
```

Or install globally:

```bash
npm install -g codebase-pilot
```

## Language support

56 languages across 3 detection tiers:

| Tier | What you get | Languages |
|------|-------------|-----------|
| **Tier 1** -- Full ecosystem (17) | Entry points, package files, skip dirs, framework/ORM/test detection | TypeScript, JavaScript, Python, Go, Rust, Java, Kotlin, Ruby, PHP, C#, Swift, Dart, Elixir, Scala, C++, C, Zig |
| **Tier 2** -- Package manager + tests (21) | Entry points, package files, skip dirs, test runner detection | Haskell, Clojure, F#, OCaml, Nim, Crystal, Julia, Perl, Lua, R, Erlang, Groovy, V, Objective-C, D, Ada, Fortran, COBOL, Hack, Gleam, Assembly |
| **Tier 3** -- Extension only (18) | File counting and language percentage reporting | Lisp, Scheme, Racket, Prolog, Forth, APL, VHDL, Verilog, Tcl, Shell, PowerShell, Terraform, Solidity, Move, Cairo, GraphQL, Protobuf, SQL |

## Packing & token counting

- **Security scanning** -- 152 patterns across 15 categories filter secrets and credentials before packing
- **Code compression** -- Regex-based Tier A (8 languages) strips comments, whitespace, and formatting noise; tree-sitter Tier B stub ready for AST-level compression
- **Token counting** -- Per-file breakdown with visual bars and project total
- **Output formats** -- XML (default) and Markdown
- **Agent-scoped packing** -- `--agent api-agent` packs only that agent's context files

```bash
# Pack entire project as XML
codebase-pilot pack

# Pack as Markdown with compression
codebase-pilot pack --format md --compress

# Pack only one agent's context
codebase-pilot pack --agent api-agent

# Show token breakdown
codebase-pilot tokens
```

## Security scanning

152 patterns across 15 categories detect secrets and sensitive tokens before they reach an LLM context window:

| Category | Patterns | Category | Patterns |
|----------|----------|----------|----------|
| Cloud | 14 | VCS/CI | 8 |
| Payment | 20 | Messaging | 9 |
| AI LLMs | 14 | AI Infra | 8 |
| AI DevTools | 8 | Database | 15 |
| Dev Infra | 15 | Auth | 5 |
| Monitoring | 12 | Social | 8 |
| Crypto | 4 | Crypto Keys | 7 |
| Generic | 4 | | |

## Commands

| Command | Description |
|---------|-------------|
| `codebase-pilot init` | Scan project and generate all configuration files |
| `codebase-pilot scan` | Re-detect project structure and update configs |
| `codebase-pilot fix` | Auto-repair drift (stale paths, missing files) |
| `codebase-pilot health` | Run healthcheck on agent setup |
| `codebase-pilot pack` | Pack codebase into AI-friendly single file (XML or Markdown) |
| `codebase-pilot tokens` | Show token counts per file and total |
| `codebase-pilot eject` | Export all generated files and remove the dependency |

## What gets generated

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Framework-specific prompt cache with project rules, patterns, and token directives |
| `.claudeignore` | Excludes `node_modules`, `dist`, build caches, and language-specific junk directories |
| `.codebase-pilot/agents.json` | Sub-agent definitions with model routing, context paths, and layer ordering |
| `.claude/commands/dispatch.md` | Slash command to spawn focused agents by pattern |
| `.claude/commands/healthcheck.md` | Slash command to validate agent setup before dispatch |

Existing `CLAUDE.md` and `.claudeignore` files are merged, never overwritten.

## How agents work

Agents are organized in layers. Lower layers run first and produce context for higher layers. Each agent reads only 2-4 files and uses the cheapest model that can handle its task.

```
Layer 0   healthcheck-agent (haiku)    Pre-flight validation
Layer 1   schema-agent (haiku)         DB schema only
          types-agent (haiku)          TypeScript interfaces
Layer 2   api-agent (sonnet)           API routes + controllers
          cli-agent (haiku)            CLI commands
Layer 3   frontend-agent (haiku)       React/Vue/Svelte pages
Layer 4   standards-agent (opus)       Code quality gate (SOLID review)
Layer 5   supervisor-agent (opus)      Behavior audit gate
Layer 6   docs-agent (haiku)           Documentation updates
```

**Model routing:** haiku for mechanical extraction, sonnet for implementation, opus for reasoning and review gates. This layered approach yields ~60% token savings compared to a single agent reading everything.

## Framework detection

58 framework detectors across 14 languages:

| Language | Frameworks |
|----------|-----------|
| TypeScript/JS | Next.js, Nuxt, SvelteKit, Remix, Astro, Express, Fastify, Hono, NestJS, Koa, React, Vue, Angular, Svelte |
| Python | Django, FastAPI, Flask, Starlette, Tornado, Sanic |
| Go | Gin, Echo, Fiber, Chi, Gorilla |
| Rust | Actix, Axum, Rocket, Warp, Tide |
| Java | Spring Boot, Quarkus, Micronaut, Vert.x |
| Kotlin | Ktor |
| Ruby | Rails, Sinatra, Hanami |
| PHP | Laravel, Symfony, Slim, Lumen |
| C# | ASP.NET Core, Blazor, MAUI |
| Swift | Vapor, Hummingbird |
| Dart | Flutter, Dart Frog, Serverpod |
| Elixir | Phoenix, Plug |
| Scala | Play, Akka HTTP, http4s, ZIO HTTP |
| C++ | Qt, Drogon |

**39 test runners** -- Vitest, Jest, Mocha, pytest, unittest, Go test, Cargo test, JUnit, TestNG, Kotest, RSpec, Minitest, PHPUnit, Pest, xUnit, NUnit, MSTest, XCTest, Quick, flutter_test, dart test, ExUnit, ScalaTest, MUnit, GoogleTest, Catch2, CTest, zig test, HSpec, clojure.test, OUnit, Gleam test, EUnit, crystal spec, nim test, D unittest, Julia Test, Busted, Perl Test

**32 ORM/database detectors** -- Prisma, Drizzle, TypeORM, Sequelize, Mongoose, SQLAlchemy, Django ORM, Tortoise, Peewee, GORM, sqlx (Go), ent, sqlc, Diesel, SeaORM, sqlx (Rust), Hibernate, jOOQ, MyBatis, ActiveRecord, Sequel, Eloquent, Doctrine, Entity Framework, Dapper, Ecto, Fluent, Drift, Slick, Doobie, Exposed, Ktorm

## Dispatch patterns

After init, use slash commands in Claude Code:

```
/dispatch new-feature Add payment processing
/dispatch api-feature Subscription CRUD endpoints
/dispatch cli-command Export analytics data
/healthcheck
```

Patterns map to agent groups. `new-feature` dispatches schema, types, API, frontend, and review agents in the correct layer order.

## Configuration

The generated `.codebase-pilot/agents.json` is plain JSON. Edit it directly to:

- Add or remove agents
- Change model assignments (`haiku`, `sonnet`, `opus`)
- Adjust context paths for each agent
- Define custom dispatch patterns
- Reorder layers

```json
{
  "version": "1.0",
  "project": "my-app",
  "agents": {
    "api-agent": {
      "name": "api-agent",
      "model": "sonnet",
      "context": ["packages/api/src/routes/"],
      "task": "API route implementation",
      "layer": 2,
      "dependsOn": ["types-agent"]
    }
  },
  "patterns": {
    "api-feature": ["schema-agent", "types-agent", "api-agent"]
  }
}
```

## Programmatic API

```typescript
import { detect, generateAgents, generateClaudeMd } from 'codebase-pilot';

const scan = await detect('/path/to/project');
const agents = generateAgents(scan);
const claudeMd = generateClaudeMd(scan);
```

Exported: `detect`, `generateAgents`, `generateClaudeMd`, `generateClaudeignore`, `createMemoryDb`

## Eject anytime

```bash
codebase-pilot eject
```

All generated files stay as plain text. Zero lock-in. Everything works with vanilla Claude Code after ejecting.

## Token savings

| Without | With codebase-pilot | Savings |
|---------|-------------------|---------|
| Single agent reads everything | Sub-agents read 2-4 files each | ~60% |
| Full file reads | Targeted line ranges | ~90% per read |
| 5 MCP servers loaded | Built-in tools only | ~2,000 tokens/session |
| No prompt cache | CLAUDE.md auto-cached | ~5,000 tokens/session |

## Requirements

- Node.js >= 18.0.0
- Claude Code CLI (for slash command integration)

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for setup instructions and development workflow.

## License

[MIT](LICENSE)

# codebase-pilot

**AI context engine for Claude Code. Pack, compress, and optimize any codebase. Save 60–90% tokens.**

Zero cloud. Zero lock-in. Zero runtime overhead.

[![npm version](https://img.shields.io/npm/v/codebase-pilot)](https://www.npmjs.com/package/codebase-pilot)
[![CI](https://github.com/nicgamit/codebase-pilot/actions/workflows/ci.yml/badge.svg)](https://github.com/nicgamit/codebase-pilot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)

---

## What it does

codebase-pilot solves the core AI coding problem: getting the right code into Claude efficiently, without leaking secrets or blowing your context window.

- **Pack** your codebase into a single XML or Markdown file for Claude
- **Compress** code by 60–90% — keeps signatures, folds bodies
- **Scan** for 152 secret patterns before anything reaches an LLM
- **Count tokens** per file with savings estimates
- **Scope** packing to a single agent's context paths
- **Generate** CLAUDE.md, .claudeignore, agents.json, and slash commands

---

## Installation

### npm (recommended)

```bash
npm install -g codebase-pilot
```

### npx (no install)

```bash
npx codebase-pilot init
```

### Verify

```bash
codebase-pilot --version
```

---

## Uninstall

```bash
npm uninstall -g codebase-pilot
```

To also remove project config files:

```bash
codebase-pilot eject   # removes .codebase-pilot/ from project
```

---

## Quick start

```bash
# Set up a project
codebase-pilot init

# See token breakdown + savings estimate
codebase-pilot tokens

# Pack entire codebase compressed → clipboard
codebase-pilot pack --compress --copy

# Pack just one agent's context
codebase-pilot pack --agent api-agent --compress --copy
```

---

## Token savings

```
codebase-pilot tokens

  Token count by file:

    src/registry/frameworks.ts     3,819 tokens  ██████████████░░   6%
    src/security/patterns.ts       4,376 tokens  ████████████████   7%
    ...

  Total: 60,458 tokens across 71 files

  Savings estimate (per session):
    Without codebase-pilot:   ~60,458 tokens  (manual file reads)
    With pack --compress:      ~24,183 tokens
    Pilot saves:              ~36,275 tokens per session

  Your savings (from pack runs):
    Today:      3 sessions  — ~108,825 tokens saved
    This week:  9 sessions  — ~326,475 tokens saved
```

| Approach | Tokens | Reduction |
|----------|--------|-----------|
| No tool (manual file reads) | ~60K | baseline |
| `pack` | ~45K | ~25% |
| `pack --compress` | ~24K | ~60% |
| `pack --agent <name> --compress` | ~7K | **~90%** |

---

## Commands

| Command | Description |
|---------|-------------|
| `codebase-pilot init` | Scan project and generate all config files |
| `codebase-pilot scan` | Re-detect project structure, update configs |
| `codebase-pilot fix` | Auto-repair drift (stale paths, missing files) |
| `codebase-pilot health` | Validate agent setup |
| `codebase-pilot pack` | Pack codebase into AI-friendly XML or Markdown |
| `codebase-pilot tokens` | Token counts per file + savings estimate |
| `codebase-pilot eject` | Export all generated files, remove dependency |

### pack options

```
--format xml|md     Output format (default: xml)
--output <path>     Output file (default: codebase-pilot-output.xml)
--compress          Extract signatures, fold bodies (~60-90% reduction)
--agent <name>      Pack only files in that agent's context paths
--no-security       Skip secret detection
--copy              Write to stdout for piping/clipboard
```

### tokens options

```
--sort size|name    Sort order (default: size)
--limit <n>         Show top N files (default: 20)
--agent <name>      Count tokens for a specific agent's context
```

---

## Security scanning

152 patterns across 15 categories. Runs automatically on every `pack`. Files with secrets are skipped from output.

| Category | Examples |
|----------|---------|
| Cloud | AWS, GCP, Azure, DigitalOcean, Supabase, Cloudflare |
| VCS / CI | GitHub tokens, GitLab, Bitbucket, CircleCI, Travis |
| Payment | Stripe, Razorpay, Square, Braintree, Plaid, PayPal |
| AI LLMs | OpenAI, Anthropic, Groq, Perplexity, xAI, Cerebras |
| AI Infra | HuggingFace, Replicate, Together, Fireworks, Cohere |
| AI DevTools | LangSmith, LangFuse, Pinecone, Weaviate, Qdrant |
| Messaging | Slack, Twilio, SendGrid, Mailgun, Resend, Postmark |
| Database | MongoDB, PostgreSQL, Redis, PlanetScale, Neon, Turso |
| Dev Infra | npm, Docker, Doppler, Vault, Trigger.dev, PostHog |
| Monitoring | Sentry, Datadog, New Relic, Grafana, Honeycomb |
| Crypto | Ethereum, Solana, Bitcoin private keys |
| Crypto Keys | RSA, EC, DSA, OpenSSH, PGP private key blocks |
| Generic | password=, secret=, api_key=, Bearer tokens |

Disable with `--no-security` if you're packing a test fixtures repo.

---

## Code compression

Two tiers — always works, gets better with tree-sitter:

**Tier A (default, zero deps):** Regex-based signature extraction across 8 languages. Folds function bodies, keeps signatures, imports, type definitions.

```typescript
// Before (12 lines, ~150 tokens)
export async function createUser(data: UserInput): Promise<User> {
  const validated = schema.parse(data);
  const user = await db.user.create({ data: validated });
  await sendWelcomeEmail(user.email);
  return user;
}

// After --compress (1 line, ~20 tokens)
export async function createUser(data: UserInput): Promise<User> { /* ... */ }
```

**Tier B (optional):** tree-sitter AST parsing for accurate statement counting and doc comment preservation. Install `tree-sitter` and language grammars as optional dependencies — Tier B activates automatically.

---

## Agent-scoped packing

Pack only the files relevant to a specific agent. This is the biggest token win.

```bash
codebase-pilot pack --agent api-agent --compress
# → packs only packages/api/src/ instead of entire repo
# → 7K tokens instead of 60K
```

Agent context paths come from `.codebase-pilot/agents.json` (generated by `init`).

---

## What init generates

```bash
codebase-pilot init
```

```
  Scanning project...

  Detected:
    Language:   TypeScript (85%), Python (15%)
    Framework:  Express
    Database:   Prisma -> PostgreSQL
    Tests:      Vitest
    Structure:  Monorepo (3 packages)

  Generating:
    * CLAUDE.md (express template)
    * .claudeignore (smart defaults)
    * .codebase-pilot/agents.json (8 agents, 3 patterns)
    * .claude/commands/dispatch.md
    * .claude/commands/healthcheck.md
```

Existing `CLAUDE.md` and `.claudeignore` are merged, never overwritten.

---

## Language support

56 languages across 3 tiers:

| Tier | Count | Languages |
|------|-------|-----------|
| **Tier 1** — Full ecosystem | 17 | TypeScript, JavaScript, Python, Go, Rust, Java, Kotlin, Ruby, PHP, C#, Swift, Dart, Elixir, Scala, C++, C, Zig |
| **Tier 2** — Package + tests | 21 | Haskell, Clojure, F#, OCaml, Nim, Crystal, Julia, Perl, Lua, R, Erlang, Groovy, V, Objective-C, D, Ada, Fortran, COBOL, Hack, Gleam, Assembly |
| **Tier 3** — Extension only | 18 | Lisp, Scheme, Racket, Prolog, Forth, APL, VHDL, Verilog, Tcl, Shell, PowerShell, Terraform, Solidity, Move, Cairo, GraphQL, Protobuf, SQL |

**58 framework detectors** — Next.js, Nuxt, SvelteKit, Remix, Astro, Express, Fastify, NestJS, Django, FastAPI, Flask, Gin, Echo, Fiber, Axum, Actix, Spring Boot, Rails, Laravel, and more.

**39 test runners** — Vitest, Jest, pytest, Go test, Cargo test, JUnit, RSpec, PHPUnit, ExUnit, and more.

**32 ORM detectors** — Prisma, Drizzle, SQLAlchemy, GORM, Diesel, Hibernate, ActiveRecord, Eloquent, and more.

---

## Agent layers

```
Layer 0   healthcheck-agent (haiku)    Pre-flight validation
Layer 1   schema-agent (haiku)         DB schema only
          types-agent (haiku)          TypeScript interfaces
Layer 2   api-agent (sonnet)           API routes + controllers
          cli-agent (haiku)            CLI commands
Layer 3   frontend-agent (haiku)       React/Vue/Svelte pages
Layer 4   standards-agent (opus)       Code quality gate
Layer 5   supervisor-agent (opus)      Behavior audit gate
Layer 6   docs-agent (haiku)           Documentation updates
```

Use in Claude Code:

```
/dispatch new-feature Add payment processing
/dispatch api-feature Subscription CRUD endpoints
/healthcheck
```

---

## Configuration

`.codebase-pilot/agents.json` is plain JSON — edit directly:

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

---

## Programmatic API

```typescript
import { detect, generateAgents, generateClaudeMd } from 'codebase-pilot';

const scan = await detect('/path/to/project');
const agents = generateAgents(scan);
const claudeMd = generateClaudeMd(scan);
```

---

## Requirements

- Node.js >= 18.0.0
- Claude Code CLI (for slash command integration)

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md).

## License

[MIT](LICENSE)

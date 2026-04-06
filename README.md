# codebase-pilot

**AI context engine — pack, compress, and optimize any codebase. Save 60–90% tokens.**

Works with Claude Code, Cursor, Windsurf, Codex. Zero cloud. Zero lock-in.

[![npm version](https://img.shields.io/npm/v/codebase-pilot)](https://www.npmjs.com/package/codebase-pilot)
[![CI](https://github.com/nicgamit/codebase-pilot/actions/workflows/ci.yml/badge.svg)](https://github.com/nicgamit/codebase-pilot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)

---

## What it does

codebase-pilot solves the core AI coding problem: getting the right code into AI tools efficiently, without leaking secrets or blowing your context window.

- **Pack** your codebase into a single XML or Markdown file
- **Compress** code by 60–90% — keeps signatures, folds bodies
- **Scan** for 152 secret patterns before anything reaches an LLM
- **Impact analysis** — blast radius + risk scoring for any file change
- **MCP server** — 10 tools exposable to Claude Code, Cursor, Zed
- **Multi-platform** — generates .cursorrules, .windsurfrules, AGENTS.md
- **Watch mode** — auto-update configs on file changes
- **Agent orchestration** — layered sub-agents with model routing
- **Incremental** — hash-based change detection, only re-scans modified files
- **Benchmark** — evaluate compression, import graph, and timing metrics

---

## Installation

```bash
npm install -g codebase-pilot
```

Or without installing:

```bash
npx codebase-pilot init
```

### Verify

```bash
codebase-pilot --version   # 0.2.0
```

### Uninstall

```bash
npm uninstall -g codebase-pilot
codebase-pilot eject       # remove project config (optional)
```

---

## Quick start

```bash
# Set up a project (Claude Code + optionally Cursor/Windsurf/Codex)
codebase-pilot init --platform cursor,windsurf,codex

# See token breakdown + savings estimate
codebase-pilot tokens

# Pack compressed → clipboard
codebase-pilot pack --compress --copy

# Pack just one agent's context
codebase-pilot pack --agent api-agent --compress --copy

# Blast radius analysis
codebase-pilot impact --file src/types.ts

# Start MCP server
codebase-pilot serve

# Watch for changes
codebase-pilot watch
```

---

## Commands

| Command | Description |
|---------|-------------|
| `init` | Scan project, generate configs for Claude Code + AI tools |
| `scan` | Re-detect project structure, update configs |
| `fix` | Auto-repair stale paths and missing files |
| `health` | Validate agent setup |
| `pack` | Pack codebase into XML or Markdown |
| `tokens` | Token counts per file + daily/weekly savings stats |
| `impact` | Blast radius and change impact analysis |
| `watch` | Watch for changes, auto-update configs |
| `serve` | Start MCP server (stdio transport) |
| `eval` | Benchmark project — tokens, compression, import graph |
| `eject` | Export configs, remove dependency |

---

## Token savings

```
codebase-pilot tokens

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

## Blast radius / change impact

```bash
codebase-pilot impact --file src/types.ts

  Risk: HIGH (54/100)

  Direct dependents (17):
    src/agents/generator.ts
    src/mcp/server.ts
    src/packer/index.ts
    ...

  Affected tests (5):
    tests/agents/generator.test.ts
    tests/cli/pack.test.ts
    ...

  Total affected: 27 files
```

```bash
# Project-wide import graph summary
codebase-pilot impact

  Most-imported files (highest blast radius):
    src/types.ts                  17 deps  ████████████████████
    src/packer/collector.ts       12 deps  ████████████████████
    src/registry/index.ts          8 deps  ████████████████
```

---

## MCP server

Expose all codebase-pilot features to AI tools via MCP (Model Context Protocol):

```bash
codebase-pilot serve
```

**10 MCP tools:**
`scan_project`, `pack_codebase`, `count_tokens`, `health_check`, `scan_secrets`, `list_agents`, `get_agent`, `detect_languages`, `get_savings`, `list_files`

**3 MCP prompts:**
`review`, `onboard`, `optimize`

### Connect to Claude Code

Add to your `~/.claude.json`:

```json
{
  "mcpServers": {
    "codebase-pilot": {
      "command": "codebase-pilot",
      "args": ["serve"]
    }
  }
}
```

### Connect to Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "codebase-pilot": {
      "command": "codebase-pilot",
      "args": ["serve"]
    }
  }
}
```

---

## Multi-platform support

Generate config files for multiple AI coding tools:

```bash
codebase-pilot init --platform cursor,windsurf,codex
```

| Platform | Generated file | AI Tool |
|----------|---------------|---------|
| (default) | `CLAUDE.md` | Claude Code |
| `cursor` | `.cursorrules` | Cursor |
| `windsurf` | `.windsurfrules` | Windsurf |
| `codex` | `AGENTS.md` | OpenAI Codex |

---

## Watch mode

```bash
codebase-pilot watch

  Watching for changes...
  Directory: /path/to/project
  Press Ctrl+C to stop

  [14:32:01] change: src/routes/users.ts
  Re-scanning...
  Updated: agents.json (8 agents)
```

---

## Security scanning

152 patterns across 15 categories. Runs automatically on every `pack`.

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

---

## Code compression

**Tier A (default):** Regex-based, 8 languages, zero deps:

```typescript
// Before (~150 tokens)
export async function createUser(data: UserInput): Promise<User> {
  const validated = schema.parse(data);
  const user = await db.user.create({ data: validated });
  await sendWelcomeEmail(user.email);
  return user;
}

// After --compress (~20 tokens)
export async function createUser(data: UserInput): Promise<User> { /* ... */ }
```

**Tier B (optional):** tree-sitter AST for accurate compression. Install optional deps for auto-activation.

---

## Benchmarks

```bash
codebase-pilot eval

  Project         Files  Raw tokens  Compressed  Ratio  Edges  Time
  --------------  -----  ----------  ----------  -----  -----  ----
  codebase-pilot     82      74,239      25,666    65%    116  23ms

  codebase-pilot:
    Languages:  TypeScript
    Hub file:   src/types.ts (17 dependents)
    Timing:     scan=5ms pack=15ms graph=3ms
```

---

## Language support

56 languages across 3 tiers:

| Tier | Count | Languages |
|------|-------|-----------|
| **Tier 1** — Full ecosystem | 17 | TypeScript, JavaScript, Python, Go, Rust, Java, Kotlin, Ruby, PHP, C#, Swift, Dart, Elixir, Scala, C++, C, Zig |
| **Tier 2** — Package + tests | 21 | Haskell, Clojure, F#, OCaml, Nim, Crystal, Julia, Perl, Lua, R, Erlang, Groovy, V, Objective-C, D, Ada, Fortran, COBOL, Hack, Gleam, Assembly |
| **Tier 3** — Extension only | 18 | Lisp, Scheme, Racket, Prolog, Forth, APL, VHDL, Verilog, Tcl, Shell, PowerShell, Terraform, Solidity, Move, Cairo, GraphQL, Protobuf, SQL |

**58 frameworks** | **39 test runners** | **32 ORM detectors**

---

## Agent orchestration

```
Layer 0   healthcheck-agent (haiku)    Pre-flight validation
Layer 1   schema-agent (haiku)         DB schema
          types-agent (haiku)          TypeScript interfaces
Layer 2   api-agent (sonnet)           API routes
          cli-agent (haiku)            CLI commands
Layer 3   frontend-agent (haiku)       React/Vue/Svelte
Layer 4   standards-agent (opus)       Code quality gate
Layer 5   supervisor-agent (opus)      Behavior audit
Layer 6   docs-agent (haiku)           Documentation
```

---

## Programmatic API

```typescript
import {
  detect, generateAgents, packProject,
  buildImportGraph, computeBlastRadius,
  detectChanges, startMcpServer,
} from 'codebase-pilot';

const scan = await detect('/path/to/project');
const blast = computeBlastRadius('/path', 'src/index.ts');
const packed = packProject({ dir: '/path', format: 'xml', compress: true, noSecurity: false });
```

---

## Requirements

- Node.js >= 18.0.0

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## Author

**Kalpesh Gamit (KG)**
- Website: [kalpeshgamit.github.io](https://kalpeshgamit.github.io)
- LinkedIn: [linkedin.com/in/kalpeshgamit](https://www.linkedin.com/in/kalpeshgamit)
- Email: kalpa.hacker@gmail.com

## License

[MIT](LICENSE)

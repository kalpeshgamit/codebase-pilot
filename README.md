<p align="center">
  <img src="https://raw.githubusercontent.com/kalpeshgamit/codebase-pilot/main/docs/logo-02.png" alt="codebase-pilot" width="500" />
</p>

<p align="center">
  <strong>Stop burning tokens. Start coding smarter.</strong><br/>
  AI context engine — pack, compress, optimize any codebase for LLMs. Zero cloud. Zero lock-in.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/codebase-pilot-cli"><img src="https://img.shields.io/npm/v/codebase-pilot-cli?style=flat-square&color=blue" alt="npm" /></a>
  <a href="https://github.com/kalpeshgamit/codebase-pilot/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/kalpeshgamit/codebase-pilot/ci.yml?style=flat-square&label=CI" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%E2%89%A518-brightgreen?style=flat-square" alt="Node" /></a>
  <a href="https://safeskill.dev/scan/kalpeshgamit-codebase-pilot"><img src="https://img.shields.io/badge/SafeSkill-86%2F100-green?style=flat-square" alt="SafeSkill" /></a>
</p>

---

## Installation

<table>
<tr><td><strong>npm (recommended)</strong></td><td>

```bash
npm install -g codebase-pilot-cli
```

</td></tr>
<tr><td><strong>npx (no install)</strong></td><td>

```bash
npx codebase-pilot-cli init
```

</td></tr>
<tr><td><strong>Homebrew (macOS)</strong></td><td>

```bash
brew install kalpeshgamit/codebase-pilot/codebase-pilot-cli
```

</td></tr>
<tr><td><strong>Install script</strong></td><td>

```bash
curl -fsSL https://raw.githubusercontent.com/kalpeshgamit/codebase-pilot/main/install.sh | bash
```

</td></tr>
<tr><td><strong>Uninstall</strong></td><td>

```bash
npm uninstall -g codebase-pilot-cli
```

</td></tr>
</table>

## Quick Start

```bash
# Set up any project
codebase-pilot init

# Pack + compress for AI context
codebase-pilot pack --compress --copy

# Web dashboard
codebase-pilot ui    # → http://localhost:7456
```

---

## How It Works

<table>
<tr>
<td width="50%">

**Architecture Pipeline**

Your codebase goes through scan → detect → pack → compress → security scan → output. 98K tokens becomes 7K.

<img src="https://raw.githubusercontent.com/kalpeshgamit/codebase-pilot/main/docs/diagrams/pipeline.png" alt="How codebase-pilot works" width="100%" />

</td>
<td width="50%">

**Token Savings**

Compression alone saves 70%. Add agent scoping for 93% reduction.

<img src="https://raw.githubusercontent.com/kalpeshgamit/codebase-pilot/main/docs/diagrams/savings.png" alt="Token savings comparison" width="100%" />

</td>
</tr>
<tr>
<td width="50%">

**Blast Radius Analysis**

Change a file → see every dependent, transitive import, and affected test. Risk scored 0–100.

<img src="https://raw.githubusercontent.com/kalpeshgamit/codebase-pilot/main/docs/diagrams/blast-radius.png" alt="Blast radius analysis" width="100%" />

</td>
<td width="50%">

**Agent Layer Architecture**

7 layers — haiku for extraction, sonnet for implementation, opus for review gates.

<img src="https://raw.githubusercontent.com/kalpeshgamit/codebase-pilot/main/docs/diagrams/agent-layers.png" alt="Agent layer architecture" width="100%" />

</td>
</tr>
<tr>
<td colspan="2">

**Multi-Platform Support** — one command generates configs for Claude Code, Cursor, Windsurf, and OpenAI Codex.

<img src="https://raw.githubusercontent.com/kalpeshgamit/codebase-pilot/main/docs/diagrams/platforms.png" alt="Multi-platform support" width="100%" />

</td>
</tr>
</table>

---

## Token Savings

The `tokens` command tracks your actual savings over time:

```
  Savings estimate (per session):
    Without codebase-pilot:   ~98,798 tokens
    With pack --compress:      ~29,274 tokens
    Pilot saves:              ~69,524 tokens per session

  Your savings (from pack runs):
    Today:      3 sessions  — ~92,232 tokens saved
    This week:  5 sessions  — ~147,498 tokens saved
```

---

## Web Dashboard

```bash
codebase-pilot ui          # → http://localhost:7456
codebase-pilot ui --stop   # stop daemon
codebase-pilot ui --status # check status
```

Port **7456** = PILOT on phone keypad. Runs as background daemon with real-time SSE updates.

### Dashboard
Live stat cards, savings chart, recent sessions — auto-updates via SSE.

<img src="https://raw.githubusercontent.com/kalpeshgamit/codebase-pilot/main/docs/screenshots/dashboard.png" alt="Dashboard" width="100%" />

### Projects (System-Wide)
All projects in one view — sessions, tokens saved, efficiency per project.

<img src="https://raw.githubusercontent.com/kalpeshgamit/codebase-pilot/main/docs/screenshots/projects.png" alt="Projects" width="100%" />

### Import Graph
Interactive D3.js force-directed graph. Nodes sized by tokens, colored by module. Drag, zoom, search.

<img src="https://raw.githubusercontent.com/kalpeshgamit/codebase-pilot/main/docs/screenshots/graph.png" alt="Import Graph" width="100%" />

### Search
Full-text search with BM25 ranking. Highlighted matches with file path + line number.

<img src="https://raw.githubusercontent.com/kalpeshgamit/codebase-pilot/main/docs/screenshots/search.png" alt="Search" width="100%" />

### Agents
Layer architecture, model assignment, context paths, dependencies.

<img src="https://raw.githubusercontent.com/kalpeshgamit/codebase-pilot/main/docs/screenshots/agents.png" alt="Agents" width="100%" />

### Files
All files with token counts, language tags, percentage of total.

<img src="https://raw.githubusercontent.com/kalpeshgamit/codebase-pilot/main/docs/screenshots/files.png" alt="Files" width="100%" />

### Security
Pattern categories, risk levels, detected secrets — side by side.

<img src="https://raw.githubusercontent.com/kalpeshgamit/codebase-pilot/main/docs/screenshots/security.png" alt="Security" width="100%" />

---

## Features

| Feature | Details |
|---------|---------|
| **Pack & Compress** | XML/Markdown output, regex-based compression (8 languages), agent-scoped packing |
| **Security Scanner** | 180 patterns across 15 categories — cloud, payment, AI, crypto, generic |
| **Blast Radius** | Import graph analysis, risk scoring (0-100), affected test detection |
| **Full-Text Search** | SQLite FTS5 with BM25 ranking, snippet extraction, highlighted matches |
| **Web Dashboard** | 7 pages, dark/light theme, glassmorphism UI, real-time SSE updates |
| **MCP Server** | 10 tools + 3 prompts over stdio — works with Claude Code, Cursor, Zed |
| **Multi-Platform** | Generates CLAUDE.md, .cursorrules, .windsurfrules, AGENTS.md |
| **Agent System** | 7-layer sub-agents with haiku/sonnet/opus model routing |
| **Watch Mode** | Chokidar file watching, debounced re-scan, auto-update configs |
| **Incremental** | SHA-256 hash-based change detection — only re-scans modified files |
| **Visualization** | D3.js interactive force-directed import graph (drag, zoom, search) |
| **Benchmarks** | `eval` command — tokens, compression ratio, import edges, timing |
| **Usage Stats** | Per-project + system-wide savings tracking (today/week/month) |
| **76 Languages** | 3 tiers: 17 full ecosystem, 21 package+test, 38 extension-only |
| **58 Frameworks** | Next.js, Django, Gin, Axum, Spring Boot, Rails, Laravel, and more |
| **39 Test Runners** | Vitest, pytest, Go test, Cargo test, JUnit, RSpec, and more |
| **32 ORMs** | Prisma, SQLAlchemy, GORM, Diesel, Hibernate, ActiveRecord, and more |
| **Config Validation** | Validates agents.json, hooks before writing — prevents invalid configs |
| **Zero Cloud** | No API calls, no accounts, no telemetry. Everything runs locally |

---

## Commands

```
codebase-pilot init [--platform cursor,windsurf,codex]  # scan + generate configs
codebase-pilot scan                                      # re-detect + update
codebase-pilot pack [--compress] [--agent <name>]        # pack for AI context
codebase-pilot tokens [--agent <name>]                   # token breakdown + savings
codebase-pilot impact [--file <path>]                    # blast radius analysis
codebase-pilot search <query>                            # full-text search
codebase-pilot visualize                                 # D3.js import graph HTML
codebase-pilot ui [--stop | --status]                    # web dashboard (port 7456)
codebase-pilot serve                                     # MCP server (stdio)
codebase-pilot watch                                     # file watcher
codebase-pilot stats [--global]                          # usage history
codebase-pilot eval                                      # benchmarks
codebase-pilot health                                    # validate agent setup
codebase-pilot fix                                       # auto-repair stale paths
codebase-pilot eject                                     # remove dependency
```

---

## Blast Radius

Trace the impact of any file change across your codebase:

```bash
codebase-pilot impact --file src/types.ts

  Risk: HIGH (53/100)

  Direct dependents (18):
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

---

## MCP Server

Expose codebase-pilot to any MCP-compatible AI tool:

```bash
codebase-pilot serve
```

<details>
<summary><strong>10 Tools + 3 Prompts</strong></summary>

**Tools:** `scan_project`, `pack_codebase`, `count_tokens`, `health_check`, `scan_secrets`, `list_agents`, `get_agent`, `detect_languages`, `get_savings`, `list_files`

**Prompts:** `review`, `onboard`, `optimize`

</details>

<details>
<summary><strong>Connect to Claude Code</strong></summary>

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

Same config works for Cursor (`.cursor/mcp.json`) and other MCP clients.

</details>

---

## Security Scanner

152 regex patterns across 15 categories. Runs automatically on every `pack` — files with detected secrets are excluded from output.

<details>
<summary><strong>Categories</strong></summary>

| Category | Examples |
|----------|---------|
| Cloud | AWS, GCP, Azure, DigitalOcean, Supabase, Cloudflare |
| VCS / CI | GitHub, GitLab, Bitbucket, CircleCI, Travis |
| Payment | Stripe, Razorpay, Square, Braintree, Plaid, PayPal |
| AI LLMs | OpenAI, Anthropic, Groq, Perplexity, xAI |
| AI Infra | HuggingFace, Replicate, Together, Fireworks |
| AI DevTools | LangSmith, Pinecone, Weaviate, Qdrant |
| Messaging | Slack, Twilio, SendGrid, Mailgun, Resend |
| Database | MongoDB, PostgreSQL, Redis, PlanetScale, Neon |
| Dev Infra | npm, Docker, Doppler, Vault, PostHog |
| Monitoring | Sentry, Datadog, New Relic, Grafana |
| Crypto | Ethereum, Solana, Bitcoin private keys |
| Crypto Keys | RSA, EC, DSA, OpenSSH, PGP blocks |
| Generic | password=, secret=, api_key=, Bearer tokens |

</details>

---

## Code Compression

Keeps function signatures, folds bodies. Claude still understands the full API surface.

```typescript
// Before (150 tokens)
export async function createUser(data: UserInput): Promise<User> {
  const validated = schema.parse(data);
  const user = await db.user.create({ data: validated });
  await sendWelcomeEmail(user.email);
  return user;
}

// After --compress (20 tokens)
export async function createUser(data: UserInput): Promise<User> { /* ... */ }
```

Supports: TypeScript, JavaScript, Python, Go, Rust, Java, Ruby, PHP.

---

## Benchmarks

```bash
codebase-pilot eval

  Project         Files  Raw tokens  Compressed  Ratio  Edges  Time
  --------------  -----  ----------  ----------  -----  -----  ----
  codebase-pilot     92      98,798      29,274    70%    134  45ms
```

---

## Uninstall

```bash
npm uninstall -g codebase-pilot-cli    # remove CLI
codebase-pilot eject               # remove project configs (optional)
```

---

<p align="center">
  Node.js >= 18 · <a href="LICENSE">MIT License</a> · <a href="docs/CONTRIBUTING.md">Contributing</a> · <a href="SECURITY.md">Security</a>
</p>

<p align="center">
  <strong>Save tokens. Ship faster.</strong><br/>
  <code>npm install -g codebase-pilot-cli</code>
</p>

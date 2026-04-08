<p align="center">
  <img src="https://raw.githubusercontent.com/kalpeshgamit/codebase-pilot/main/docs/logo-02.png" alt="codebase-pilot" width="500" />
</p>

<p align="center">
  <strong>Stop burning tokens. Start coding smarter.</strong><br/>
  AI context engine — pack, compress, optimize any codebase for LLMs. Zero cloud. Zero lock-in.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/codebase-pilot-cli"><img src="https://img.shields.io/npm/v/codebase-pilot-cli?style=flat-square&color=blue" alt="npm" /></a>
  <a href="https://img.shields.io/npm/dm/codebase-pilot-cli"><img src="https://img.shields.io/npm/dm/codebase-pilot-cli?style=flat-square&color=blue&label=downloads" alt="downloads" /></a>
  <a href="https://github.com/kalpeshgamit/codebase-pilot/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/kalpeshgamit/codebase-pilot/ci.yml?style=flat-square&label=CI" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" /></a>
  <a href="https://safeskill.dev/scan/kalpeshgamit-codebase-pilot"><img src="https://safeskill.dev/api/badge/kalpeshgamit-codebase-pilot?v=0.8.2" alt="SafeSkill" /></a>
</p>

<p align="center">
  <a href="https://github.com/kalpeshgamit/codebase-pilot/actions/workflows/ci.yml"><img src="https://img.shields.io/badge/macOS-passing-000000?style=flat-square&logo=apple&logoColor=white" alt="macOS" /></a>
  <a href="https://github.com/kalpeshgamit/codebase-pilot/actions/workflows/ci.yml"><img src="https://img.shields.io/badge/Linux-passing-FCC624?style=flat-square&logo=linux&logoColor=black" alt="Linux" /></a>
  <a href="https://github.com/kalpeshgamit/codebase-pilot/actions/workflows/ci.yml"><img src="https://img.shields.io/badge/Windows-passing-0078D6?style=flat-square&logo=windows&logoColor=white" alt="Windows" /></a>
  <a href="https://github.com/kalpeshgamit/codebase-pilot/actions/workflows/ci.yml"><img src="https://img.shields.io/badge/Ubuntu-passing-E95420?style=flat-square&logo=ubuntu&logoColor=white" alt="Ubuntu" /></a>
  <a href="https://hub.docker.com/_/alpine"><img src="https://img.shields.io/badge/Alpine-passing-0D597F?style=flat-square&logo=alpinelinux&logoColor=white" alt="Alpine" /></a>
  <a href="https://hub.docker.com/_/debian"><img src="https://img.shields.io/badge/Debian-passing-A81D33?style=flat-square&logo=debian&logoColor=white" alt="Debian" /></a>
</p>

<p align="center">
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node%2018-passing-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node 18" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node%2020-passing-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node 20" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node%2022-passing-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node 22" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://github.com/kalpeshgamit/codebase-pilot/actions/workflows/ci.yml"><img src="https://img.shields.io/badge/tests-143%20passed-brightgreen?style=flat-square" alt="Tests" /></a>
  <a href="https://github.com/kalpeshgamit/codebase-pilot/actions/workflows/ci.yml"><img src="https://img.shields.io/badge/build-passing-brightgreen?style=flat-square" alt="Build" /></a>
</p>

<p align="center">
  <a href="https://github.com/kalpeshgamit/codebase-pilot#claude-code-plugin"><img src="https://img.shields.io/badge/Claude%20Code-Plugin-blueviolet?style=flat-square&logo=anthropic&logoColor=white" alt="Claude Code" /></a>
  <a href="https://www.cursor.com"><img src="https://img.shields.io/badge/Cursor-Supported-blue?style=flat-square" alt="Cursor" /></a>
  <a href="https://codeium.com/windsurf"><img src="https://img.shields.io/badge/Windsurf-Supported-blue?style=flat-square" alt="Windsurf" /></a>
  <a href="https://github.com/kalpeshgamit/codebase-pilot#mcp-server"><img src="https://img.shields.io/badge/MCP-10%20Tools%20%C2%B7%203%20Prompts-orange?style=flat-square" alt="MCP" /></a>
  <a href="https://github.com/kalpeshgamit/codebase-pilot#github-action"><img src="https://img.shields.io/badge/GitHub%20Action-Marketplace-2088FF?style=flat-square&logo=githubactions&logoColor=white" alt="GitHub Action" /></a>
  <a href="https://github.com/kalpeshgamit/codebase-pilot#security-scanner"><img src="https://img.shields.io/badge/security-180%20patterns-red?style=flat-square" alt="Security" /></a>
</p>

---

## Installation

<table>
<tr><td><strong>Claude Code Plugin</strong></td><td>

```
/plugin marketplace add kalpeshgamit/codebase-pilot
/plugin install codebase-pilot
```

</td></tr>
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
# 1. Install
npm install -g codebase-pilot-cli

# 2. Set up your project
cd your-project
codebase-pilot init

# 3. Pack + compress for AI context
codebase-pilot pack --compress --copy

# 4. Scan for secrets before committing
codebase-pilot scan-secrets

# 5. See cost savings
codebase-pilot compare   # "+16K tokens (+$0.05/prompt)"

# 6. Open web dashboard
codebase-pilot ui    # → http://localhost:7456 (health score, trend charts, $)

# 7. (Optional) Install as always-on service
codebase-pilot service   # auto-starts on login, tracks forever
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
codebase-pilot ui               # → http://localhost:7456
codebase-pilot ui --stop        # stop daemon
codebase-pilot ui --status      # check status + diagnostics
codebase-pilot ui --port 8080   # custom port
```

Port **7456** = PILOT on phone keypad. Runs as background daemon with real-time WebSocket updates. Auto-fallback to next port if 7456 is in use.

### Always-On Daemon

Install as a system service — tracks token usage even when the dashboard is closed:

```bash
codebase-pilot service           # install (auto-starts on login)
codebase-pilot service --status  # check if running
codebase-pilot service --restart # restart daemon
codebase-pilot service --uninstall
```

| Platform | Mechanism |
|----------|-----------|
| macOS | launchd (auto-start on login, KeepAlive) |
| Linux | systemd user unit (auto-start, restart on failure) |
| Windows | Task Scheduler (runs at logon, restart on crash) |

Open the dashboard days or weeks later — all your token history is already there.

### Dashboard
Live stat cards (K/M/B abbreviated), savings chart, recent sessions — auto-updates via WebSocket.

<img src="https://raw.githubusercontent.com/kalpeshgamit/codebase-pilot/main/docs/screenshots/dashboard.png" alt="Dashboard" width="100%" />

### Prompts (All Sessions)
User prompts from Claude Code + pack sessions with git context (branch, commit, dirty files). Click any row for detail drawer with token breakdown + savings bar.

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
| **Incremental Pack** | `--affected` packs only changed files (SHA-256), `--prune` uses import graph for minimal context |
| **Prompt Tracking** | Captures actual Claude Code prompts via hooks, git context (branch, commit, dirty), duration |
| **Plugin Marketplace** | Install via `/plugin marketplace add` in Claude Code — 4 skills, hooks, MCP auto-config |
| **Security Scanner** | 180 patterns across 15 categories — cloud, payment, AI, crypto, generic |
| **Blast Radius** | Import graph analysis, risk scoring (0-100), affected test detection |
| **Full-Text Search** | SQLite FTS5 with BM25 ranking, snippet extraction, highlighted matches |
| **Web Dashboard** | 8 pages, dark/light theme, glassmorphism UI, real-time WebSocket, auto-port fallback |
| **MCP Server** | 10 tools + 3 prompts over stdio — works with Claude Code, Cursor, Zed |
| **Multi-Platform** | Generates CLAUDE.md, .cursorrules, .windsurfrules, AGENTS.md |
| **Agent System** | 7-layer sub-agents with haiku/sonnet/opus model routing |
| **Watch Mode** | Chokidar file watching, debounced re-scan, auto-update configs |
| **Incremental** | SHA-256 hash-based change detection — only re-scans modified files |
| **Visualization** | D3.js interactive force-directed import graph (drag, zoom, search) |
| **Benchmarks** | `eval` command — tokens, compression ratio, import edges, timing |
| **Usage Stats** | Per-project + system-wide savings tracking (today/week/month) |
| **Cost Estimation** | Real $ per prompt — "$0.12/prompt, saved $0.32" (Claude Sonnet pricing) |
| **Health Score** | Project health 0-100 — compression, file sizes, usage, gamified |
| **Compare** | `compare` shows token impact of changes — "+16K tokens (+$0.05/prompt)" |
| **GitHub Action** | CI/CD: auto-comment on PRs with token report + cost saved |
| **Pre-commit Hook** | Auto-scans secrets before every commit — blocks if detected |
| **Export API** | `/api/export` — full JSON data, `/api/badge` — dynamic SVG |
| **Always-On Daemon** | System service (launchd/systemd/Task Scheduler), auto-pack, tracks forever |
| **76 Languages** | 3 tiers: 17 full ecosystem, 21 package+test, 38 extension-only |
| **58 Frameworks** | Next.js, Django, Gin, Axum, Spring Boot, Rails, Laravel, and more |
| **39 Test Runners** | Vitest, pytest, Go test, Cargo test, JUnit, RSpec, and more |
| **32 ORMs** | Prisma, SQLAlchemy, GORM, Diesel, Hibernate, ActiveRecord, and more |
| **Config Validation** | Validates agents.json, hooks before writing — prevents invalid configs |
| **Zero Cloud** | No API calls, no accounts, no telemetry. Everything runs locally |

---

## Commands

```
codebase-pilot init [--platform cursor,windsurf,codex]  # scan + generate configs + MCP + hooks
codebase-pilot scan                                      # re-detect + update
codebase-pilot pack [--compress] [--agent <name>]        # pack for AI context
codebase-pilot pack --compress --affected                # incremental — only changed files
codebase-pilot pack --compress --prune <file>            # minimum context via import graph
codebase-pilot pack --compress --dry-run                 # preview without writing output
codebase-pilot scan-secrets [--path <dir>]               # security scan — 180 patterns
codebase-pilot tokens [--agent <name>]                   # token breakdown + savings
codebase-pilot impact [--file <path>]                    # blast radius analysis
codebase-pilot search <query>                            # full-text search
codebase-pilot visualize                                 # D3.js import graph HTML
codebase-pilot ui [--stop | --status | --port N]         # web dashboard (port 7456)
codebase-pilot service [--uninstall | --status]          # install as system service
codebase-pilot serve                                     # MCP server (stdio)
codebase-pilot watch                                     # file watcher
codebase-pilot stats [--global]                          # usage history
codebase-pilot eval                                      # benchmarks
codebase-pilot compare                                   # token impact of changes (+$0.05/prompt)
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

```bash
codebase-pilot scan-secrets           # scan current project
codebase-pilot scan-secrets --path .  # specify directory
```

180 patterns across 15 categories. Runs automatically on every `pack` — files with detected secrets are excluded from output.

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

## Incremental Packing

Pack only what changed — save tokens on every iteration:

```bash
# First run indexes everything, subsequent runs are incremental
codebase-pilot pack --compress --affected

  Changes detected:
    + 2 added
    ~ 3 modified
  Packing 5 affected files...
  Tokens: ~1,200 (compressed from ~4,800, 75% reduction)

# Minimum context — only files reachable via import graph
codebase-pilot pack --compress --prune src/types.ts

  Pruning to files reachable from: src/types.ts
  Files: 31 packed (from 95 total)
  Tokens: ~7,453 (80% reduction)

# Preview without writing output
codebase-pilot pack --compress --dry-run

  [DRY RUN] Preview — no files written
  Files: 95 | Raw: ~125K | Packed: ~35K (72% reduction)
  Top files by tokens:
    26,039 tokens  src/ui/pages.ts
     5,443 tokens  src/security/patterns.ts
     ...
```

---

## Claude Code Plugin

Install as a Claude Code plugin for built-in skills and auto-tracking:

```
/plugin marketplace add kalpeshgamit/codebase-pilot
/plugin install codebase-pilot
```

**4 Skills:**
- `/pack-context` — Pack & compress with --affected, --prune, --dry-run
- `/impact-analysis` — Blast radius for any file change
- `/scan-secrets` — Security scan (180 patterns)
- `/token-budget` — Token counts and savings planning

**Auto-tracking:** Every prompt you type in Claude Code is captured and displayed on the web dashboard (Prompts page) with git context (branch, commit, dirty files).

**MCP Server:** Auto-configured — 10 tools available to Claude Code.

---

## Prompt Tracking

Track every AI interaction with full git context:

```bash
# init auto-configures hooks + MCP
codebase-pilot init
codebase-pilot ui
# Open http://localhost:7456/prompts
```

The Prompts page shows:
- **User Prompts** — actual text typed in Claude Code (via hooks)
- **Pack Sessions** — token usage with branch, commit, duration, savings
- **Click any row** — detail drawer with git context + savings breakdown

| Data | Source |
|------|--------|
| Prompt text | Claude Code `UserPromptSubmit` hook |
| Token usage | Every `pack` / MCP `pack_codebase` call |
| Git context | Branch, commit message, hash, dirty count |
| Duration | Pack execution time |

### Privacy & Security — What We Don't Track

> **codebase-pilot does NOT intercept, proxy, or call any AI provider APIs.**
>
> We don't track AI response tokens, API costs, or model outputs. That data belongs to your AI provider (Anthropic, OpenAI, etc.) and accessing it would require API key access — a security risk we refuse to take.
>
> **What we track:** Only your local codebase context — file tokens, compression savings, git state, and prompt text (via opt-in Claude Code hooks). Everything stays on your machine. Zero cloud. Zero telemetry.
>
> **Our goal:** Help you **reduce** the tokens you send to AI tools, not monitor what AI tools send back.

---

## Cost Estimation

Every token count now shows real dollar value:

```bash
codebase-pilot pack --compress

  Files:    95 packed
  Tokens:   ~35,388 (compressed from ~125,228, 72% reduction)
  Cost:     ~$0.11 per prompt (saved ~$0.27)
```

Dashboard shows weekly/monthly cost: `$36.25 saved · $18.23 used`

Based on Claude Sonnet input pricing ($3/1M tokens). Works with any model — costs scale proportionally.

---

## Compare Changes

See the token impact of your recent changes:

```bash
codebase-pilot compare

  Changes:
    + 8 added (3,630 tokens)
    ~ 17 modified (74,562 tokens now, was 61,347)

  Token impact: +16,845 tokens (+$0.05 per prompt)
  Total now:    156,334 tokens (~$0.47/prompt)

  Top changes by tokens:
    ~ 39,257 tokens  src/ui/pages.ts
    ~ 5,632 tokens   src/mcp/server.ts
```

---

## Export & Badge

```bash
# Export full dashboard data as JSON
curl http://localhost:7456/api/export > report.json

# Dynamic SVG badge for README
# Add: ![](http://localhost:7456/api/badge)
```

---

## GitHub Action

Add token analysis to every PR:

```yaml
# .github/workflows/token-report.yml
name: Token Report
on: [pull_request]
jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: kalpeshgamit/codebase-pilot@main
        with:
          command: 'pack --compress --dry-run'
```

**PR comment output:**

| Metric | Value |
|--------|-------|
| Files | 95 |
| Raw tokens | 125,228 |
| Packed tokens | 35,388 |
| Savings | 72% |
| Cost saved | $0.27 per prompt |
| Secrets | Clean |

Available commands: `pack --compress --dry-run`, `scan-secrets`, `tokens`, `eval`, `impact --file <path>`

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

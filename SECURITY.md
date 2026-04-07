# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.4.x   | Yes       |
| 0.3.x   | Security fixes only |
| < 0.3   | No        |

## Reporting a Vulnerability

If you discover a security vulnerability in codebase-pilot, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, email: **kalpa.hacker@gmail.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Impact assessment
- Suggested fix (if any)

You will receive a response within 48 hours. We will work with you to understand the issue and coordinate a fix before public disclosure.

## Security Design Principles

codebase-pilot is designed with security as a core principle:

- **Zero cloud** — no API calls, no telemetry, no external network requests
- **Zero AI API access** — we do NOT intercept, proxy, or call any AI provider APIs (Anthropic, OpenAI, etc.)
- **Local-only processing** — all scanning, packing, and analysis runs on your machine
- **Secret detection** — 180 regex patterns across 15 categories automatically filter secrets from pack output
- **No code execution** — codebase-pilot reads and analyzes files but never executes project code
- **No credential storage** — no accounts, no tokens, no auth required
- **Opt-in tracking** — prompt capture via Claude Code hooks requires explicit opt-in via settings.json

## Permissions Manifest

Detailed explanation of every system permission used by codebase-pilot.

### Filesystem Read

| What | Why | Scope |
|------|-----|-------|
| Project files | Scan, pack, compress codebase | Only files in project directory |
| `.codebase-pilot/` | Read config, hashes, logs | Project-local config dir |
| `~/.codebase-pilot/` | Global history, prompt logs | User home config dir |
| `package.json` | Version detection | Project + package root |

### Filesystem Write

| What | Why | Scope |
|------|-----|-------|
| `codebase-pilot-output.*` | Pack output file | Project directory |
| `.codebase-pilot/` | Config, hashes, logs, context.xml | Project-local config dir |
| `~/.codebase-pilot/` | Global history, prompt logs, daemon log | User home config dir |
| `.claude/settings.json` | Hook configuration (during `init`) | Project `.claude/` dir |
| `.claude/mcp.json` | MCP server config (during `init`) | Project `.claude/` dir |

### Network (Local Only)

| What | Why | Scope |
|------|-----|-------|
| `node:http` server | Web dashboard UI | `localhost` only (port 7456) |
| `node:net` socket | Port availability check | `127.0.0.1` only |
| WebSocket server | Real-time dashboard updates | `localhost` only |

**No outbound network requests.** The HTTP server binds to localhost only. No data is ever sent to external servers.

### Process Execution

| What | Why | Security |
|------|-----|----------|
| `git rev-parse` | Get current branch name | Read-only git command, no args from user input |
| `git log -1` | Get last commit message | Read-only git command |
| `git status --porcelain` | Count uncommitted changes | Read-only git command |
| `spawn(node, [daemon.js])` | Start background daemon | Spawns own code only, not user input |
| `launchctl` / `systemctl` / `schtasks` | System service install | Only with hardcoded service names |

All `child_process` calls use `execFileSync` (not `exec`) to prevent shell injection. Arguments are hardcoded constants — never constructed from user input.

### Environment Variables

| Variable | Why |
|----------|-----|
| `HOME` / `USERPROFILE` | Locate `~/.codebase-pilot/` config dir |
| `USERNAME` / `USER` | Windows Task Scheduler user identification |
| `CODEBASE_PILOT_DAEMON` | Internal flag for daemon process detection |

### SQLite Database

| Operation | Why |
|-----------|-----|
| `CREATE TABLE file_meta` | Full-text search index metadata |
| `CREATE VIRTUAL TABLE files_fts USING fts5` | BM25 ranked full-text search |
| `DELETE FROM files_fts` | Rebuild search index |

The SQLite database is local-only, stored in memory or in `.codebase-pilot/`. No external database connections.

### Data Flow Explanation

**`os.homedir()` → `child_process.spawn()`:**
The home directory path is used to locate the daemon log file (`~/.codebase-pilot/ui.log`). The spawn call starts the codebase-pilot daemon process — it does not execute arbitrary code.

**`fs.readFileSync()` → `child_process.spawn()`:**
The PID file is read to check if a daemon is already running. The spawn call starts a new daemon if needed. No file contents are passed as shell arguments.

## Secret Scanner Scope

The built-in security scanner detects secrets in files before they reach AI context windows. It is not a replacement for dedicated secret scanning tools like:

- [gitleaks](https://github.com/gitleaks/gitleaks)
- [trufflehog](https://github.com/trufflesecurity/trufflehog)
- GitHub Secret Scanning

codebase-pilot's scanner is optimized for LLM context protection, not comprehensive secret management.

## Privacy

- **No telemetry** — we don't send any usage data anywhere
- **No AI API access** — we never call Anthropic, OpenAI, or any AI provider API
- **Local prompt logging** — prompt text captured via Claude Code hooks stays in `~/.codebase-pilot/prompts.jsonl` on your machine
- **Opt-in only** — prompt tracking requires explicit hook configuration
- **No response tracking** — we never access or store AI model responses

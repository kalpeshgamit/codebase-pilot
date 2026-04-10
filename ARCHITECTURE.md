# Architecture

codebase-pilot — TypeScript, Node.js, zero cloud context engine.

## Repository Structure

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

plugin/
  .claude-plugin/   # Claude Code plugin manifest + CLAUDE.md
  skills/           # 19 skill SKILL.md files
```

---

### Plugin Skills Layer (`plugin/skills/`)

19 skills total — 5 context tools + 14 workflow skills. Pure markdown `SKILL.md` files, zero build step, loaded by Claude Code harness at runtime.

**Context & Tooling (codebase-pilot native):**

| Skill | Purpose |
|-------|---------|
| `pilot-check` | Full health check — chains pack + secrets + git compare |
| `pack-context` | Compress codebase for LLM context window |
| `scan-secrets` | 179-pattern security scan across 15 categories |
| `impact-analysis` | Blast radius of file changes via import graph |
| `token-budget` | Token count per file, context planning |

**Workflow Skills (built-in, zero external dependencies):**

| Skill | Tier | codebase-pilot Integration |
|-------|------|---------------------------|
| `using-codebase-pilot` | 3 — full original | Session start, full skill directory |
| `thinking` | 2 — integrated | Uses pack-context for project context load |
| `writing-plans` | 2 — integrated | References agents.json agent boundaries |
| `executing-plans` | 1 — rebranded | — |
| `test-driven-development` | 2 — integrated | Uses impact-analysis for test scope |
| `debugging` | 2 — integrated | Uses impact-analysis for blast radius |
| `subagent-driven-development` | 3 — full original | Reads agents.json, uses pack --agent |
| `dispatching-parallel-agents` | 2 — integrated | Reads agents.json patterns |
| `finishing-a-development-branch` | 1 — rebranded | — |
| `requesting-code-review` | 1 — rebranded | — |
| `receiving-code-review` | 1 — rebranded | — |
| `verification-before-completion` | 1 — rebranded | — |
| `using-git-worktrees` | 1 — rebranded | — |
| `writing-skills` | 1 — rebranded | — |

# codebase-pilot plugin

The codebase-pilot context engine optimizes token usage for large codebases.

## Available Skills

### Context & Tooling
- `/pilot-check` — Full health check (chains pack + secrets + compare, saves ~75% tokens)
- `/pack-context` — Pack codebase into AI-friendly format with compression
- `/impact-analysis` — Analyze blast radius of file changes
- `/scan-secrets` — Scan for leaked secrets and credentials
- `/token-budget` — Check token counts and plan context budget

### Workflow Skills
- `/using-codebase-pilot` — Session start: how to use all codebase-pilot skills
- `/thinking` — Turn ideas into designs and specs through collaborative dialogue
- `/writing-plans` — Write comprehensive implementation plans from specs
- `/executing-plans` — Execute a written plan task-by-task with review checkpoints
- `/test-driven-development` — TDD: write failing test first, red-green-refactor cycle
- `/debugging` — Root cause investigation before any fix attempt
- `/subagent-driven-development` — Fresh subagent per task with two-stage review
- `/dispatching-parallel-agents` — Dispatch multiple independent agents concurrently
- `/finishing-a-development-branch` — Complete dev branch: verify, PR, merge
- `/requesting-code-review` — Request code review with proper context
- `/receiving-code-review` — Handle review feedback systematically
- `/verification-before-completion` — Pre-completion quality checklist
- `/using-git-worktrees` — Manage git worktrees for parallel development
- `/writing-skills` — Create new skills following established patterns

## Auto Behavior
- **SessionStart**: Automatically runs chained health check (pack + secrets + compare)
- **UserPromptSubmit**: Captures every prompt for dashboard tracking

## Available MCP Tools
Available tools (via MCP server):
- `pack_codebase` — Pack and compress codebase (tracks tokens automatically)
- `scan_project` — Detect languages, frameworks, databases
- `count_tokens` — Token breakdown per file
- `scan_secrets` — Security scan (180 patterns)
- `health_check` — Validate agent setup
- `list_agents` / `get_agent` — Agent configuration
- `detect_languages` — Language detection
- `get_savings` — Token savings history
- `list_files` — File listing with tokens

## Key Commands
- `codebase-pilot pack --compress` — Full pack with compression (~70% token reduction)
- `codebase-pilot pack --compress --affected` — Only changed files (incremental)
- `codebase-pilot pack --compress --prune <file>` — Minimum context via import graph
- `codebase-pilot pack --dry-run` — Preview without output
- `codebase-pilot impact --file <path>` — Blast radius analysis

## Privacy
codebase-pilot does NOT intercept or call any AI provider APIs. We only track local codebase context (file tokens, compression, git state). Zero cloud. Zero telemetry. Your AI provider's response data is never accessed.

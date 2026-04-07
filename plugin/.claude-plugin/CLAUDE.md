# codebase-pilot plugin

You have access to the codebase-pilot context engine. Use it to optimize token usage when working with large codebases.

## Available Skills
- `/pack-context` — Pack codebase into AI-friendly format with compression
- `/impact-analysis` — Analyze blast radius of file changes
- `/scan-secrets` — Scan for leaked secrets and credentials
- `/token-budget` — Check token counts and plan context budget

## Available MCP Tools
When the MCP server is active, you have these tools:
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

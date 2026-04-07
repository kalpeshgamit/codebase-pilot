---
name: pack-context
description: Pack and compress the codebase into an AI-friendly context file. Use when starting work on a new feature, reviewing code, or when you need the full codebase context with minimal tokens.
---

# Pack Context

Pack the current codebase into a compressed, AI-friendly format. Saves 60-90% tokens.

## Usage

### Full project pack (compressed)
```bash
codebase-pilot pack --compress
```

### Only changed files (incremental — fastest)
```bash
codebase-pilot pack --compress --affected
```

### Minimum context for a specific file
```bash
codebase-pilot pack --compress --prune <target-file>
```

### Preview without writing output
```bash
codebase-pilot pack --compress --dry-run
```

### Agent-scoped pack
```bash
codebase-pilot pack --compress --agent <agent-name>
```

## When to Use
- Starting a new coding task — pack first to understand the codebase
- After making changes — use `--affected` to see what changed
- Investigating a specific file — use `--prune` for minimum context
- Before a code review — pack to see the full picture

## Output
- XML format by default (best for AI parsing)
- Markdown format with `--format md`
- Copy to clipboard with `--copy`

## Tips
- `--affected` uses SHA-256 hashing — first run indexes everything, subsequent runs are incremental
- `--prune` traverses the import graph bidirectionally (imports + dependents)
- `--dry-run` shows top 10 files by token count

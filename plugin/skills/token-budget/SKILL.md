---
name: token-budget
description: Check token counts per file and plan your context budget. Use when you need to understand which files consume the most tokens and how to optimize context window usage.
---

# Token Budget

Analyze token distribution across your codebase and plan context usage.

## Usage

### Token breakdown (top files by size)
```bash
codebase-pilot tokens
```

### Token breakdown for specific agent
```bash
codebase-pilot tokens --agent <name>
```

### Dry run to preview pack budget
```bash
codebase-pilot pack --compress --dry-run
```

### Usage history and savings
```bash
codebase-pilot stats
codebase-pilot stats --global
```

## When to Use
- Before packing — know your token budget
- Choosing `--agent` scope — see which agent contexts are leanest
- Deciding whether to use `--compress` — see the potential savings
- Tracking savings over time — `stats` shows daily/weekly/monthly

## Output Example

```
Savings estimate (per session):
  Without codebase-pilot:   ~98,798 tokens
  With pack --compress:      ~29,274 tokens
  Pilot saves:              ~69,524 tokens per session

Your savings (from pack runs):
  Today:      3 sessions  — ~92,232 tokens saved
  This week:  5 sessions  — ~147,498 tokens saved
```

## Tips
- Web dashboard: `http://localhost:7456` shows live token stats
- Files page: `http://localhost:7456/files` shows per-file token breakdown
- Prompts page: `http://localhost:7456/prompts` shows all session history

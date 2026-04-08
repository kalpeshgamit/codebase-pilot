---
name: pilot-check
description: Full project health check — chains pack analysis, secret scan, token budget, and impact overview in a single pass. Saves tokens by combining all checks into one context load.
---

# Pilot Check (Chained)

Runs all codebase-pilot checks in one pass — saves tokens vs running each separately.

## Chain Sequence

### Step 1: Pack Analysis
```bash
codebase-pilot pack --compress --dry-run
```
Captures: file count, raw tokens, packed tokens, cost per prompt, top files.

### Step 2: Security Scan
```bash
codebase-pilot scan-secrets
```
Captures: secret count, affected files, risk categories.

### Step 3: Token Comparison
```bash
codebase-pilot compare
```
Captures: added/modified/deleted files, token delta, cost impact.

### Step 4: Report Summary
Combine all results into a single report:

```
Project Health Report
─────────────────────
Files:     104 scanned
Tokens:    ~41K packed (from ~150K raw) — 72% reduction
Cost:      ~$0.12/prompt (saves $0.33)
Security:  3 files with secrets (auto-excluded)
Changes:   +8 added, ~17 modified since last pack
Impact:    +16,845 tokens (+$0.05/prompt)
Health:    85/100
```

## When to Run
- Start of a coding session — get full project status
- Before a PR — verify token impact + security
- Weekly review — track savings over time

## Token Savings
Running 4 separate skills: ~4x context loads.
Running pilot-check: 1 context load + 4 CLI commands.
Saves ~75% tokens on the meta-analysis itself.

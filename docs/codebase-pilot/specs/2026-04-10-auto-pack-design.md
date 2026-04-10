# Spec: Auto-Pack (`--auto` flag)

**Date:** 2026-04-10  
**Status:** Approved  
**Author:** KG + Claude  
**Depends on:** `--task` flag (spec: 2026-04-10-task-aware-pack-design.md)

---

## Problem

`pack --task` requires the developer to manually describe what they're working on. This is friction — the developer already described their work in the branch name, commit messages, and the diff itself. `--auto` reads those signals and infers the task automatically. Zero description needed.

**Goal:** `codebase-pilot pack --auto` produces the same targeted result as `--task` but with zero manual input.

---

## Success Criteria

- `codebase-pilot pack --auto` selects files relevant to the current work without any flags
- Always shows what was inferred — developer can verify or override with `--task`
- Composes cleanly with `--compress`, `--budget`, `--dry-run`, `--format`
- Graceful fallback when signals are absent (no crash, visible warning)
- Zero cloud, zero ML, zero new dependencies — `spawnSync('git', [...])` only
- All existing tests pass

---

## Signal Priority Ladder

When signals conflict, later signals are hints only — earlier signals are ground truth:

| Priority | Signal | How extracted | Role |
|----------|--------|--------------|------|
| 1st | Staged files | `git diff --cached --name-only` | Direct seeds (score=1.0) |
| 2nd | Unstaged diff | `git diff HEAD --name-only` | Direct seeds (score=1.0) |
| 3rd | Branch name | `git branch --show-current` | Vocabulary for BM25 |
| 4th | Recent commits | `git log -5 --format=%s` | Vocabulary for BM25 |

---

## Approach: Direct Seeds + Vocabulary BM25

Two-source seed model:

1. **Changed files** (staged + unstaged) become guaranteed seeds at score=1.0, reason=`'diff'`. They will always appear in the final pack — they are what the developer is working on.

2. **Branch name + commit message tokens** feed a BM25 query to find *related* files not directly touched. These become seeds at score=0.7, reason=`'bm25'`.

3. Both seed sources are merged and fed into the existing import graph expansion (hop-1 ×0.5, hop-2 ×0.25, high-centrality penalty).

---

## Data Flow

```
codebase-pilot pack --auto
         │
         ▼
  extractGitSignals(root)
  ├── git diff --cached --name-only  → stagedFiles[]
  ├── git diff HEAD --name-only      → unstagedFiles[]
  ├── git branch --show-current      → branchName
  └── git log -5 --format=%s        → commitMessages[]
         │
         ▼
  No useful signals?
  → warn user + fall back to full pack
         │
         ▼
  synthesizeQuery(signals)
  ├── tokenize branchName: "fix/auth-middleware-bug" → ["auth","middleware","bug"]
  ├── tokenize commitMessages: "feat: add stripe webhook" → ["stripe","webhook"]
  └── combined vocabulary query string
         │
         ▼
  Seed Builder
  ├── changedFiles → ScoredFile[] score=1.0, reason='diff'
  └── BM25(vocabulary) → ScoredFile[] score=0.7, reason='bm25'
         │
         ▼
  Import Graph Expansion (existing logic)
  hop-1 (×0.5), hop-2 (×0.25), high-centrality penalty
         │
         ▼
  Display:
  Auto-detected: "auth middleware bug stripe webhook"
  Signals:  2 staged, 1 unstaged, branch "fix/auth-middleware", 3 commits
  Changed:  3 files  (direct diff)
  Related:  9 files  (BM25 + imports)
  Total:    12 files selected from 130
         │
         ▼
  packProject() existing pipeline
  security scan → compress → budget → format → output
```

---

## Generic Branch Detection

Branches that carry no useful vocabulary:

```typescript
const GENERIC_BRANCHES = new Set([
  'main', 'master', 'dev', 'develop', 'development',
  'staging', 'production', 'release', 'hotfix', 'HEAD',
]);
```

If branch name is generic → skip it, rely on commits + diff only. Do not add noise.

---

## Fallback Conditions

`--auto` falls back to full pack (with visible warning) when ALL of the following are true:
- Working tree is clean (no staged, no unstaged changes)
- Branch name is in `GENERIC_BRANCHES`
- No commit messages in the last 5 contain meaningful non-stop tokens

Warning shown:
```
  Auto-detect: no task signals found
    — branch "main" is too generic
    — working tree is clean
  Falling back to full pack. Use --task to describe your work manually.
```

---

## Interface

### CLI
```bash
codebase-pilot pack --auto
codebase-pilot pack --auto --compress
codebase-pilot pack --auto --compress --budget 20000
codebase-pilot pack --auto --dry-run
codebase-pilot pack --auto --format md
```

### `--auto` cannot be combined with `--task`
If both are passed: error — "Use either --auto or --task, not both."

### Always-visible output
```
  Auto-detected: "auth middleware token validation"
  Signals:  2 staged, 1 unstaged, branch "fix/auth-middleware-bug", 3 commits
  Changed:  3 files  (direct diff)
  Related:  9 files  (BM25 + imports)
  Total:    12 files selected from 130
```

### Dry-run shows selected files with scores and signal source
```
  Selected files:
    score=1.00  src/middleware/auth.ts         (diff — staged)
    score=1.00  src/middleware/token.ts        (diff — unstaged)
    score=0.70  src/routes/protected.ts        (BM25 match)
    score=0.50  src/utils/jwt.ts              (import)
    ...
```

---

## File Changes

### New file: `src/intelligence/git-signals.ts`

```typescript
export interface GitSignals {
  stagedFiles: string[];
  unstagedFiles: string[];
  branchName: string;
  commitMessages: string[];
  hasUsefulSignals: boolean;
}

export function extractGitSignals(root: string): GitSignals
export function synthesizeQuery(signals: GitSignals): string
export function inferTaskDescription(signals: GitSignals): string
```

- Uses `spawnSync('git', [...])` — same pattern as existing `tokens.ts`
- All functions pure — no side effects, no file writes
- Handles non-git directories gracefully (returns empty signals)

### Modified: `src/intelligence/task-selector.ts`

Export a new function reusing internal graph expansion logic:

```typescript
export function selectFilesForAuto(
  root: string,
  diffFiles: string[],       // direct seeds — score=1.0
  vocabularyQuery: string,   // BM25 query from branch+commits
): ScoredFile[]
```

### Modified: `src/packer/index.ts`

- Add `auto?: boolean` to `PackOptions`
- If `auto` and `task` both set → throw usage error
- If `auto`: call `extractGitSignals()` → `selectFilesForAuto()` → filter files
- Extend `PackResult` with `autoSignals?: GitSignals` and `autoDescription?: string`

### Modified: `src/cli/pack.ts`

- Add `auto?: boolean` to `PackCommandOptions`
- Print auto-detection summary (always, before dry-run check)
- In `--dry-run` mode, show per-file scores with signal source labels

### Modified: `src/bin/codebase-pilot.ts`

- Add `.option('--auto', 'Infer task from git diff, branch name, and recent commits', false)`

---

## Token Savings Estimate

On a real feature branch with 5–10 changed files:

| Scenario | Files | Tokens | vs full compress |
|----------|-------|--------|-----------------|
| `pack --compress` | 130 | ~86k | baseline |
| `pack --auto --compress` | ~15 | ~12k | −86% |
| `pack --auto --compress --budget 10000` | ~8 | ~8k | −91% |

---

## Edge Cases

| Case | Handling |
|------|---------|
| Not a git repo | `extractGitSignals` returns empty, falls back to full pack with warning |
| All changed files are deleted | `git diff` shows deletions — skip deleted paths, use vocabulary only |
| Binary files in diff | Filtered by existing `.claudeignore` and `collectFiles()` |
| Branch name is a ticket number `JIRA-1234` | Tokenizes as `['jira', '1234']` — useless, skipped via min-length filter |
| `--auto` + `--task` | Error: "Use either --auto or --task, not both" |
| `--auto` + `--affected` | `--affected` applies first, `--auto` seeds from within that set |
| Detached HEAD | `git branch` returns empty → skip branch signal, use diff + commits |
| Monorepo | `git diff --name-only` returns paths relative to repo root — same as `collectFiles` |

---

## Testing Plan

- Unit: `extractGitSignals()` with mocked `spawnSync` output
- Unit: `synthesizeQuery()` — branch tokenization, stop-word removal, generic branch detection
- Unit: `inferTaskDescription()` — readable output from signals
- Unit: `selectFilesForAuto()` — diff seeds always present, BM25 seeds merged correctly
- Integration: `pack --auto --dry-run` on this repo — verify changed files appear
- Edge: clean working tree → fallback warning shown
- Regression: `pack --compress` unchanged

---

## Out of Scope

- Reading PR description or GitHub issue body
- Learning from past auto-pack runs to improve inference
- Auto-detecting task from IDE open tabs
- `--auto` in watch mode (future: re-pack on file save)

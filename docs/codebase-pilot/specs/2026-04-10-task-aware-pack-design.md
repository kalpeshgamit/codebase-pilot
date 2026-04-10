# Spec: Task-Aware Pack (`--task` flag)

**Date:** 2026-04-10  
**Status:** Approved  
**Author:** KG + Claude  

---

## Problem

`codebase-pilot pack` reduces token count by compression and filtering, but selection is still static — every pack includes the same files regardless of what the developer is actually working on. A developer fixing an auth bug sends UI components. A developer adding a payment endpoint sends database migrations. The context is smaller than raw, but still unfocused.

**Goal:** Pack only the files relevant to a specific task description. Turn "good" (smaller) into "very good" (targeted).

---

## Success Criteria

- `codebase-pilot pack --task "add Stripe webhook"` selects 5–15 files instead of 126
- Selected files are demonstrably relevant to the task (manually verifiable)
- Token count is 60–90% lower than `pack --compress` for focused tasks
- Composes cleanly with `--compress`, `--budget`, `--format`, `--agent`
- Zero new dependencies, zero cloud calls, zero new index formats
- Build stays clean, all existing tests pass

---

## Approach: BM25 + Import Graph + Symbol Fallback

Three-stage pipeline, all using existing infrastructure:

### Stage 1 — BM25 Search
Query the existing `.codebase-pilot/search.db` (already built by `codebase-pilot search`).

- Tokenize task string: `"add Stripe webhook endpoint"` → `["stripe", "webhook", "endpoint"]`
- Strip stop words: remove `["add", "a", "an", "the", "to", "for", "in", "of", "and", "or"]`
- Run BM25 query, collect top-20 results with scores normalized to 0–1
- If results ≥ 3 files → proceed to Stage 3 (Graph Expansion)
- If results < 3 files → proceed to Stage 2 (Symbol Fallback)

### Stage 2 — Symbol Fallback (triggered when BM25 < 3 results)
Handles vocabulary mismatch: task says "payment processing", code says `chargeCard()`.

- Scan all files for exported symbol names (functions, classes, variables) using regex: `/export\s+(?:function|class|const|let|var)\s+(\w+)/g`
- Fuzzy-match task tokens against symbol names using substring containment
- Files with matching symbols become BM25 seeds with score = 0.6
- Continue to Stage 3

### Stage 3 — Import Graph Expansion
Expand each seed file by following its import graph.

```
seed file (BM25 hit):       score = bm25_score
hop-1 import:               score = parent_score × 0.5
hop-2 import:               score = parent_score × 0.25
deeper hops:                ignored (diminishing returns)
```

**High-centrality penalty:** Files imported by more than 20 other files (e.g. `types.ts`, `utils.ts`) receive `score × 0.1` unless they also appeared in BM25 results. This prevents shared utilities from flooding the result set.

**De-duplication:** If a file appears via multiple paths, keep the highest score.

**Sort:** Descending by score. Hand result list to existing `packProject()` pipeline.

---

## Data Flow

```
codebase-pilot pack --task "add Stripe webhook" --compress --budget 20000
         │
         ▼
  Task Tokenizer
  ["stripe", "webhook", "endpoint"]
         │
         ▼
  BM25 Search (.codebase-pilot/search.db)
  top-20 files with scores
         │
    ≥ 3 files?──────No──────► Symbol Fallback
         │                     scan exported symbols
         │                     fuzzy match task tokens
         ▼
  Import Graph Expansion
  hop-1 (×0.5), hop-2 (×0.25)
  high-centrality penalty (×0.1)
         │
         ▼
  Scored File List (sorted desc)
         │
         ▼
  packProject() — existing pipeline
  security scan → compress → budget trim → format
         │
         ▼
  Output + summary line:
  "Task: 11 files selected (7 BM25 + 4 imports) from 126"
```

---

## Interface

### CLI
```bash
# basic
codebase-pilot pack --task "add Stripe webhook endpoint"

# with compression + budget
codebase-pilot pack --task "fix auth middleware bug" --compress --budget 20000

# dry-run to preview selection
codebase-pilot pack --task "refactor user model" --dry-run

# compose with agent scoping
codebase-pilot pack --task "add caching layer" --agent backend
```

### Output summary line (always shown)
```
  Task:     "add Stripe webhook endpoint"
  Selected: 11 files (7 BM25 + 4 imports) from 126
  Tokens:   ~9,340 (~$0.03/prompt)
```

### `--task` + `--dry-run` shows selected files
```
  Task:     "add Stripe webhook endpoint"
  Selected: 11 files (7 BM25 + 4 imports) from 126

  Selected files:
    score=0.91  src/routes/payments.ts
    score=0.84  src/services/stripe.ts
    score=0.71  src/middleware/auth.ts
    score=0.50  src/types.ts          (import)
    ...
```

---

## File Changes

### New file
**`src/intelligence/task-selector.ts`**
```typescript
export interface ScoredFile {
  relativePath: string;
  score: number;
  reason: 'bm25' | 'symbol' | 'import';
}

export function selectFilesForTask(
  root: string,
  task: string,
): ScoredFile[]
```

- Self-contained, pure function (no side effects)
- Reads `search.db` via existing search infrastructure
- Calls `buildImportGraph()` from `src/intelligence/imports.ts`
- Returns scored list — caller decides how many to use

### Modified files

**`src/packer/index.ts`**
- Add `task?: string` to `PackOptions`
- If `task` is set, call `selectFilesForTask()` before security scan
- Filter `files` to only those in the scored result set

**`src/cli/pack.ts`**
- Add `task?: string` to `PackCommandOptions`
- Print task selection summary line after security scan output
- In `--dry-run` mode, show selected files with scores

**`src/bin/codebase-pilot.ts`**
- Add `.option('--task <description>', 'Pack only files relevant to this task description')`

### Unchanged
- Search index format (`search.db`)
- Import graph format
- Formatters (XML, MD)
- Compressor
- All existing flags and behavior

---

## Token Savings Estimate

Based on this project (126 files, 81k compressed tokens):

| Task type | Files selected | Estimated tokens | vs full compress |
|-----------|---------------|-----------------|-----------------|
| "fix auth bug" | ~8 files | ~6,000 | −93% |
| "add payment endpoint" | ~12 files | ~10,000 | −88% |
| "refactor user model" | ~20 files | ~18,000 | −78% |
| "review architecture" | ~50 files | ~40,000 | −51% |

---

## Edge Cases

| Case | Handling |
|------|---------|
| Search index not built | Error: "Run `codebase-pilot search --rebuild` first" |
| Task matches 0 files | Warning shown, falls back to full pack |
| Task matches 1–2 files | Symbol fallback triggered automatically |
| All matches are high-centrality | Penalty relaxed if result set < 5 files |
| `--task` + `--affected` | `--affected` filter applied first, task selection on the reduced set |
| `--task` + `--agent` | Agent context paths filter applied first, task selection on those files |

---

## Testing Plan

- Unit: `selectFilesForTask()` with mock search results and import graph
- Integration: pack with `--task` on this codebase, verify relevant files appear
- Edge: empty task string, task with no matches, task with only stop words
- Regression: all existing pack tests unchanged

---

## Out of Scope

- Semantic/embedding-based search (requires ML model)
- Learning from past task→file mappings (future: session memory)
- Multi-task selection (`--task A --task B`)
- Auto-detecting task from git diff or branch name (future enhancement)

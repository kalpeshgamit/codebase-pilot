# Implementation Plan: Task-Aware Pack (`--task` flag)

**Date:** 2026-04-10  
**Spec:** `docs/codebase-pilot/specs/2026-04-10-task-aware-pack-design.md`  
**Status:** Ready to execute  

---

## Overview

4 files touched. 1 new file created. Execution order: Task 1 → Task 2 → Task 3 → Task 4 (sequential, each builds on previous). Task 5 (tests) can run after Task 1 is complete.

---

## Task 1 — Create `src/intelligence/task-selector.ts`

**File:** `src/intelligence/task-selector.ts` (new)  
**Parallel:** No — foundation for all other tasks  

### Exact implementation

```typescript
import { join, existsSync } from 'node:path' // + fs imports
import { createSearchIndex } from './search.js'
import { buildImportGraph, getReverseDependencies } from './imports.js'
import { collectFiles } from '../packer/collector.js'

export interface ScoredFile {
  relativePath: string
  score: number
  reason: 'bm25' | 'symbol' | 'import'
}

export function selectFilesForTask(root: string, task: string): ScoredFile[]
```

**Internal steps:**

1. **tokenizeTask(task)**
   - Lowercase, split on whitespace + punctuation
   - Remove stop words: `['a','an','the','to','for','in','of','and','or','add','fix','update','create','delete','remove','get','set','use','make','with','from','into','by','as','at','on','is','be','do']`
   - Return `string[]` of meaningful tokens

2. **BM25 query via `createSearchIndex(root).search()`**
   - Join tokens with ` OR ` for SQLite FTS5 query
   - Request top-20 results
   - SQLite BM25 scores are negative (lower = better) — normalize: `normalizedScore = 1 / (1 + Math.abs(score))`
   - If `searchIndex.search()` throws (index not built) → throw `Error('Search index not found. Run: codebase-pilot search --rebuild')`
   - Collect as `Map<relativePath, { score: number, reason: 'bm25' }>`

3. **Symbol fallback (if BM25 results < 3)**
   - `collectFiles(root, {})` — get all file contents
   - For each file, extract exported symbols: `/export\s+(?:async\s+)?(?:function|class|const|let|var)\s+(\w+)/g`
   - For each task token, check if any symbol name includes the token (case-insensitive substring)
   - Matching files added to seed map with score `0.6`, reason `'symbol'`

4. **Import graph expansion (hop-1 and hop-2)**
   - `buildImportGraph(root)` → `Map<file, Set<import>>`
   - `getReverseDependencies(graph)` → `Map<file, Set<dependant>>` (for centrality)
   - Calculate centrality: `centralityMap = Map<file, reverseGraph.get(file)?.size ?? 0>`
   - For each seed file S with score `s`:
     - For each file I that S imports (hop-1): add to results with score `s * 0.5`, reason `'import'`
     - For each file I2 that I imports (hop-2): add to results with score `s * 0.25`, reason `'import'`
   - De-duplicate: if file already in map, keep the **higher** score
   - High-centrality penalty: if `centralityMap.get(file) > 20` AND file not in BM25 seeds → `score *= 0.1`
   - Edge case: if after penalty result set < 5 files, relax penalty (remove `*0.1` multiplier)

5. **Return** array sorted descending by score, all files with score > 0.05

**Acceptance criteria:**
- `selectFilesForTask(root, 'pack compress tokens')` returns files including `src/cli/pack.ts`, `src/packer/index.ts`, `src/packer/token-counter.ts`
- `selectFilesForTask(root, 'xyznotexist')` with < 3 BM25 hits triggers symbol fallback without throwing
- `selectFilesForTask(root, '')` returns empty array without throwing
- High-centrality files like `src/types.ts` are NOT in results unless directly relevant to query

---

## Task 2 — Update `src/packer/index.ts`

**File:** `src/packer/index.ts`  
**Parallel:** No — depends on Task 1  

### Exact changes

**A) Add `task?: string` to `PackOptions` interface:**
```typescript
export interface PackOptions {
  // ... existing fields ...
  task?: string;  // If set, select only task-relevant files via BM25 + import graph
}
```

**B) Add import at top:**
```typescript
import { selectFilesForTask } from '../intelligence/task-selector.js';
```

**C) Add task selection block** — insert after the `--prune` block (line ~85), before the security scan:
```typescript
// --task: select only files relevant to the task description
let taskSelection: Map<string, number> | undefined;
if (options.task) {
  const selected = selectFilesForTask(root, options.task);
  if (selected.length === 0) {
    console.log(`  Warning: no files matched task "${options.task}" — packing all files`);
  } else {
    taskSelection = new Map(selected.map(f => [f.relativePath, f.score]));
    files = files.filter(f => taskSelection!.has(f.relativePath));
  }
}
```

**D) Track selection counts** for summary line — add before security scan:
```typescript
const bm25Count = options.task
  ? (selectFilesForTask was called above — capture counts from ScoredFile[])
  : 0;
```

> Note: refactor step C slightly — store the full `ScoredFile[]` from `selectFilesForTask()` in a local variable so both filtering and count reporting can use it.

**Acceptance criteria:**
- `packProject({ dir, task: 'pack compress', ... })` returns only files related to packing
- `packProject({ dir, task: '', ... })` packs all files (empty task = no filter)
- `packProject({ dir, task: 'xyzunknown', ... })` warns and packs all files

---

## Task 3 — Update `src/cli/pack.ts`

**File:** `src/cli/pack.ts`  
**Parallel:** No — depends on Task 2  

### Exact changes

**A) Add `task?: string` to `PackCommandOptions`:**
```typescript
interface PackCommandOptions {
  // ... existing fields ...
  task?: string;
}
```

**B) Pass `task` to `packProject()`:**
```typescript
const result = packProject({
  // ... existing fields ...
  task: options.task,
});
```

**C) Print task summary line** — insert after the security scan output block, before `--dry-run` check:
```typescript
if (options.task) {
  const bm25Count = result.taskBm25Count ?? 0;
  const importCount = result.taskImportCount ?? 0;
  const total = bm25Count + importCount;
  console.log(`  Task:     "${options.task}"`);
  console.log(`  Selected: ${total} files (${bm25Count} BM25 + ${importCount} imports) from ${result.totalFileCount}`);
  console.log('');
}
```

**D) In `--dry-run` mode**, show selected files with scores when `--task` is set:
```typescript
if (options.dryRun && options.task && result.taskScores) {
  console.log('  Selected files:');
  for (const f of result.taskScores.slice(0, 15)) {
    const reasonLabel = f.reason === 'import' ? '  (import)' : '';
    console.log(`    score=${f.score.toFixed(2)}  ${f.relativePath}${reasonLabel}`);
  }
  console.log('');
}
```

**E) Update `PackResult` in `src/packer/index.ts`** to carry back task metadata:
```typescript
export interface PackResult {
  // ... existing fields ...
  taskBm25Count?: number;
  taskImportCount?: number;
  totalFileCount?: number;   // file count before task filtering
  taskScores?: ScoredFile[]; // full scored list for dry-run display
}
```

**Acceptance criteria:**
- Running with `--task "pack compress"` prints `Task:` and `Selected:` summary lines
- Running with `--task "pack compress" --dry-run` shows per-file scores
- Running without `--task` shows no task-related output (zero regression)

---

## Task 4 — Update `src/bin/codebase-pilot.ts`

**File:** `src/bin/codebase-pilot.ts`  
**Parallel:** Yes — can run alongside Task 3 (independent change)  

### Exact change

Add one option to the `pack` command registration:
```typescript
.option('--task <description>', 'Pack only files relevant to this task description')
```

Insert after the existing `--prune` option line.

**Acceptance criteria:**
- `codebase-pilot pack --help` shows `--task <description>` in options list
- `codebase-pilot pack --task "add webhook" --dry-run` runs without error

---

## Task 5 — Tests: `tests/intelligence/task-selector.test.ts`

**File:** `tests/intelligence/task-selector.test.ts` (new)  
**Parallel:** Can start after Task 1 is complete  

### Test cases

```typescript
describe('tokenizeTask', () => {
  it('removes stop words')           // "add a webhook" → ["webhook"]
  it('lowercases all tokens')        // "Stripe Webhook" → ["stripe", "webhook"]
  it('handles empty string')         // "" → []
  it('handles only stop words')      // "add the to" → []
})

describe('selectFilesForTask', () => {
  it('returns empty array for empty task')
  it('returns scored files sorted descending by score')
  it('bm25 results have higher scores than import expansions')
  it('does not throw when search index missing — returns empty array with warning')
  it('symbol fallback triggers when bm25 returns < 3 results')
})
```

**Acceptance criteria:**
- All new tests pass
- All 143 existing tests still pass
- No test imports are broken

---

## Task 6 — Build verification & smoke test

**Parallel:** No — final gate  

```bash
# Build
npm run build

# Existing tests
npm test

# Smoke test 1 — basic task selection
node dist/bin/codebase-pilot.js pack --task "pack compress tokens" --dry-run

# Smoke test 2 — task + budget
node dist/bin/codebase-pilot.js pack --task "search index" --compress --budget 20000 --dry-run

# Smoke test 3 — unknown task (fallback)
node dist/bin/codebase-pilot.js pack --task "xyzunknownterm" --dry-run

# Smoke test 4 — no regression
node dist/bin/codebase-pilot.js pack --compress --dry-run
```

**Acceptance criteria:**
- Build clean (zero TypeScript errors)
- 143+ tests pass
- Smoke test 1 selects < 20 files from 126
- Smoke test 2 output shows `Task:` summary line
- Smoke test 3 shows warning and falls back to full pack
- Smoke test 4 output identical to pre-implementation

---

## Execution Order

```
Task 1 (task-selector.ts)     ← foundation
    │
    ├── Task 5 (tests)        ← parallel after Task 1
    │
    ▼
Task 2 (packer/index.ts)      ← wire task-selector into pack pipeline
    │
    ▼
Task 3 + Task 4               ← parallel (CLI layer, independent files)
    │
    ▼
Task 6 (build + smoke test)   ← final gate
```

---

## Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| SQLite BM25 scores scale varies — normalization wrong | Medium | Log raw scores in debug mode, verify with real query |
| Import graph too large — expansion too slow | Low | Already used in `--prune`, proven fast |
| Symbol regex misses patterns | Low | Fallback only triggers when BM25 < 3 results — low blast radius |
| `PackResult` interface change breaks existing tests | Low | Only adding optional fields — backwards compatible |

# Implementation Plan: Auto-Pack (`--auto` flag)

**Date:** 2026-04-10  
**Spec:** `docs/codebase-pilot/specs/2026-04-10-auto-pack-design.md`  
**Status:** Ready to execute  

---

## Overview

5 files touched. 1 new file created. Execution order is sequential with one parallel opportunity (Tasks 3+4). Estimated ~200 lines of new code.

```
Task 1  src/intelligence/git-signals.ts       (new — git signal extraction)
Task 2  src/intelligence/task-selector.ts     (refactor — extract shared graph expansion)
Task 3  src/packer/index.ts                   (wire --auto into pack pipeline)
Task 4  src/cli/pack.ts + bin/codebase-pilot  (CLI layer) ← parallel with Task 3
Task 5  tests/intelligence/git-signals.test.ts (tests)
Task 6  build + smoke tests                   (final gate)
```

---

## Task 1 — Create `src/intelligence/git-signals.ts`

**File:** `src/intelligence/git-signals.ts` (new)  
**Parallel:** No — foundation for Tasks 2+3  

### Interfaces

```typescript
export interface GitSignals {
  stagedFiles: string[];      // from git diff --cached --name-only
  unstagedFiles: string[];    // from git diff HEAD --name-only
  branchName: string;         // from git branch --show-current
  commitMessages: string[];   // from git log -5 --format=%s
  hasUsefulSignals: boolean;  // false when all signals are empty/generic
}
```

### Functions to implement

**`extractGitSignals(root: string): GitSignals`**

Use `spawnSync` (NOT execSync — no shell) for all git calls:

```typescript
import { spawnSync } from 'node:child_process';

function git(root: string, args: string[]): string {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) return '';
  return result.stdout ?? '';
}
```

Four calls:
1. `git(['diff', '--cached', '--name-only'])` → split on `\n`, filter empty → `stagedFiles`
2. `git(['diff', 'HEAD', '--name-only'])` → split on `\n`, filter empty → `unstagedFiles`  
   Note: `--cached` may overlap with `HEAD` diff — deduplicate with `Set`
3. `git(['branch', '--show-current'])` → trim → `branchName`
4. `git(['log', '-5', '--format=%s'])` → split on `\n`, filter empty → `commitMessages`

Wrap entire function in try/catch — if not a git repo, return all-empty `GitSignals` with `hasUsefulSignals: false`.

**`GENERIC_BRANCHES` constant:**
```typescript
const GENERIC_BRANCHES = new Set([
  'main', 'master', 'dev', 'develop', 'development',
  'staging', 'production', 'release', 'hotfix', 'HEAD', '',
]);
```

**`synthesizeQuery(signals: GitSignals): string`**

Combines branch name + commit messages into a BM25 vocabulary query:
- Tokenize branch name: split on `/`, `-`, `_` → filter stop words + generic branch tokens
- Tokenize each commit message: split on whitespace → filter stop words
- Deduplicate, join with ` OR `
- Returns empty string if no useful tokens found

Uses `tokenizeTask` from `task-selector.ts` (re-export it, or duplicate the 5-line function — prefer re-export).

**`inferTaskDescription(signals: GitSignals): string`**

Human-readable summary of what was inferred:
- Collect tokens from branch + commits (same as synthesizeQuery)
- Return as space-separated string, max 60 chars
- Example: `"auth middleware token validation"` from branch `fix/auth-middleware` + commit `"fix token validation bug"`
- If no vocabulary: return `"(no description — diff files only)"`

**`hasUsefulSignals` logic:**
```typescript
hasUsefulSignals =
  stagedFiles.length > 0 ||
  unstagedFiles.length > 0 ||
  (!GENERIC_BRANCHES.has(branchName) && branchName.length > 0) ||
  commitMessages.some(m => tokenizeTask(m).length > 0)
```

**Acceptance criteria:**
- `extractGitSignals(root)` returns staged + unstaged file paths from real git state
- `synthesizeQuery` returns empty string for branch=`main` + no commits
- `synthesizeQuery` returns `"stripe webhook payment"` for branch=`feat/stripe-webhook` + commit `"add payment processing"`
- Function does not throw in non-git directory — returns empty signals
- Uses `spawnSync` only (no `execSync`, no shell injection risk)

---

## Task 2 — Refactor `src/intelligence/task-selector.ts`

**File:** `src/intelligence/task-selector.ts` (modify)  
**Parallel:** No — depends on Task 1, provides foundation for Task 3  

### Change A — Extract shared graph expansion helper

The import graph expansion block (currently lines 87–145) is identical logic needed by both `selectFilesForTask` and the new `selectFilesForAuto`. Extract it:

```typescript
function expandWithImportGraph(
  root: string,
  seedMap: Map<string, { score: number; reason: 'bm25' | 'symbol' | 'diff' }>,
): ScoredFile[]
```

- Takes a pre-built seedMap
- Runs `buildImportGraph` + `getReverseDependencies`
- Applies hop-1 (×0.5), hop-2 (×0.25), centrality penalty
- Returns sorted ScoredFile[]
- `selectFilesForTask` refactored to call this internally (no behavior change)

### Change B — Add `selectFilesForAuto`

```typescript
export function selectFilesForAuto(
  root: string,
  diffFiles: string[],       // direct seeds — score=1.0, reason='diff'
  vocabularyQuery: string,   // BM25 query from branch+commits (may be empty)
): ScoredFile[]
```

Implementation:
1. Build seedMap from `diffFiles`: each file → `{ score: 1.0, reason: 'diff' }`
   - Filter out files that don't exist in the collected file list (deleted files)
2. If `vocabularyQuery` is non-empty: run `createSearchIndex(root).search(vocabularyQuery, 20)`, normalize scores to 0.7 max, add to seedMap (don't overwrite diff seeds)
3. Call `expandWithImportGraph(root, seedMap)` → return results

### Change C — Update `ScoredFile.reason` type

```typescript
// Before
reason: 'bm25' | 'symbol' | 'import'

// After  
reason: 'bm25' | 'symbol' | 'import' | 'diff'
```

**Acceptance criteria:**
- `selectFilesForTask` behavior unchanged (all 12 existing tests still pass)
- `selectFilesForAuto(root, ['src/cli/pack.ts'], 'compress tokens')` returns `src/cli/pack.ts` with score=1.0 and reason=`'diff'`
- `selectFilesForAuto(root, [], '')` returns empty array
- `selectFilesForAuto(root, ['nonexistent.ts'], '')` skips nonexistent file gracefully

---

## Task 3 — Update `src/packer/index.ts`

**File:** `src/packer/index.ts` (modify)  
**Parallel:** Can run alongside Task 4  

### Change A — Add to `PackOptions`

```typescript
export interface PackOptions {
  // ... existing fields ...
  auto?: boolean;  // If true, infer task from git signals
}
```

### Change B — Add to `PackResult`

```typescript
export interface PackResult {
  // ... existing fields ...
  autoDescription?: string;   // human-readable inferred task
  autoSignalSummary?: string; // e.g. "2 staged, 1 unstaged, branch 'fix/auth'"
  autoChangedCount?: number;  // files from diff
  autoRelatedCount?: number;  // files from BM25 + imports
}
```

### Change C — Add import

```typescript
import { extractGitSignals, synthesizeQuery, inferTaskDescription } from '../intelligence/git-signals.js';
import { selectFilesForAuto } from '../intelligence/task-selector.js';
```

### Change D — Add `--auto` + `--task` mutual exclusion check

At the top of `packProject()`, before any file collection:
```typescript
if (options.auto && options.task) {
  throw new Error('Use either --auto or --task, not both.');
}
```

### Change E — Add auto selection block

Insert after the `--task` block, before security scan:

```typescript
if (options.auto) {
  const signals = extractGitSignals(root);
  if (!signals.hasUsefulSignals) {
    console.log('  Auto-detect: no task signals found');
    if (GENERIC_BRANCHES.has(signals.branchName)) {
      console.log(`    — branch "${signals.branchName}" is too generic`);
    }
    if (signals.stagedFiles.length === 0 && signals.unstagedFiles.length === 0) {
      console.log('    — working tree is clean');
    }
    console.log('  Falling back to full pack. Use --task to describe your work manually.');
    console.log('');
    // no filtering — proceed with all files
  } else {
    const diffFiles = [...new Set([...signals.stagedFiles, ...signals.unstagedFiles])];
    const vocabQuery = synthesizeQuery(signals);
    const selected = selectFilesForAuto(root, diffFiles, vocabQuery);
    if (selected.length > 0) {
      const selectedSet = new Set(selected.map(f => f.relativePath));
      files = files.filter(f => selectedSet.has(f.relativePath));
      // Store metadata for PackResult
      autoDescription = inferTaskDescription(signals);
      autoSignalSummary = buildSignalSummary(signals);
      autoChangedCount = selected.filter(f => f.reason === 'diff').length;
      autoRelatedCount = selected.filter(f => f.reason !== 'diff').length;
      autoScores = selected;
    }
  }
}
```

Helper `buildSignalSummary(signals)`:
```
"2 staged, 1 unstaged, branch 'fix/auth-middleware', 3 commits"
```

### Change F — Include in return value

```typescript
return {
  // ... existing fields ...
  autoDescription: autoDescription || undefined,
  autoSignalSummary: autoSignalSummary || undefined,
  autoChangedCount: autoChangedCount || undefined,
  autoRelatedCount: autoRelatedCount || undefined,
  taskScores: autoScores ?? taskScores,
};
```

**Acceptance criteria:**
- `packProject({ auto: true, task: 'x', ... })` throws usage error
- `packProject({ auto: true, ... })` on this repo selects files from current diff
- `packProject({ auto: false, ... })` behavior identical to pre-implementation

---

## Task 4 — Update CLI layer (parallel with Task 3)

**Files:** `src/cli/pack.ts` + `src/bin/codebase-pilot.ts`  
**Parallel:** Yes — independent of Task 3 changes  

### `src/cli/pack.ts`

**A) Add to `PackCommandOptions`:**
```typescript
auto?: boolean;
```

**B) Mutual exclusion check** (before packProject call):
```typescript
if (options.auto && options.task) {
  console.error('  Error: Use either --auto or --task, not both.');
  process.exitCode = 1;
  return;
}
```

**C) Pass `auto` to packProject:**
```typescript
const result = packProject({
  // ... existing ...
  auto: options.auto,
});
```

**D) Print auto-detection summary** (insert after task summary block):
```typescript
if (options.auto && result.autoDescription !== undefined) {
  console.log(`  Auto-detected: "${result.autoDescription}"`);
  if (result.autoSignalSummary) {
    console.log(`  Signals:  ${result.autoSignalSummary}`);
  }
  const changed = result.autoChangedCount ?? 0;
  const related = result.autoRelatedCount ?? 0;
  console.log(`  Changed:  ${changed} file${changed !== 1 ? 's' : ''}  (direct diff)`);
  console.log(`  Related:  ${related} file${related !== 1 ? 's' : ''}  (BM25 + imports)`);
  console.log(`  Total:    ${changed + related} files selected from ${result.totalFileCount ?? 0}`);
  console.log('');
}
```

**E) In `--dry-run`, show signal source in file list** (extend existing taskScores display):
```typescript
// reason label: 'diff' → '(diff)', 'bm25' → '(BM25)', 'import' → '(import)'
const reasonLabel = f.reason === 'diff'
  ? '  \x1b[32m(diff)\x1b[0m'
  : f.reason === 'import'
  ? '  \x1b[90m(import)\x1b[0m'
  : '  \x1b[36m(BM25)\x1b[0m';
```

### `src/bin/codebase-pilot.ts`

Add one option after `--task`:
```typescript
.option('--auto', 'Infer task from git diff, branch name, and recent commits', false)
```

**Acceptance criteria:**
- `codebase-pilot pack --auto --task "x"` prints error and exits non-zero
- `codebase-pilot pack --auto --dry-run` shows `Auto-detected:` line
- `codebase-pilot pack --help` shows `--auto` in options list
- `codebase-pilot pack` (no flags) output unchanged

---

## Task 5 — Tests: `tests/intelligence/git-signals.test.ts`

**File:** `tests/intelligence/git-signals.test.ts` (new)  
**Parallel:** Can start after Task 1  

### Mock strategy

Mock `spawnSync` from `node:child_process`:

```typescript
vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(),
}));
```

### Test cases

```typescript
describe('extractGitSignals', () => {
  it('returns staged files from git diff --cached')
  it('returns unstaged files from git diff HEAD')
  it('deduplicates files appearing in both staged and unstaged')
  it('returns empty signals when git spawnSync fails')
  it('returns empty signals in non-git directory')
  it('sets hasUsefulSignals=false for clean tree + generic branch')
  it('sets hasUsefulSignals=true when staged files exist')
})

describe('synthesizeQuery', () => {
  it('tokenizes branch name fix/auth-middleware-bug → ["auth","middleware","bug"]')
  it('returns empty string for generic branch "main" + no commits')
  it('combines branch + commit tokens, deduplicates')
  it('filters stop words from commit messages')
  it('handles branch name with ticket number JIRA-1234 → skips short numeric tokens')
})

describe('inferTaskDescription', () => {
  it('returns readable description from branch + commit tokens')
  it('returns fallback message when no vocabulary available')
  it('caps output at 60 chars')
})
```

**Acceptance criteria:**
- All new tests pass
- All 155 existing tests still pass
- No test imports broken

---

## Task 6 — Build verification & smoke tests

**Parallel:** No — final gate  

```bash
# Build
npm run build

# All tests
npm test

# Smoke 1 — auto on this repo (has changes in working tree)
node dist/bin/codebase-pilot.js pack --auto --dry-run

# Smoke 2 — auto + compress + budget
node dist/bin/codebase-pilot.js pack --auto --compress --budget 20000 --dry-run

# Smoke 3 — mutual exclusion error
node dist/bin/codebase-pilot.js pack --auto --task "webhook" --dry-run

# Smoke 4 — no regression
node dist/bin/codebase-pilot.js pack --compress --dry-run

# Smoke 5 — help shows --auto
node dist/bin/codebase-pilot.js pack --help | grep auto
```

**Acceptance criteria:**
- Build clean
- 155+ tests pass
- Smoke 1 shows `Auto-detected:` line with file count < 130
- Smoke 2 shows `Budget:` + `Auto-detected:` lines
- Smoke 3 exits non-zero with clear error message
- Smoke 4 output identical to pre-implementation
- Smoke 5 shows `--auto` description

---

## Execution Order

```
Task 1  git-signals.ts          ← new file, no deps
    │
    ├── Task 5  tests           ← parallel after Task 1
    │
    ▼
Task 2  task-selector.ts        ← refactor + selectFilesForAuto
    │
    ▼
Task 3 + Task 4                 ← parallel (packer vs CLI layer)
    │
    ▼
Task 6  build + smoke           ← final gate
```

---

## Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `git diff HEAD` and `git diff --cached` overlap on staged files | High | Deduplicate with `Set` before building seed list |
| Branch name contains only stop words or numbers | Medium | `synthesizeQuery` returns empty string → vocabulary query skipped, diff seeds only |
| Deleted files appear in diff — `collectFiles` won't find them | Medium | `selectFilesForAuto` filters diff paths against collected file list |
| Detached HEAD → `git branch --show-current` returns empty | Low | Empty string in `GENERIC_BRANCHES` set → skip branch signal |
| `spawnSync` security hook triggers | Low | Already using `spawnSync` in `tokens.ts` — same pattern approved |

import { createSearchIndex } from './search.js';
import { buildImportGraph, getReverseDependencies } from './imports.js';
import { collectFiles } from '../packer/collector.js';

export interface ScoredFile {
  relativePath: string;
  score: number;
  reason: 'bm25' | 'symbol' | 'import' | 'diff';
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'to', 'for', 'in', 'of', 'and', 'or',
  'add', 'fix', 'update', 'create', 'delete', 'remove',
  'get', 'set', 'use', 'make', 'with', 'from', 'into',
  'by', 'as', 'at', 'on', 'is', 'be', 'do', 'new', 'my',
  'this', 'that', 'it', 'its', 'i', 'we', 'need', 'want',
]);

export function tokenizeTask(task: string): string[] {
  return task
    .toLowerCase()
    .split(/[\s\W]+/)
    .filter(t => t.length >= 2 && !STOP_WORDS.has(t));
}

const HIGH_CENTRALITY_THRESHOLD = 20;
const PENALTY_MULTIPLIER = 0.1;
const MIN_RESULT_SET_FOR_PENALTY = 5;
const SYMBOL_FALLBACK_SCORE = 0.6;
const SYMBOL_PATTERN = /export\s+(?:async\s+)?(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)/g;

function extractSymbols(content: string): string[] {
  const symbols: string[] = [];
  for (const m of content.matchAll(SYMBOL_PATTERN)) {
    if (m[1]) symbols.push(m[1].toLowerCase());
  }
  return symbols;
}

export function selectFilesForTask(root: string, task: string): ScoredFile[] {
  const tokens = tokenizeTask(task);
  if (tokens.length === 0) return [];

  // Stage 1 — BM25 search
  const seedMap = new Map<string, { score: number; reason: 'bm25' | 'symbol' }>();
  let bm25Count = 0;

  try {
    const index = createSearchIndex(root);
    const query = tokens.join(' OR ');
    const results = index.search(query, 20);
    index.close();

    // SQLite FTS5 BM25 scores are negative — normalize to 0–1
    const rawScores = results.map(r => Math.abs(r.score));
    const maxRaw = Math.max(...rawScores, 1);

    for (const r of results) {
      const normalized = Math.abs(r.score) / maxRaw;
      seedMap.set(r.path, { score: normalized, reason: 'bm25' });
      bm25Count++;
    }
  } catch {
    // Search index unavailable — fall through to symbol fallback
  }

  // Stage 2 — Symbol fallback (triggered when BM25 < 3 results)
  if (bm25Count < 3) {
    try {
      const files = collectFiles(root, {});
      for (const file of files) {
        if (seedMap.has(file.relativePath)) continue;
        const symbols = extractSymbols(file.content);
        const matched = symbols.some(sym =>
          tokens.some(t => sym.includes(t) || t.includes(sym))
        );
        if (matched) {
          seedMap.set(file.relativePath, { score: SYMBOL_FALLBACK_SCORE, reason: 'symbol' });
        }
      }
    } catch { /* ignore — best effort */ }
  }

  if (seedMap.size === 0) return [];

  return expandWithImportGraph(root, seedMap);
}

// Shared graph expansion — used by both selectFilesForTask and selectFilesForAuto
function expandWithImportGraph(
  root: string,
  seedMap: Map<string, { score: number; reason: ScoredFile['reason'] }>,
): ScoredFile[] {
  const resultMap = new Map<string, ScoredFile>();

  for (const [path, { score, reason }] of seedMap) {
    resultMap.set(path, { relativePath: path, score, reason });
  }

  let graph: Map<string, Set<string>>;
  let reverseGraph: Map<string, Set<string>>;
  try {
    graph = buildImportGraph(root);
    reverseGraph = getReverseDependencies(graph);
  } catch {
    return [...resultMap.values()].sort((a, b) => b.score - a.score);
  }

  const centralityOf = (p: string) => reverseGraph.get(p)?.size ?? 0;

  for (const [seedPath, { score: seedScore }] of seedMap) {
    const hop1Imports = graph.get(seedPath);
    if (!hop1Imports) continue;

    for (const hop1 of hop1Imports) {
      const hop1Score = seedScore * 0.5;
      const existing = resultMap.get(hop1);
      if (!existing || existing.score < hop1Score) {
        resultMap.set(hop1, { relativePath: hop1, score: hop1Score, reason: 'import' });
      }

      const hop2Imports = graph.get(hop1);
      if (!hop2Imports) continue;
      for (const hop2 of hop2Imports) {
        const hop2Score = seedScore * 0.25;
        const existing2 = resultMap.get(hop2);
        if (!existing2 || existing2.score < hop2Score) {
          resultMap.set(hop2, { relativePath: hop2, score: hop2Score, reason: 'import' });
        }
      }
    }
  }

  const allResults = [...resultMap.values()];
  const nonSeedCount = allResults.filter(f => !seedMap.has(f.relativePath)).length;
  const applyPenalty = nonSeedCount >= MIN_RESULT_SET_FOR_PENALTY;

  const final: ScoredFile[] = [];
  for (const f of allResults) {
    if (seedMap.has(f.relativePath)) {
      final.push(f);
    } else {
      const centrality = centralityOf(f.relativePath);
      const penalized = applyPenalty && centrality > HIGH_CENTRALITY_THRESHOLD;
      final.push({ ...f, score: penalized ? f.score * PENALTY_MULTIPLIER : f.score });
    }
  }

  return final
    .filter(f => f.score > 0.05)
    .sort((a, b) => b.score - a.score);
}

export function selectFilesForAuto(
  root: string,
  diffFiles: string[],
  vocabularyQuery: string,
): ScoredFile[] {
  if (diffFiles.length === 0 && vocabularyQuery.trim().length === 0) return [];

  // Collect existing file paths to filter out deleted files
  let existingPaths: Set<string>;
  try {
    const files = collectFiles(root, {});
    existingPaths = new Set(files.map(f => f.relativePath));
  } catch {
    existingPaths = new Set();
  }

  const seedMap = new Map<string, { score: number; reason: ScoredFile['reason'] }>();

  // Diff files are guaranteed seeds at score=1.0
  for (const f of diffFiles) {
    if (existingPaths.size === 0 || existingPaths.has(f)) {
      seedMap.set(f, { score: 1.0, reason: 'diff' });
    }
  }

  // Vocabulary → BM25 seeds at score=0.7
  if (vocabularyQuery.trim().length > 0) {
    try {
      const index = createSearchIndex(root);
      const results = index.search(vocabularyQuery, 20);
      index.close();

      const rawScores = results.map(r => Math.abs(r.score));
      const maxRaw = Math.max(...rawScores, 1);

      for (const r of results) {
        if (!seedMap.has(r.path)) {
          const normalized = (Math.abs(r.score) / maxRaw) * 0.7;
          seedMap.set(r.path, { score: normalized, reason: 'bm25' });
        }
      }
    } catch { /* search index unavailable — diff seeds only */ }
  }

  if (seedMap.size === 0) return [];

  return expandWithImportGraph(root, seedMap);
}

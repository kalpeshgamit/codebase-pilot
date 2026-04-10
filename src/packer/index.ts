import { basename } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { collectFiles } from './collector.js';
import type { CollectedFile } from './collector.js';
import { countTokens } from './token-counter.js';
import { formatXml } from './formatter-xml.js';
import { formatMarkdown } from './formatter-md.js';
import { scanForSecrets, isEnvFile } from '../security/scanner.js';
import { compressCode } from '../compress/regex-compress.js';
import { buildImportGraph, getReverseDependencies } from '../intelligence/imports.js';
import { selectFilesForTask, selectFilesForAuto } from '../intelligence/task-selector.js';
import type { ScoredFile } from '../intelligence/task-selector.js';
import { extractGitSignals, synthesizeQuery, inferTaskDescription, buildSignalSummary, GENERIC_BRANCHES } from '../intelligence/git-signals.js';
import type { AgentsConfig } from '../types.js';

export interface PackOptions {
  dir: string;
  format: 'xml' | 'md';
  compress: boolean;
  agent?: string;
  noSecurity: boolean;
  affectedOnly?: string[];  // If set, only pack these relative paths
  pruneTarget?: string;     // If set, only pack files reachable from this file
  budget?: number;          // If set, cap total tokens at this limit (prioritize by centrality)
  task?: string;            // If set, select only files relevant to this task description
  auto?: boolean;           // If set, infer task from git diff, branch name, and commits
}

export interface PackResult {
  output: string;
  fileCount: number;
  totalTokens: number;
  rawTokens: number;
  skippedFiles: Array<{ file: string; reason: string }>;
  compressionRatio?: number;
  taskBm25Count?: number;
  taskImportCount?: number;
  totalFileCount?: number;
  taskScores?: ScoredFile[];
  autoDescription?: string;
  autoSignalSummary?: string;
  autoChangedCount?: number;
  autoRelatedCount?: number;
}

export function packProject(options: PackOptions): PackResult {
  if (options.auto && options.task) {
    throw new Error('Use either --auto or --task, not both.');
  }

  const root = options.dir;
  const projectName = basename(root);
  const skippedFiles: Array<{ file: string; reason: string }> = [];

  // Resolve agent context paths if specified
  let agentContextPaths: string[] | undefined;
  let agentName: string | undefined;
  if (options.agent) {
    agentName = options.agent;
    agentContextPaths = resolveAgentPaths(root, options.agent) ?? undefined;
    if (!agentContextPaths) {
      throw new Error(`Agent "${options.agent}" not found in .codebase-pilot/agents.json`);
    }
  }

  // Collect files
  let files = collectFiles(root, { agentContextPaths });

  // --affected: filter to only changed files
  if (options.affectedOnly) {
    const affectedSet = new Set(options.affectedOnly);
    files = files.filter(f => affectedSet.has(f.relativePath));
  }

  // --prune: filter to files reachable from target via import graph
  if (options.pruneTarget) {
    const graph = buildImportGraph(root);
    const reverseGraph = getReverseDependencies(graph);
    const reachable = new Set<string>();
    reachable.add(options.pruneTarget);

    // Collect imports (what the target depends on) — recursive
    function collectImports(file: string) {
      const deps = graph.get(file);
      if (!deps) return;
      for (const dep of deps) {
        if (!reachable.has(dep)) { reachable.add(dep); collectImports(dep); }
      }
    }
    collectImports(options.pruneTarget);

    // Collect reverse deps (what depends on the target) — recursive
    function collectDependents(file: string) {
      const deps = reverseGraph.get(file);
      if (!deps) return;
      for (const dep of deps) {
        if (!reachable.has(dep)) { reachable.add(dep); collectDependents(dep); }
      }
    }
    collectDependents(options.pruneTarget);

    files = files.filter(f => reachable.has(f.relativePath));
  }

  // --task: select only files relevant to the task description
  const totalFileCount = files.length;
  let taskScores: ScoredFile[] | undefined;
  let taskBm25Count = 0;
  let taskImportCount = 0;

  if (options.task && options.task.trim().length > 0) {
    try {
      const selected = selectFilesForTask(root, options.task);
      if (selected.length === 0) {
        console.log(`  Warning: no files matched task "${options.task}" — packing all files`);
      } else {
        taskScores = selected;
        const selectedSet = new Set(selected.map(f => f.relativePath));
        files = files.filter(f => selectedSet.has(f.relativePath));
        taskBm25Count = selected.filter(f => f.reason === 'bm25' || f.reason === 'symbol').length;
        taskImportCount = selected.filter(f => f.reason === 'import').length;
      }
    } catch (err) {
      console.log(`  Warning: task selection failed (${(err as Error).message}) — packing all files`);
    }
  }

  // --auto: infer task from git signals
  let autoDescription: string | undefined;
  let autoSignalSummary: string | undefined;
  let autoChangedCount: number | undefined;
  let autoRelatedCount: number | undefined;
  let autoScores: ScoredFile[] | undefined;

  if (options.auto) {
    const signals = extractGitSignals(root);
    if (!signals.hasUsefulSignals) {
      const reasons: string[] = [];
      if (GENERIC_BRANCHES.has(signals.branchName)) {
        reasons.push(`branch "${signals.branchName || 'unknown'}" is too generic`);
      }
      if (signals.stagedFiles.length === 0 && signals.unstagedFiles.length === 0) {
        reasons.push('working tree is clean');
      }
      console.log('  Auto-detect: no task signals found');
      for (const r of reasons) console.log(`    — ${r}`);
      console.log('  Falling back to full pack. Use --task to describe your work manually.');
      console.log('');
    } else {
      const diffFiles = [...new Set([...signals.stagedFiles, ...signals.unstagedFiles])];
      const vocabQuery = synthesizeQuery(signals);
      const selected = selectFilesForAuto(root, diffFiles, vocabQuery);
      if (selected.length > 0) {
        const selectedSet = new Set(selected.map(f => f.relativePath));
        files = files.filter(f => selectedSet.has(f.relativePath));
        autoDescription = inferTaskDescription(signals);
        autoSignalSummary = buildSignalSummary(signals);
        autoChangedCount = selected.filter(f => f.reason === 'diff').length;
        autoRelatedCount = selected.filter(f => f.reason !== 'diff').length;
        autoScores = selected;
      }
    }
  }

  // --budget: cap total tokens, prioritize files by import graph centrality
  if (options.budget && options.budget > 0) {
    const graph = buildImportGraph(root);
    // Score = number of reverse dependencies (how many files import this one)
    const reverseGraph = getReverseDependencies(graph);
    const scored = files.map(f => ({
      ...f,
      score: (reverseGraph.get(f.relativePath)?.size ?? 0) * 1000 + (1 / (f.tokens + 1)),
    }));
    scored.sort((a, b) => b.score - a.score);

    let budget = options.budget;
    const withinBudget: typeof scored = [];
    for (const f of scored) {
      if (f.tokens <= budget) {
        withinBudget.push(f);
        budget -= f.tokens;
      }
    }
    files = withinBudget;
  }

  // Security scan
  if (!options.noSecurity) {
    files = files.filter(file => {
      if (isEnvFile(file.relativePath)) {
        skippedFiles.push({ file: file.relativePath, reason: 'dotenv file' });
        return false;
      }
      const secrets = scanForSecrets(file.content, file.relativePath);
      if (secrets.length > 0) {
        const detail = secrets.map(s => `${s.pattern} (line ${s.line})`).join(', ');
        skippedFiles.push({ file: file.relativePath, reason: detail });
        return false;
      }
      return true;
    });
  }

  // Compression
  let originalTokens = files.reduce((sum, f) => sum + f.tokens, 0);
  if (options.compress) {
    files = files.map(file => {
      if (file.language) {
        const compressed = compressCode(file.content, file.language);
        return {
          ...file,
          content: compressed,
          tokens: countTokens(compressed),
        };
      }
      return file;
    });
  }

  const totalTokens = files.reduce((sum, f) => sum + f.tokens, 0);

  // Format output
  const output = options.format === 'xml'
    ? formatXml(projectName, files, agentName)
    : formatMarkdown(projectName, files, agentName);

  return {
    output,
    fileCount: files.length,
    totalTokens,
    rawTokens: originalTokens,
    skippedFiles,
    compressionRatio: options.compress
      ? Math.round((1 - totalTokens / originalTokens) * 100)
      : undefined,
    taskBm25Count: taskBm25Count || undefined,
    taskImportCount: taskImportCount || undefined,
    totalFileCount: (options.task || options.auto) ? totalFileCount : undefined,
    taskScores: autoScores ?? taskScores,
    autoDescription,
    autoSignalSummary,
    autoChangedCount,
    autoRelatedCount,
  };
}

function resolveAgentPaths(root: string, agentName: string): string[] | null {
  const agentsPath = join(root, '.codebase-pilot', 'agents.json');
  if (!existsSync(agentsPath)) return null;

  try {
    const config: AgentsConfig = JSON.parse(readFileSync(agentsPath, 'utf8'));
    const agent = config.agents[agentName];
    if (!agent) return null;

    return agent.context.filter(
      p => p !== 'ALL agent outputs' && p !== 'Agent execution logs',
    );
  } catch {
    return null;
  }
}

export { collectFiles } from './collector.js';
export { countTokens, formatTokenCount } from './token-counter.js';
export { formatXml } from './formatter-xml.js';
export { formatMarkdown } from './formatter-md.js';

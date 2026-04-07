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
import type { AgentsConfig } from '../types.js';

export interface PackOptions {
  dir: string;
  format: 'xml' | 'md';
  compress: boolean;
  agent?: string;
  noSecurity: boolean;
  affectedOnly?: string[];  // If set, only pack these relative paths
  pruneTarget?: string;     // If set, only pack files reachable from this file
}

export interface PackResult {
  output: string;
  fileCount: number;
  totalTokens: number;
  rawTokens: number;
  skippedFiles: Array<{ file: string; reason: string }>;
  compressionRatio?: number;
}

export function packProject(options: PackOptions): PackResult {
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

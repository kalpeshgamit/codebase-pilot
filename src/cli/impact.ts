import { resolve, relative } from 'node:path';
import { buildImportGraph, computeBlastRadius, getReverseDependencies } from '../intelligence/imports.js';

interface ImpactOptions {
  dir: string;
  file?: string;
}

export async function impactCommand(options: ImpactOptions): Promise<void> {
  const root = resolve(options.dir);

  console.log('');

  if (options.file) {
    // Single file blast radius
    const relPath = relative(root, resolve(options.file));
    console.log(`  Blast radius for: ${relPath}`);
    console.log('');

    const graph = buildImportGraph(root);
    const result = computeBlastRadius(root, relPath, graph);

    const riskColors: Record<string, string> = {
      low: '\x1b[32m',      // green
      medium: '\x1b[33m',   // yellow
      high: '\x1b[31m',     // red
      critical: '\x1b[35m', // magenta
    };
    const reset = '\x1b[0m';
    const color = riskColors[result.riskLevel] || '';

    console.log(`  Risk: ${color}${result.riskLevel.toUpperCase()} (${result.riskScore}/100)${reset}`);
    console.log('');

    if (result.directDependents.length > 0) {
      console.log(`  Direct dependents (${result.directDependents.length}):`);
      for (const dep of result.directDependents) {
        console.log(`    ${dep}`);
      }
      console.log('');
    }

    if (result.transitiveDependents.length > result.directDependents.length) {
      const transitive = result.transitiveDependents.filter(
        f => !result.directDependents.includes(f),
      );
      console.log(`  Transitive dependents (+${transitive.length}):`);
      for (const dep of transitive) {
        console.log(`    ${dep}`);
      }
      console.log('');
    }

    if (result.affectedTests.length > 0) {
      console.log(`  Affected tests (${result.affectedTests.length}):`);
      for (const test of result.affectedTests) {
        console.log(`    ${test}`);
      }
    } else {
      console.log('  Affected tests: none (no test coverage detected)');
    }

    console.log('');
    console.log(`  Total affected: ${result.transitiveDependents.length} files`);
    console.log('');
    return;
  }

  // No file specified — show project-wide import graph summary
  console.log('  Building import graph...');
  const graph = buildImportGraph(root);
  const reverseGraph = getReverseDependencies(graph);

  console.log(`  Files with imports: ${graph.size}`);
  console.log('');

  // Find most-imported files (highest dependents)
  const depCounts: Array<{ file: string; count: number }> = [];
  for (const [file, deps] of reverseGraph) {
    depCounts.push({ file, count: deps.size });
  }
  depCounts.sort((a, b) => b.count - a.count);

  const top = depCounts.slice(0, 15);
  if (top.length > 0) {
    console.log('  Most-imported files (highest blast radius):');
    console.log('');
    const maxPath = Math.min(45, Math.max(...top.map(f => f.file.length)));
    for (const { file, count } of top) {
      const bar = '\u2588'.repeat(Math.min(count * 2, 20));
      console.log(`    ${file.padEnd(maxPath)}  ${String(count).padStart(3)} deps  ${bar}`);
    }
    console.log('');
  }

  // Find files with no dependents (leaf nodes — safe to change)
  const leafFiles = [...graph.keys()].filter(f => !reverseGraph.has(f));
  console.log(`  Leaf files (safe to change, no dependents): ${leafFiles.length}`);

  // Find orphan files (no imports, no dependents)
  const orphans = [...graph.keys()].filter(
    f => (graph.get(f)?.size ?? 0) === 0 && !reverseGraph.has(f),
  );
  if (orphans.length > 0) {
    console.log(`  Orphan files (no imports, no dependents): ${orphans.length}`);
  }

  console.log('');
  console.log('  Usage: codebase-pilot impact --file <path>');
  console.log('');
}

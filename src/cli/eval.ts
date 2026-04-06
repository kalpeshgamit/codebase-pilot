import { resolve, basename } from 'node:path';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { detect } from '../scanner/detector.js';
import { packProject } from '../packer/index.js';
import { collectFiles } from '../packer/collector.js';
import { formatTokenCount } from '../packer/token-counter.js';
import { buildImportGraph, getReverseDependencies } from '../intelligence/imports.js';

interface EvalOptions {
  dir: string;
}

interface BenchmarkResult {
  project: string;
  files: number;
  languages: string[];
  framework: string | null;
  rawTokens: number;
  compressedTokens: number;
  compressionRatio: number;
  agentCount: number;
  importEdges: number;
  mostConnectedFile: string | null;
  maxDependents: number;
  scanTimeMs: number;
  packTimeMs: number;
  graphTimeMs: number;
}

export async function evalCommand(options: EvalOptions): Promise<void> {
  const root = resolve(options.dir);

  console.log('');
  console.log('  codebase-pilot eval');
  console.log('  ===================');
  console.log('');

  // Check if directory has subdirectories (multi-repo eval) or is a single project
  const subdirs = readdirSync(root)
    .filter(d => !d.startsWith('.') && d !== 'node_modules')
    .map(d => resolve(root, d))
    .filter(d => existsSync(d) && statSync(d).isDirectory());

  // Try evaluating as single project first
  const hasPackageJson = existsSync(resolve(root, 'package.json')) ||
    existsSync(resolve(root, 'pyproject.toml')) ||
    existsSync(resolve(root, 'go.mod')) ||
    existsSync(resolve(root, 'Cargo.toml'));

  const targets = hasPackageJson ? [root] : subdirs.filter(d =>
    existsSync(resolve(d, 'package.json')) ||
    existsSync(resolve(d, 'pyproject.toml')) ||
    existsSync(resolve(d, 'go.mod')) ||
    existsSync(resolve(d, 'Cargo.toml'))
  );

  if (targets.length === 0) {
    console.log('  No projects found to evaluate.');
    console.log('  Point to a project directory or a directory containing multiple projects.');
    console.log('');
    return;
  }

  console.log(`  Evaluating ${targets.length} project${targets.length !== 1 ? 's' : ''}...`);
  console.log('');

  const results: BenchmarkResult[] = [];

  for (const target of targets) {
    const name = basename(target);
    process.stdout.write(`  [${results.length + 1}/${targets.length}] ${name}...`);

    try {
      const result = await benchmarkProject(target, name);
      results.push(result);
      console.log(` done (${result.scanTimeMs + result.packTimeMs + result.graphTimeMs}ms)`);
    } catch (err) {
      console.log(` error: ${(err as Error).message}`);
    }
  }

  console.log('');
  printResults(results);
}

async function benchmarkProject(root: string, name: string): Promise<BenchmarkResult> {
  // 1. Scan
  const scanStart = Date.now();
  const scan = await detect(root);
  const scanTimeMs = Date.now() - scanStart;

  // 2. Collect + pack
  const packStart = Date.now();
  const files = collectFiles(root, {});
  const rawTokens = files.reduce((sum, f) => sum + f.tokens, 0);

  let compressedTokens = rawTokens;
  let compressionRatio = 0;
  try {
    const packed = packProject({
      dir: root,
      format: 'xml',
      compress: true,
      noSecurity: true,
    });
    compressedTokens = packed.totalTokens;
    compressionRatio = packed.compressionRatio ?? 0;
  } catch { /* pack may fail on some projects */ }
  const packTimeMs = Date.now() - packStart;

  // 3. Import graph
  const graphStart = Date.now();
  const graph = buildImportGraph(root);
  const reverseGraph = getReverseDependencies(graph);

  let importEdges = 0;
  for (const deps of graph.values()) importEdges += deps.size;

  let mostConnectedFile: string | null = null;
  let maxDependents = 0;
  for (const [file, deps] of reverseGraph) {
    if (deps.size > maxDependents) {
      maxDependents = deps.size;
      mostConnectedFile = file;
    }
  }
  const graphTimeMs = Date.now() - graphStart;

  // 4. Agent count
  const agentCount = Object.keys(
    (scan as any)?.agents ?? {},
  ).length || scan.packages.length + 3; // estimate

  return {
    project: name,
    files: files.length,
    languages: scan.languages.map(l => l.name),
    framework: scan.framework,
    rawTokens,
    compressedTokens,
    compressionRatio,
    agentCount,
    importEdges,
    mostConnectedFile,
    maxDependents,
    scanTimeMs,
    packTimeMs,
    graphTimeMs,
  };
}

function printResults(results: BenchmarkResult[]): void {
  if (results.length === 0) return;

  console.log('  Results');
  console.log('  -------');
  console.log('');

  // Table header
  const cols = {
    project: Math.max(10, ...results.map(r => r.project.length)),
  };

  console.log(
    `  ${'Project'.padEnd(cols.project)}  Files  Raw tokens  Compressed  Ratio  Edges  Time`,
  );
  console.log(
    `  ${'-'.repeat(cols.project)}  -----  ----------  ----------  -----  -----  ----`,
  );

  for (const r of results) {
    const totalMs = r.scanTimeMs + r.packTimeMs + r.graphTimeMs;
    console.log(
      `  ${r.project.padEnd(cols.project)}  ${String(r.files).padStart(5)}  ${formatTokenCount(r.rawTokens).padStart(10)}  ${formatTokenCount(r.compressedTokens).padStart(10)}  ${(r.compressionRatio + '%').padStart(5)}  ${String(r.importEdges).padStart(5)}  ${totalMs}ms`,
    );
  }

  console.log('');

  // Summary
  if (results.length > 1) {
    const totalRaw = results.reduce((s, r) => s + r.rawTokens, 0);
    const totalCompressed = results.reduce((s, r) => s + r.compressedTokens, 0);
    const avgRatio = Math.round((1 - totalCompressed / totalRaw) * 100);

    console.log(`  Summary:`);
    console.log(`    Projects:            ${results.length}`);
    console.log(`    Total raw tokens:    ${formatTokenCount(totalRaw)}`);
    console.log(`    Total compressed:    ${formatTokenCount(totalCompressed)}`);
    console.log(`    Average compression: ${avgRatio}%`);
    console.log('');
  }

  // Per-project details
  for (const r of results) {
    console.log(`  ${r.project}:`);
    console.log(`    Languages:  ${r.languages.join(', ')}`);
    if (r.framework) console.log(`    Framework:  ${r.framework}`);
    if (r.mostConnectedFile) {
      console.log(`    Hub file:   ${r.mostConnectedFile} (${r.maxDependents} dependents)`);
    }
    console.log(`    Timing:     scan=${r.scanTimeMs}ms pack=${r.packTimeMs}ms graph=${r.graphTimeMs}ms`);
    console.log('');
  }
}

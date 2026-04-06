import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve, extname } from 'node:path';
import { collectFiles } from '../packer/collector.js';

export interface ImportEdge {
  from: string;   // relative path of importing file
  to: string;     // relative path of imported file
}

export interface BlastRadius {
  changedFile: string;
  directDependents: string[];   // files that import the changed file
  transitiveDependents: string[]; // all files affected (recursive)
  affectedTests: string[];      // test files in the blast radius
  riskScore: number;            // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

const IMPORT_PATTERNS: Record<string, RegExp[]> = {
  typescript: [
    /import\s+.*?from\s+['"](\.[\w./\\-]+)['"]/g,
    /import\s*\(\s*['"](\.[\w./\\-]+)['"]\s*\)/g,
    /require\s*\(\s*['"](\.[\w./\\-]+)['"]\s*\)/g,
  ],
  javascript: [
    /import\s+.*?from\s+['"](\.[\w./\\-]+)['"]/g,
    /import\s*\(\s*['"](\.[\w./\\-]+)['"]\s*\)/g,
    /require\s*\(\s*['"](\.[\w./\\-]+)['"]\s*\)/g,
  ],
  python: [
    /from\s+([\w.]+)\s+import/g,
    /import\s+([\w.]+)/g,
  ],
  go: [
    /import\s+(?:\w+\s+)?["']([^"']+)["']/g,
  ],
  rust: [
    /use\s+(crate::[\w:]+)/g,
    /mod\s+(\w+)/g,
  ],
};

const EXT_TO_LANG: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'typescript', '.mts': 'typescript',
  '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
};

const TEST_PATTERNS = [
  /\.test\./,
  /\.spec\./,
  /\/__tests__\//,
  /\/tests?\//,
  /_test\./,
  /test_/,
];

export function buildImportGraph(root: string): Map<string, Set<string>> {
  const files = collectFiles(root, {});
  const graph = new Map<string, Set<string>>();

  for (const file of files) {
    const ext = extname(file.relativePath);
    const lang = EXT_TO_LANG[ext];
    if (!lang) continue;

    const imports = extractImports(file.content, file.relativePath, lang, root);
    graph.set(file.relativePath, new Set(imports));
  }

  return graph;
}

function extractImports(
  content: string,
  filePath: string,
  lang: string,
  root: string,
): string[] {
  const patterns = IMPORT_PATTERNS[lang];
  if (!patterns) return [];

  const imports: string[] = [];
  const fileDir = dirname(filePath);

  for (const pattern of patterns) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      const raw = match[1];
      if (!raw) continue;

      if (lang === 'python') {
        const pyPath = raw.replace(/\./g, '/') + '.py';
        const resolved = resolveFile(root, pyPath);
        if (resolved) imports.push(resolved);
        continue;
      }

      const resolved = resolveRelativeImport(root, fileDir, raw);
      if (resolved) imports.push(resolved);
    }
  }

  return imports;
}

function resolveRelativeImport(root: string, fromDir: string, importPath: string): string | null {
  // Strip .js/.mjs extension for TypeScript ESM resolution (import from './foo.js' → ./foo.ts)
  const stripped = importPath.replace(/\.(m?js)$/, '');
  const bases = stripped !== importPath ? [join(fromDir, stripped), join(fromDir, importPath)] : [join(fromDir, importPath)];
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs', ''];

  for (const base of bases) {
    for (const ext of extensions) {
      const candidate = base + ext;
      if (existsSync(join(root, candidate))) return candidate;
    }
  }

  // Try index file
  for (const base of bases) {
    for (const ext of extensions) {
      const candidate = join(base, 'index' + ext);
      if (existsSync(join(root, candidate))) return candidate;
    }
  }

  return null;
}

function resolveFile(root: string, relativePath: string): string | null {
  if (existsSync(join(root, relativePath))) return relativePath;
  return null;
}

export function getReverseDependencies(graph: Map<string, Set<string>>): Map<string, Set<string>> {
  const reverse = new Map<string, Set<string>>();

  for (const [file, deps] of graph) {
    for (const dep of deps) {
      if (!reverse.has(dep)) reverse.set(dep, new Set());
      reverse.get(dep)!.add(file);
    }
  }

  return reverse;
}

export function computeBlastRadius(
  root: string,
  changedFile: string,
  graph?: Map<string, Set<string>>,
): BlastRadius {
  const importGraph = graph ?? buildImportGraph(root);
  const reverseGraph = getReverseDependencies(importGraph);

  const visited = new Set<string>();
  const queue = [changedFile];
  const directDeps = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    const dependents = reverseGraph.get(current) ?? new Set();

    for (const dep of dependents) {
      if (current === changedFile) directDeps.add(dep);
      if (!visited.has(dep)) {
        visited.add(dep);
        queue.push(dep);
      }
    }
  }

  const allDependents = [...visited];
  const affectedTests = allDependents.filter(f =>
    TEST_PATTERNS.some(p => p.test(f)),
  );

  const totalFiles = importGraph.size;
  const affectedRatio = totalFiles > 0 ? allDependents.length / totalFiles : 0;
  const isTest = TEST_PATTERNS.some(p => p.test(changedFile));
  const isType = /types?\.(ts|d\.ts)$/.test(changedFile);

  let riskScore = Math.round(affectedRatio * 60);
  riskScore += Math.min(directDeps.size * 5, 20);
  riskScore += affectedTests.length === 0 && !isTest ? 15 : 0;
  riskScore += isType ? 10 : 0;
  riskScore = Math.min(riskScore, 100);

  let riskLevel: BlastRadius['riskLevel'] = 'low';
  if (riskScore >= 75) riskLevel = 'critical';
  else if (riskScore >= 50) riskLevel = 'high';
  else if (riskScore >= 25) riskLevel = 'medium';

  return {
    changedFile,
    directDependents: [...directDeps],
    transitiveDependents: allDependents,
    affectedTests,
    riskScore,
    riskLevel,
  };
}

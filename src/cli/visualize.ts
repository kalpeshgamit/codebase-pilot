import { resolve } from 'node:path';
import { generateVisualization } from '../intelligence/visualize.js';

interface VisualizeOptions {
  dir: string;
  output?: string;
}

export async function visualizeCommand(options: VisualizeOptions): Promise<void> {
  const root = resolve(options.dir);
  const outputPath = options.output || 'codebase-pilot-graph.html';

  console.log('');
  console.log('  Generating import graph visualization...');

  const result = generateVisualization(root, outputPath);

  console.log(`  Nodes: ${result.nodes} files`);
  console.log(`  Edges: ${result.edges} imports`);
  console.log(`  Output: ${outputPath}`);
  console.log('');
  console.log('  Open in browser to explore.');
  console.log('');
}

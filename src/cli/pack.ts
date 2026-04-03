import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { packProject } from '../packer/index.js';
import { formatTokenCount } from '../packer/token-counter.js';

interface PackCommandOptions {
  dir: string;
  format: string;
  output?: string;
  copy: boolean;
  compress: boolean;
  agent?: string;
  security: boolean;
}

export async function packCommand(options: PackCommandOptions): Promise<void> {
  const root = resolve(options.dir);
  const format = (options.format === 'md' ? 'md' : 'xml') as 'xml' | 'md';
  const ext = format === 'xml' ? '.xml' : '.md';
  const outputPath = options.output || `codebase-pilot-output${ext}`;

  console.log('');

  if (options.agent) {
    console.log(`  Packing agent context: ${options.agent}`);
  } else if (options.compress) {
    console.log('  Packing project (compressed)...');
  } else {
    console.log('  Packing project...');
  }
  console.log('');

  try {
    const result = packProject({
      dir: root,
      format,
      compress: options.compress,
      agent: options.agent,
      noSecurity: !options.security,
    });

    // Print security results
    if (result.skippedFiles.length > 0) {
      console.log(`  Security scan:  ${result.skippedFiles.length} file${result.skippedFiles.length > 1 ? 's' : ''} skipped (secrets detected)`);
      for (const skip of result.skippedFiles) {
        console.log(`    ${skip.file.padEnd(30)} — ${skip.reason}`);
      }
      console.log('');
    } else if (options.security) {
      console.log('  Security scan:  clean');
      console.log('');
    }

    // Output
    if (options.copy) {
      // Clipboard support — write to stdout for piping
      process.stdout.write(result.output);
      return;
    }

    writeFileSync(outputPath, result.output, 'utf8');

    console.log(`  Files:    ${result.fileCount} packed`);
    if (result.compressionRatio !== undefined) {
      const originalTokens = Math.round(result.totalTokens / (1 - result.compressionRatio / 100));
      console.log(`  Tokens:   ~${formatTokenCount(result.totalTokens)} (compressed from ~${formatTokenCount(originalTokens)}, ${result.compressionRatio}% reduction)`);
    } else {
      console.log(`  Tokens:   ~${formatTokenCount(result.totalTokens)} (estimated)`);
    }
    console.log(`  Format:   ${format.toUpperCase()}`);
    console.log(`  Output:   ${outputPath}`);
    console.log('');
    console.log('  Done!');
    console.log('');
  } catch (err) {
    console.error(`  Error: ${(err as Error).message}`);
    console.log('');
    process.exitCode = 1;
  }
}

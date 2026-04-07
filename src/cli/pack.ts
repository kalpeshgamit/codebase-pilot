import { resolve, basename } from 'node:path';
import { writeFileSync } from 'node:fs';
import { packProject } from '../packer/index.js';
import { formatTokenCount } from '../packer/token-counter.js';
import { logPackRun, getGitContext } from '../packer/usage-logger.js';
import { detectChanges } from '../intelligence/incremental.js';

interface PackCommandOptions {
  dir: string;
  format: string;
  output?: string;
  copy: boolean;
  compress: boolean;
  agent?: string;
  security: boolean;
  dryRun: boolean;
  affected: boolean;
  prune?: string;
}

export async function packCommand(options: PackCommandOptions): Promise<void> {
  const root = resolve(options.dir);
  const format = (options.format === 'md' ? 'md' : 'xml') as 'xml' | 'md';
  const ext = format === 'xml' ? '.xml' : '.md';
  const outputPath = options.output || `codebase-pilot-output${ext}`;

  console.log('');

  // --affected: detect changes first
  let affectedFiles: string[] | undefined;
  if (options.affected) {
    const changes = detectChanges(root);
    const changedPaths = [...changes.added, ...changes.modified];

    if (changes.isFirstRun) {
      console.log('  First run — indexing all files (next run will be incremental)');
      console.log('');
      // Don't filter on first run — pack everything, just save hashes
      affectedFiles = undefined;
    } else if (changedPaths.length === 0) {
      console.log('  No changes detected since last pack.');
      if (changes.deleted.length > 0) {
        console.log(`  ${changes.deleted.length} file${changes.deleted.length > 1 ? 's' : ''} deleted.`);
      }
      console.log('');
      return;
    } else {
      console.log(`  Changes detected:`);
      if (changes.added.length > 0) console.log(`    + ${changes.added.length} added`);
      if (changes.modified.length > 0) console.log(`    ~ ${changes.modified.length} modified`);
      if (changes.deleted.length > 0) console.log(`    - ${changes.deleted.length} deleted`);
      console.log(`  Packing ${changedPaths.length} affected file${changedPaths.length !== 1 ? 's' : ''}...`);
      console.log('');
      affectedFiles = changedPaths;
    }
  }

  // --prune: validate target file
  if (options.prune) {
    console.log(`  Pruning to files reachable from: ${options.prune}`);
    console.log('');
  }

  // Header
  if (!options.affected && !options.prune) {
    if (options.agent) {
      console.log(`  Packing agent context: ${options.agent}`);
    } else if (options.compress) {
      console.log('  Packing project (compressed)...');
    } else {
      console.log('  Packing project...');
    }
    console.log('');
  }

  try {
    const packStart = Date.now();
    const git = getGitContext(root);

    const result = packProject({
      dir: root,
      format,
      compress: options.compress,
      agent: options.agent,
      noSecurity: !options.security,
      affectedOnly: affectedFiles,
      pruneTarget: options.prune,
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

    // --dry-run: print summary and exit without writing
    if (options.dryRun) {
      console.log('  [DRY RUN] Preview — no files written');
      console.log('');
      console.log(`  Files:    ${result.fileCount}`);
      console.log(`  Raw:      ~${formatTokenCount(result.rawTokens)} tokens`);
      if (result.compressionRatio !== undefined) {
        console.log(`  Packed:   ~${formatTokenCount(result.totalTokens)} tokens (${result.compressionRatio}% reduction)`);
      }
      console.log(`  Format:   ${format.toUpperCase()}`);
      console.log(`  Output:   ${outputPath} (not written)`);

      // Show top files by tokens
      if (result.fileCount > 0) {
        console.log('');
        console.log('  Top files by tokens:');
        // Re-collect to show breakdown (lightweight since cached)
        const { collectFiles } = await import('../packer/collector.js');
        const allFiles = collectFiles(root, {});
        const filtered = affectedFiles
          ? allFiles.filter(f => affectedFiles.includes(f.relativePath))
          : allFiles;
        const sorted = [...filtered].sort((a, b) => b.tokens - a.tokens).slice(0, 10);
        for (const f of sorted) {
          console.log(`    ${formatTokenCount(f.tokens).padStart(8)} tokens  ${f.relativePath}`);
        }
      }
      console.log('');
      return;
    }

    // Output
    if (options.copy) {
      process.stdout.write(result.output);
      return;
    }

    writeFileSync(outputPath, result.output, 'utf8');

    // Log this run for savings tracking
    logPackRun(root, {
      date: new Date().toISOString(),
      project: basename(root),
      projectPath: root,
      tokensRaw: result.rawTokens,
      tokensPacked: result.totalTokens,
      files: result.fileCount,
      agent: options.agent,
      compressed: options.compress,
      command: options.affected ? 'pack --affected' : options.prune ? `pack --prune ${options.prune}` : 'pack',
      branch: git.branch,
      commit: git.commit,
      commitHash: git.commitHash,
      dirty: git.dirty,
      duration: Date.now() - packStart,
    });

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

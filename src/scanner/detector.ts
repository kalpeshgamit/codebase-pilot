import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { join, basename, relative } from 'node:path';
import { detectLanguages } from './language.js';
import { detectFramework } from './framework.js';
import { detectDatabase } from './database.js';
import { detectTestRunner } from './testing.js';
import { detectStructure } from './structure.js';
import { detectExisting } from './existing.js';
import type { ProjectScan } from '../types.js';

export async function detect(root: string): Promise<ProjectScan> {
  const name = basename(root);

  const languages = detectLanguages(root);
  const framework = detectFramework(root);
  const database = detectDatabase(root);
  const testRunner = detectTestRunner(root);
  const { type, packages } = detectStructure(root, languages);
  const existing = detectExisting(root);

  return {
    root,
    name,
    type,
    languages,
    framework,
    database,
    testRunner,
    packages,
    existing,
  };
}

export function printScan(scan: ProjectScan): void {
  console.log('');
  console.log('  Detected:');
  console.log(
    `    Language:   ${scan.languages.map((l) => `${l.name} (${l.percentage}%)`).join(', ')}`,
  );
  if (scan.framework) console.log(`    Framework:  ${scan.framework}`);
  if (scan.database) console.log(`    Database:   ${scan.database.orm} → ${scan.database.type}`);
  if (scan.testRunner) console.log(`    Tests:      ${scan.testRunner}`);
  console.log(`    Structure:  ${scan.type === 'monorepo' ? 'Monorepo' : 'Single package'} (${scan.packages.length} package${scan.packages.length !== 1 ? 's' : ''})`);

  if (scan.packages.length > 0) {
    console.log('    Packages:');
    for (const pkg of scan.packages) {
      console.log(`      ${pkg.path.padEnd(24)} → ${pkg.type.padEnd(8)} (${pkg.fileCount} files)`);
    }
  }

  console.log('');
  console.log('  Existing Claude Code config:');
  console.log(`    CLAUDE.md:     ${scan.existing.claudeMd ? 'found → will merge' : 'not found → will create'}`);
  console.log(`    .claudeignore: ${scan.existing.claudeignore ? 'found → will merge' : 'not found → will create'}`);
  if (scan.existing.mcpServers.length > 0) {
    console.log(`    MCP servers:   ${scan.existing.mcpServers.length} connected (${scan.existing.mcpServers.join(', ')})`);
  } else {
    console.log('    MCP servers:   none');
  }
  console.log('');
}

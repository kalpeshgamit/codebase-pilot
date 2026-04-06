import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ProjectScan } from '../types.js';

/** Supported AI coding tool platforms. */
export type Platform = 'cursor' | 'windsurf' | 'codex';

const PLATFORM_FILES: Record<Platform, string> = {
  cursor: '.cursorrules',
  windsurf: '.windsurfrules',
  codex: 'AGENTS.md',
};

const MARKER = '[codebase-pilot]';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a rules file for a single platform.
 * Merges non-destructively: if the target file exists and already contains
 * our marker section, the write is skipped. If the file exists without our
 * marker, our section is appended.
 */
export function generatePlatformRules(
  root: string,
  scan: ProjectScan,
  platform: Platform,
): { created: boolean; path: string } {
  const filename = PLATFORM_FILES[platform];
  const outputPath = join(root, filename);
  const content = buildRulesContent(scan, platform);

  if (existsSync(outputPath)) {
    const existing = readFileSync(outputPath, 'utf8');
    if (existing.includes(MARKER)) {
      return { created: false, path: filename };
    }
    writeFileSync(outputPath, existing + '\n\n' + content, 'utf8');
    return { created: false, path: filename };
  }

  writeFileSync(outputPath, content, 'utf8');
  return { created: true, path: filename };
}

/**
 * Generate rules files for every supported platform in one call.
 * Returns an array of results, one per platform.
 */
export function generateAllPlatforms(
  root: string,
  scan: ProjectScan,
): Array<{ platform: Platform; created: boolean; path: string }> {
  const platforms: Platform[] = ['cursor', 'windsurf', 'codex'];
  return platforms.map((p) => ({
    platform: p,
    ...generatePlatformRules(root, scan, p),
  }));
}

// ---------------------------------------------------------------------------
// Content builder
// ---------------------------------------------------------------------------

function buildRulesContent(scan: ProjectScan, platform: Platform): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${MARKER} Project Rules`);
  lines.push('');

  // Project metadata
  lines.push(`Project: ${scan.name}`);
  lines.push(`Type: ${scan.type === 'monorepo' ? 'Monorepo' : 'Single package'}`);
  lines.push(
    `Languages: ${scan.languages.map((l) => `${l.name} (${l.percentage}%)`).join(', ')}`,
  );
  if (scan.framework) lines.push(`Framework: ${scan.framework}`);
  if (scan.database) lines.push(`Database: ${scan.database.orm} \u2192 ${scan.database.type}`);
  if (scan.testRunner) lines.push(`Test Runner: ${scan.testRunner}`);
  lines.push('');

  // Rules
  lines.push('## Rules');
  lines.push('');
  lines.push('- Search before reading files');
  lines.push('- Read files with targeted line ranges, not full files');
  lines.push('- Plan before writing code');
  lines.push('- Run tests after changes');
  if (scan.framework) {
    lines.push(`- Follow ${scan.framework} conventions and patterns`);
  }
  lines.push('');

  // Packages (monorepo only)
  if (scan.type === 'monorepo' && scan.packages.length > 0) {
    lines.push('## Packages');
    lines.push('');
    for (const pkg of scan.packages) {
      lines.push(`- \`${pkg.path}\` \u2014 ${pkg.type} (${pkg.language})`);
    }
    lines.push('');
  }

  // Token optimization
  lines.push('## Token Optimization');
  lines.push('');
  lines.push('- Use `codebase-pilot pack --compress` for full context');
  lines.push('- Use `codebase-pilot pack --agent <name> --compress` for scoped context');
  lines.push('- Use `codebase-pilot tokens` to check token budgets');

  // Codex-specific: agent definitions section
  if (platform === 'codex') {
    lines.push('');
    lines.push('## Agents');
    lines.push('');
    lines.push(
      'This project uses codebase-pilot sub-agents. Run `codebase-pilot health` to validate setup.',
    );
    lines.push('Agent definitions are in `.codebase-pilot/agents.json`.');
  }

  return lines.join('\n');
}

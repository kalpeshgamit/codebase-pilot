import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ProjectScan } from '../types.js';

export function generateClaudeMd(
  root: string,
  scan: ProjectScan,
): { created: boolean; template: string } {
  const outputPath = join(root, 'CLAUDE.md');
  const existing = scan.existing.claudeMdPath;

  const template = pickTemplate(scan);
  const content = buildClaudeMd(scan, template);

  if (existing) {
    const existingContent = readFileSync(existing, 'utf8');
    const merged = mergeClaudeMd(existingContent, content);
    writeFileSync(existing, merged, 'utf8');
    return { created: false, template };
  }

  writeFileSync(outputPath, content, 'utf8');
  return { created: true, template };
}

function pickTemplate(scan: ProjectScan): string {
  if (scan.type === 'monorepo') return 'monorepo';
  if (scan.framework) return scan.framework.toLowerCase().replace(/\s+/g, '-');
  const lang = scan.languages[0]?.name.toLowerCase() || 'generic';
  return lang;
}

function buildClaudeMd(scan: ProjectScan, _template: string): string {
  const lines: string[] = [];

  lines.push(`# CLAUDE.md — ${scan.name} Token-Optimized Engineering Prompt`);
  lines.push('');
  lines.push('## Identity');
  lines.push('');
  lines.push('Senior AI engineer. Token-aware, surgical, never explores blindly.');
  lines.push('Always: search before read, plan before write.');
  lines.push('');

  // Project section
  lines.push('## Project');
  lines.push('');
  lines.push(`- **Name:** ${scan.name}`);
  lines.push(`- **Languages:** ${scan.languages.map((l) => l.name).join(', ')}`);
  if (scan.framework) lines.push(`- **Framework:** ${scan.framework}`);
  if (scan.database) lines.push(`- **Database:** ${scan.database.orm} → ${scan.database.type}`);
  if (scan.testRunner) lines.push(`- **Tests:** ${scan.testRunner}`);
  lines.push('');

  // Architecture section
  lines.push('## Architecture');
  lines.push('');
  lines.push('```');
  if (scan.type === 'monorepo') {
    for (const pkg of scan.packages) {
      lines.push(`  ${pkg.path.padEnd(24)} # ${pkg.type} (${pkg.fileCount} files)`);
    }
  } else {
    lines.push(`  ${scan.name}/`);
    lines.push('    src/');
  }
  lines.push('```');
  lines.push('');

  // Search strategy
  lines.push('## Search Strategy');
  lines.push('');
  lines.push('1. **Grep** — find symbols, functions, imports (built-in, zero cost)');
  lines.push('2. **Glob** — locate files by pattern');
  lines.push('3. **Read with offset+limit** — surgical reads, never full files');
  lines.push('4. **context7** — library docs (if connected)');
  lines.push('');

  // Token rules
  lines.push('## Token Rules');
  lines.push('');
  lines.push('1. Grep/Glob before Read. Always search first.');
  lines.push('2. Read with offset+limit — never read full files blindly.');
  lines.push('3. Scope all CLI commands to specific paths.');
  lines.push('4. Never read node_modules/, dist/, *.lock files.');
  lines.push('5. Plan before write — list files to read, modify, and what changes.');
  lines.push('');

  // Sub-agents
  lines.push('## Sub-Agent Architecture');
  lines.push('');
  lines.push('Agents defined in `.codebase-pilot/agents.json`. Use dispatch patterns:');
  lines.push('');
  lines.push('```');
  lines.push('Break this into sub-agents using .codebase-pilot/agents.json');
  lines.push('Pattern: [pattern-name]');
  lines.push('Feature: [description]');
  lines.push('```');
  lines.push('');

  // Model selection
  lines.push('## Model Selection');
  lines.push('');
  lines.push('| Task | Model |');
  lines.push('|------|-------|');
  lines.push('| File reads, quick fixes, types | haiku |');
  lines.push('| Most coding, API routes, logic | sonnet |');
  lines.push('| Architecture, complex async, review | opus |');
  lines.push('');

  // Never/Always
  lines.push('## Never Do');
  lines.push('');
  lines.push('- Read files without searching first');
  lines.push('- Read full files — always use offset + limit');
  lines.push('- Run bare git log, git diff, npm test');
  lines.push('- Write code without a plan');
  lines.push('- Use opus for mechanical tasks');
  lines.push('');
  lines.push('## Always Do');
  lines.push('');
  lines.push('- Grep/Glob before Read');
  lines.push('- Plan before write');
  lines.push('- Use sub-agents for cross-package work');
  lines.push('- Use haiku for mechanical sub-tasks');
  lines.push('- Scope all CLI commands to specific paths');
  lines.push('- Run /healthcheck before full-feature dispatch');
  lines.push('');

  return lines.join('\n');
}

function mergeClaudeMd(existing: string, generated: string): string {
  // If existing has our marker, replace the generated sections
  if (existing.includes('## Sub-Agent Architecture')) {
    return existing; // Already has our content, don't overwrite
  }

  // Append sub-agent and token sections to existing
  const appendSections = generated
    .split('\n')
    .slice(generated.split('\n').findIndex((l) => l.startsWith('## Sub-Agent')))
    .join('\n');

  return existing + '\n\n' + appendSections;
}

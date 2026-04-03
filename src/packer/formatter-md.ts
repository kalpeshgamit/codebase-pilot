import type { CollectedFile } from './collector.js';
import { formatTokenCount } from './token-counter.js';

export function formatMarkdown(
  projectName: string,
  files: CollectedFile[],
  agentName?: string,
): string {
  const totalTokens = files.reduce((sum, f) => sum + f.tokens, 0);
  const agentLabel = agentName ? `, agent: ${agentName}` : '';

  const lines: string[] = [];
  lines.push(`# ${projectName} (${files.length} files, ~${formatTokenCount(totalTokens)} tokens${agentLabel})`);
  lines.push('');

  for (const file of files) {
    const langLabel = file.language ? `, ${file.language}` : '';
    lines.push(`## ${file.relativePath} (${formatTokenCount(file.tokens)} tokens${langLabel})`);
    lines.push('');
    const fence = file.language ? '```' + file.language.toLowerCase() : '```';
    lines.push(fence);
    lines.push(file.content);
    lines.push('```');
    lines.push('');
  }

  return lines.join('\n');
}

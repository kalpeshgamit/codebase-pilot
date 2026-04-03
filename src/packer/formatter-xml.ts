import type { CollectedFile } from './collector.js';

export function formatXml(
  projectName: string,
  files: CollectedFile[],
  agentName?: string,
): string {
  const totalTokens = files.reduce((sum, f) => sum + f.tokens, 0);
  const agentAttr = agentName ? ` agent="${escapeAttr(agentName)}"` : '';

  const lines: string[] = [];
  lines.push(`<codebase project="${escapeAttr(projectName)}"${agentAttr} files="${files.length}" tokens="${totalTokens}">`);

  for (const file of files) {
    const langAttr = file.language ? ` language="${escapeAttr(file.language)}"` : '';
    lines.push(`  <file path="${escapeAttr(file.relativePath)}" tokens="${file.tokens}"${langAttr}>`);
    lines.push('    <content>');
    lines.push(escapeXml(file.content));
    lines.push('    </content>');
    lines.push('  </file>');
  }

  lines.push('</codebase>');
  return lines.join('\n');
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

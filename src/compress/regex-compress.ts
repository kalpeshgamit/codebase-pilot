import { COMPRESSION_LANGUAGES } from './patterns.js';

/**
 * Compress code by extracting signatures and folding function bodies.
 * Tier A: regex-based, always available, ~60-70% token reduction.
 */
export function compressCode(code: string, language: string): string {
  const langDef = COMPRESSION_LANGUAGES.find(
    l => l.language === language || l.aliases.includes(language),
  );
  if (!langDef) return code;

  const lines = code.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (langDef.preservePatterns.some(p => p.test(line))) {
      result.push(line);
      i++;
      continue;
    }

    let matched = false;
    for (const pattern of langDef.blockPatterns) {
      const match = line.match(pattern.signature);
      if (match) {
        if (pattern.blockType === 'brace') {
          result.push(match[1] + ' ' + pattern.placeholder);
          i = skipBraceBlock(lines, i);
        } else if (pattern.blockType === 'indent') {
          result.push(match[1] + pattern.placeholder);
          i = skipIndentBlock(lines, i);
        }
        matched = true;
        break;
      }
    }

    if (!matched) {
      if (line.trim() === '' || isDeclarationLine(line)) {
        result.push(line);
      }
      i++;
    }
  }

  return result.join('\n');
}

function skipBraceBlock(lines: string[], startLine: number): number {
  let depth = 0;
  let i = startLine;
  for (; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
    }
    if (depth === 0 && i > startLine) return i + 1;
  }
  return i;
}

function skipIndentBlock(lines: string[], startLine: number): number {
  const baseIndent = getIndent(lines[startLine]);
  let i = startLine + 1;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { i++; continue; }
    if (getIndent(line) <= baseIndent) break;
    i++;
  }
  return i;
}

function getIndent(line: string): number {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

function isDeclarationLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.startsWith('export ') || trimmed.startsWith('const ') ||
    trimmed.startsWith('let ') || trimmed.startsWith('var ') ||
    trimmed.startsWith('type ') || trimmed.startsWith('//') ||
    trimmed.startsWith('*') || trimmed.startsWith('/**')
  );
}

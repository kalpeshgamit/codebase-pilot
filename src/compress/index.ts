import { compressCode as regexCompress } from './regex-compress.js';
import { treeSitterCompress, isTreeSitterAvailable } from './treesitter-compress.js';

export interface CompressResult {
  code: string;
  method: 'tree-sitter' | 'regex' | 'none';
}

/**
 * Compress code using best available method.
 * Tier B (tree-sitter) if available, falls back to Tier A (regex).
 */
export function compress(code: string, language: string): CompressResult {
  // Try tree-sitter first
  if (isTreeSitterAvailable(language)) {
    try {
      const result = treeSitterCompress(code, language);
      if (result) return { code: result, method: 'tree-sitter' };
    } catch {
      // Fall through to regex
    }
  }

  // Fall back to regex compression
  const result = regexCompress(code, language);
  if (result !== code) {
    return { code: result, method: 'regex' };
  }

  return { code, method: 'none' };
}

export { compressCode } from './regex-compress.js';

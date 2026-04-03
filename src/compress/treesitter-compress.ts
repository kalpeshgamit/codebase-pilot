/**
 * Tree-sitter enhanced compression (Tier B).
 * Uses optional tree-sitter dependency for accurate AST-based compression.
 * Returns null if tree-sitter is not available for the given language.
 */

import { createRequire } from 'node:module';

const LANGUAGE_GRAMMAR_MAP: Record<string, string> = {
  TypeScript: 'tree-sitter-typescript',
  JavaScript: 'tree-sitter-typescript',
  Python: 'tree-sitter-python',
  Go: 'tree-sitter-go',
  Rust: 'tree-sitter-rust',
};

let treeSitterAvailable: boolean | null = null;

export function isTreeSitterAvailable(language: string): boolean {
  if (!(language in LANGUAGE_GRAMMAR_MAP)) return false;

  if (treeSitterAvailable === null) {
    try {
      const require = createRequire(import.meta.url);
      require('tree-sitter');
      treeSitterAvailable = true;
    } catch {
      treeSitterAvailable = false;
    }
  }

  return treeSitterAvailable;
}

export function treeSitterCompress(code: string, language: string): string | null {
  if (!isTreeSitterAvailable(language)) return null;

  // Tree-sitter integration will be implemented in v0.2
  // For now, return null to fall back to regex compression
  return null;
}

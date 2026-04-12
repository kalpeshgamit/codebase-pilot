import { basename } from 'node:path';
import { SECRET_PATTERNS, type RiskLevel } from './patterns.js';

export interface SecretMatch {
  pattern: string;
  category: string;
  risk: RiskLevel;
  line: number;
  file: string;
  /** True when the file is a known test fixture, integration guide, or example file.
   *  These intentionally contain placeholder credentials — they should not block packing
   *  but may still be reported in scan-secrets output for awareness. */
  knownSafe: boolean;
}

/**
 * Path patterns that intentionally contain example/test credentials.
 * Matches are still reported but marked knownSafe=true so callers can
 * decide whether to skip the file or include it with an annotation.
 */
const SAFE_PATH_PATTERNS: RegExp[] = [
  /\/__tests__\//,
  /\/test[-_]helpers?\//,
  /\/test[-_]utils?\//,
  /\/mocks?\//,
  /\/fixtures?\//,
  /\/stubs?\//,
  /\/fakes?\//,
  /\/integration[-_]guide\./,
  /\/seed[-_]data\./,
  /\/reference[-_]code\./,
  /\/stack[-_]guides?\./,
  /\/specs?\//,
  /\/snippets?\//,
  /\/templates?\//,
  /\.example\./,
  /\.sample\./,
  /\.mock\./,
  /\.test\.(ts|js|tsx|jsx|py|go|rb)$/,
  /\.spec\.(ts|js|tsx|jsx|py|go|rb)$/,
];

export function isKnownSafePath(filePath: string): boolean {
  return SAFE_PATH_PATTERNS.some(p => p.test(filePath));
}

export function scanForSecrets(content: string, filePath: string): SecretMatch[] {
  const matches: SecretMatch[] = [];
  const lines = content.split('\n');
  const knownSafe = isKnownSafePath(filePath);

  for (let i = 0; i < lines.length; i++) {
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.regex.test(lines[i])) {
        matches.push({
          pattern: pattern.name,
          category: pattern.category,
          risk: pattern.risk,
          line: i + 1,
          file: filePath,
          knownSafe,
        });
        break;
      }
    }
  }

  return matches;
}

export function isEnvFile(filePath: string): boolean {
  const name = basename(filePath);
  return name === '.env' || name.startsWith('.env.');
}

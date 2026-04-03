import { basename } from 'node:path';
import { SECRET_PATTERNS } from './patterns.js';

export interface SecretMatch {
  pattern: string;
  line: number;
  file: string;
}

export function scanForSecrets(content: string, filePath: string): SecretMatch[] {
  const matches: SecretMatch[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.regex.test(lines[i])) {
        matches.push({ pattern: pattern.name, line: i + 1, file: filePath });
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

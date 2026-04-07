import { resolve } from 'node:path';
import { collectFiles } from '../packer/collector.js';
import { scanForSecrets, isEnvFile } from '../security/scanner.js';
import { SECRET_PATTERNS } from '../security/patterns.js';
import type { RiskLevel } from '../security/patterns.js';

interface ScanSecretsOptions {
  dir: string;
}

const RISK_COLORS: Record<RiskLevel, string> = {
  critical: '\x1b[35m',  // magenta
  high: '\x1b[31m',      // red
  medium: '\x1b[33m',    // yellow
  low: '\x1b[36m',       // cyan
};
const RESET = '\x1b[0m';

export async function scanSecretsCommand(options: ScanSecretsOptions): Promise<void> {
  const root = resolve(options.dir);

  console.log('');
  console.log('  Security Scan');
  console.log('  =============');
  console.log('');
  console.log(`  Patterns: ${SECRET_PATTERNS.length} across ${new Set(SECRET_PATTERNS.map(p => p.category)).size} categories`);

  const files = collectFiles(root, {});
  console.log(`  Files:    ${files.length} scanned`);
  console.log('');

  let totalSecrets = 0;
  const fileResults: Array<{ file: string; secrets: Array<{ pattern: string; risk: RiskLevel; line: number }> }> = [];

  for (const file of files) {
    if (isEnvFile(file.relativePath)) {
      fileResults.push({
        file: file.relativePath,
        secrets: [{ pattern: '.env file', risk: 'critical', line: 1 }],
      });
      totalSecrets++;
      continue;
    }

    const secrets = scanForSecrets(file.content, file.relativePath);
    if (secrets.length > 0) {
      fileResults.push({
        file: file.relativePath,
        secrets: secrets.map(s => ({ pattern: s.pattern, risk: s.risk, line: s.line })),
      });
      totalSecrets += secrets.length;
    }
  }

  if (fileResults.length === 0) {
    console.log('  \x1b[32m✓ No secrets detected — all files clean\x1b[0m');
    console.log('');
    return;
  }

  // Sort by risk: critical first
  const riskOrder: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  fileResults.sort((a, b) => {
    const aMax = Math.min(...a.secrets.map(s => riskOrder[s.risk]));
    const bMax = Math.min(...b.secrets.map(s => riskOrder[s.risk]));
    return aMax - bMax;
  });

  console.log(`  \x1b[31m✗ ${totalSecrets} secret${totalSecrets > 1 ? 's' : ''} found in ${fileResults.length} file${fileResults.length > 1 ? 's' : ''}\x1b[0m`);
  console.log('');

  for (const result of fileResults) {
    const maxRisk = result.secrets.reduce((max, s) =>
      riskOrder[s.risk] < riskOrder[max] ? s.risk : max, 'low' as RiskLevel);
    const color = RISK_COLORS[maxRisk];

    console.log(`  ${color}${maxRisk.toUpperCase().padEnd(8)}${RESET} ${result.file}`);
    for (const s of result.secrets) {
      console.log(`           ${RISK_COLORS[s.risk]}${s.pattern}${RESET} (line ${s.line})`);
    }
    console.log('');
  }

  // Summary
  const byCrit = fileResults.flatMap(f => f.secrets).reduce((acc, s) => {
    acc[s.risk] = (acc[s.risk] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('  Summary:');
  for (const risk of ['critical', 'high', 'medium', 'low'] as RiskLevel[]) {
    if (byCrit[risk]) {
      console.log(`    ${RISK_COLORS[risk]}${risk.padEnd(10)}${RESET} ${byCrit[risk]}`);
    }
  }
  console.log('');

  process.exitCode = 1;
}

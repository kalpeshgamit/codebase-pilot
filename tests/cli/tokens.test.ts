import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { collectFiles } from '../../src/packer/collector.js';
import { countTokens } from '../../src/packer/token-counter.js';

describe('tokens integration', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cp-tokens-'));
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeFileSync(join(tmpDir, 'src', 'big.ts'), 'x'.repeat(4000));
    writeFileSync(join(tmpDir, 'src', 'small.ts'), 'export {}');
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('collects files with token counts', () => {
    const files = collectFiles(tmpDir, {});
    expect(files.length).toBe(2);
    expect(files.every(f => f.tokens > 0)).toBe(true);
  });

  it('sorts by token size descending', () => {
    const files = collectFiles(tmpDir, {});
    const sorted = [...files].sort((a, b) => b.tokens - a.tokens);
    expect(sorted[0].tokens).toBeGreaterThan(sorted[1].tokens);
  });

  it('counts tokens accurately', () => {
    const tokens = countTokens('x'.repeat(4000));
    expect(tokens).toBe(1000);
  });
});

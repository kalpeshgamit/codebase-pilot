import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { packProject } from '../../src/packer/index.js';

describe('packProject integration', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cp-pack-'));
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeFileSync(join(tmpDir, 'src', 'index.ts'), 'export function hello() {\n  return "world";\n}');
    writeFileSync(join(tmpDir, 'src', 'app.ts'), 'const x = 1;');
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('packs project as XML', () => {
    const result = packProject({ dir: tmpDir, format: 'xml', compress: false, noSecurity: false });
    expect(result.output).toContain('<codebase');
    expect(result.fileCount).toBe(2);
    expect(result.totalTokens).toBeGreaterThan(0);
  });

  it('packs project as Markdown', () => {
    const result = packProject({ dir: tmpDir, format: 'md', compress: false, noSecurity: false });
    expect(result.output).toContain('# ');
    expect(result.output).toContain('```typescript');
  });

  it('compresses code when --compress is used', () => {
    const normal = packProject({ dir: tmpDir, format: 'xml', compress: false, noSecurity: true });
    const compressed = packProject({ dir: tmpDir, format: 'xml', compress: true, noSecurity: true });
    expect(compressed.totalTokens).toBeLessThanOrEqual(normal.totalTokens);
  });

  it('skips files with secrets', () => {
    writeFileSync(join(tmpDir, 'src', 'config.ts'), 'const key = "AKIAIOSFODNN7EXAMPLE";');
    const result = packProject({ dir: tmpDir, format: 'xml', compress: false, noSecurity: false });
    expect(result.skippedFiles.length).toBe(1);
    expect(result.skippedFiles[0].file).toContain('config.ts');
  });

  it('scopes to agent context', () => {
    mkdirSync(join(tmpDir, '.codebase-pilot'), { recursive: true });
    writeFileSync(join(tmpDir, '.codebase-pilot', 'agents.json'), JSON.stringify({
      version: '1.0.0',
      project: 'test',
      agents: {
        'src-agent': { name: 'src-agent', model: 'haiku', context: ['src/'], task: 'test', layer: 1, dependsOn: [] },
      },
      patterns: {},
    }));
    mkdirSync(join(tmpDir, 'docs'), { recursive: true });
    writeFileSync(join(tmpDir, 'docs', 'readme.md'), '# readme');

    const result = packProject({ dir: tmpDir, format: 'xml', compress: false, noSecurity: true, agent: 'src-agent' });
    expect(result.fileCount).toBe(2);
    expect(result.output).toContain('agent="src-agent"');
    expect(result.output).not.toContain('readme.md');
  });
});

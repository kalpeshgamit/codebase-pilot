import { describe, it, expect } from 'vitest';
import { formatMarkdown } from '../../src/packer/formatter-md.js';
import type { CollectedFile } from '../../src/packer/collector.js';

describe('formatMarkdown', () => {
  const files: CollectedFile[] = [
    { relativePath: 'src/index.ts', content: 'export {}', language: 'TypeScript', tokens: 3 },
    { relativePath: 'main.py', content: 'print("hi")', language: 'Python', tokens: 5 },
  ];

  it('includes project header with file count and tokens', () => {
    const md = formatMarkdown('my-app', files);
    expect(md).toContain('# my-app');
    expect(md).toContain('2 files');
  });

  it('includes file sections with language', () => {
    const md = formatMarkdown('my-app', files);
    expect(md).toContain('## src/index.ts');
    expect(md).toContain('TypeScript');
  });

  it('uses fenced code blocks with language', () => {
    const md = formatMarkdown('my-app', files);
    expect(md).toContain('```typescript');
    expect(md).toContain('```python');
    expect(md).toContain('export {}');
  });

  it('includes agent name when provided', () => {
    const md = formatMarkdown('my-app', files, 'api-agent');
    expect(md).toContain('api-agent');
  });
});

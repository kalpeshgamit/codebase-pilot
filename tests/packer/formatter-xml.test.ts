import { describe, it, expect } from 'vitest';
import { formatXml } from '../../src/packer/formatter-xml.js';
import type { CollectedFile } from '../../src/packer/collector.js';

describe('formatXml', () => {
  const files: CollectedFile[] = [
    { relativePath: 'src/index.ts', content: 'export {}', language: 'TypeScript', tokens: 3 },
    { relativePath: 'src/app.ts', content: 'const x = 1;', language: 'TypeScript', tokens: 5 },
  ];

  it('produces valid XML structure', () => {
    const xml = formatXml('my-app', files);
    expect(xml).toContain('<codebase');
    expect(xml).toContain('</codebase>');
    expect(xml).toContain('<file');
    expect(xml).toContain('</file>');
  });

  it('includes project name and file count', () => {
    const xml = formatXml('my-app', files);
    expect(xml).toContain('project="my-app"');
    expect(xml).toContain('files="2"');
  });

  it('includes total tokens', () => {
    const xml = formatXml('my-app', files);
    expect(xml).toContain('tokens="8"');
  });

  it('includes file paths and content', () => {
    const xml = formatXml('my-app', files);
    expect(xml).toContain('path="src/index.ts"');
    expect(xml).toContain('export {}');
  });

  it('includes language attribute', () => {
    const xml = formatXml('my-app', files);
    expect(xml).toContain('language="TypeScript"');
  });

  it('includes agent name when provided', () => {
    const xml = formatXml('my-app', files, 'api-agent');
    expect(xml).toContain('agent="api-agent"');
  });

  it('escapes XML special characters in content', () => {
    const filesWithXml: CollectedFile[] = [
      { relativePath: 'test.ts', content: 'const a = 1 < 2 && b > 3;', language: 'TypeScript', tokens: 10 },
    ];
    const xml = formatXml('proj', filesWithXml);
    expect(xml).toContain('&lt;');
    expect(xml).toContain('&amp;');
  });
});

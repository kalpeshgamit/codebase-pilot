import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tokenizeTask, selectFilesForTask } from '../../src/intelligence/task-selector.js';

// Mock dependencies so tests don't need the real search.db or filesystem
vi.mock('../../src/intelligence/search.js', () => ({
  createSearchIndex: vi.fn(() => ({
    search: vi.fn(() => []),
    close: vi.fn(),
  })),
}));

vi.mock('../../src/intelligence/imports.js', () => ({
  buildImportGraph: vi.fn(() => new Map()),
  getReverseDependencies: vi.fn(() => new Map()),
}));

vi.mock('../../src/packer/collector.js', () => ({
  collectFiles: vi.fn(() => []),
}));

describe('tokenizeTask', () => {
  it('removes stop words', () => {
    const result = tokenizeTask('add a webhook endpoint');
    expect(result).not.toContain('add');
    expect(result).not.toContain('a');
    expect(result).toContain('webhook');
    expect(result).toContain('endpoint');
  });

  it('lowercases all tokens', () => {
    const result = tokenizeTask('Stripe Webhook');
    expect(result).toContain('stripe');
    expect(result).toContain('webhook');
    expect(result).not.toContain('Stripe');
  });

  it('handles empty string', () => {
    expect(tokenizeTask('')).toEqual([]);
  });

  it('handles only stop words', () => {
    expect(tokenizeTask('add the to for')).toEqual([]);
  });

  it('splits on punctuation', () => {
    const result = tokenizeTask('auth/middleware bug-fix');
    expect(result).toContain('auth');
    expect(result).toContain('middleware');
    expect(result).toContain('bug');
  });

  it('filters tokens shorter than 2 chars', () => {
    const result = tokenizeTask('a b fix auth');
    expect(result).not.toContain('b');
    expect(result).toContain('auth');
  });
});

describe('selectFilesForTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array for empty task', async () => {
    const { selectFilesForTask: sel } = await import('../../src/intelligence/task-selector.js');
    const result = sel('/tmp/root', '');
    expect(result).toEqual([]);
  });

  it('returns empty array for task with only stop words', async () => {
    const { selectFilesForTask: sel } = await import('../../src/intelligence/task-selector.js');
    const result = sel('/tmp/root', 'add the fix to');
    expect(result).toEqual([]);
  });

  it('returns sorted results descending by score', async () => {
    const { createSearchIndex } = await import('../../src/intelligence/search.js');
    vi.mocked(createSearchIndex).mockReturnValue({
      search: vi.fn(() => [
        { path: 'src/a.ts', score: -2.0, language: 'typescript', tokens: 100, snippet: '', line: 1 },
        { path: 'src/b.ts', score: -5.0, language: 'typescript', tokens: 200, snippet: '', line: 1 },
        { path: 'src/c.ts', score: -1.0, language: 'typescript', tokens: 150, snippet: '', line: 1 },
      ]),
      close: vi.fn(),
      rebuild: vi.fn(() => ({ files: 0, duration: 0 })),
    });

    const { selectFilesForTask: sel } = await import('../../src/intelligence/task-selector.js');
    const result = sel('/tmp/root', 'stripe webhook payment');

    // Should be sorted descending by score
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].score).toBeGreaterThanOrEqual(result[i + 1].score);
    }
  });

  it('bm25 seed files have reason bm25', async () => {
    const { createSearchIndex } = await import('../../src/intelligence/search.js');
    vi.mocked(createSearchIndex).mockReturnValue({
      search: vi.fn(() => [
        { path: 'src/stripe.ts', score: -1.0, language: 'typescript', tokens: 100, snippet: '', line: 1 },
        { path: 'src/webhook.ts', score: -2.0, language: 'typescript', tokens: 100, snippet: '', line: 1 },
        { path: 'src/payment.ts', score: -3.0, language: 'typescript', tokens: 100, snippet: '', line: 1 },
      ]),
      close: vi.fn(),
      rebuild: vi.fn(() => ({ files: 0, duration: 0 })),
    });

    const { selectFilesForTask: sel } = await import('../../src/intelligence/task-selector.js');
    const result = sel('/tmp/root', 'stripe webhook payment');
    const bm25Files = result.filter(f => f.reason === 'bm25');
    expect(bm25Files.length).toBe(3);
  });

  it('import-expanded files have reason import', async () => {
    const { createSearchIndex } = await import('../../src/intelligence/search.js');
    const { buildImportGraph } = await import('../../src/intelligence/imports.js');

    vi.mocked(createSearchIndex).mockReturnValue({
      search: vi.fn(() => [
        { path: 'src/stripe.ts', score: -1.0, language: 'typescript', tokens: 100, snippet: '', line: 1 },
        { path: 'src/webhook.ts', score: -2.0, language: 'typescript', tokens: 100, snippet: '', line: 1 },
        { path: 'src/payment.ts', score: -3.0, language: 'typescript', tokens: 100, snippet: '', line: 1 },
      ]),
      close: vi.fn(),
      rebuild: vi.fn(() => ({ files: 0, duration: 0 })),
    });

    // stripe.ts imports utils.ts
    vi.mocked(buildImportGraph).mockReturnValue(
      new Map([['src/stripe.ts', new Set(['src/utils.ts'])]])
    );

    const { selectFilesForTask: sel } = await import('../../src/intelligence/task-selector.js');
    const result = sel('/tmp/root', 'stripe webhook payment');
    const importFile = result.find(f => f.relativePath === 'src/utils.ts');
    expect(importFile).toBeDefined();
    expect(importFile?.reason).toBe('import');
  });

  it('does not throw when search index throws — returns empty array', async () => {
    const { createSearchIndex } = await import('../../src/intelligence/search.js');
    vi.mocked(createSearchIndex).mockImplementation(() => {
      throw new Error('search.db not found');
    });

    const { selectFilesForTask: sel } = await import('../../src/intelligence/task-selector.js');
    // Should not throw — symbol fallback kicks in, then returns empty if no matches
    expect(() => sel('/tmp/root', 'stripe webhook')).not.toThrow();
  });
});

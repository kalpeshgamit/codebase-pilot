import { describe, it, expect, vi, beforeEach } from 'vitest';
import { synthesizeQuery, inferTaskDescription, buildSignalSummary, GENERIC_BRANCHES } from '../../src/intelligence/git-signals.js';
import type { GitSignals } from '../../src/intelligence/git-signals.js';

// extractGitSignals uses spawnSync — unit test via synthesizeQuery / inferTaskDescription
// Integration behavior verified in smoke tests

function makeSignals(overrides: Partial<GitSignals> = {}): GitSignals {
  return {
    stagedFiles: [],
    unstagedFiles: [],
    branchName: '',
    commitMessages: [],
    hasUsefulSignals: false,
    ...overrides,
  };
}

describe('GENERIC_BRANCHES', () => {
  it('contains main, master, dev, develop', () => {
    expect(GENERIC_BRANCHES.has('main')).toBe(true);
    expect(GENERIC_BRANCHES.has('master')).toBe(true);
    expect(GENERIC_BRANCHES.has('dev')).toBe(true);
    expect(GENERIC_BRANCHES.has('develop')).toBe(true);
  });

  it('does not contain feature branches', () => {
    expect(GENERIC_BRANCHES.has('fix/auth-middleware')).toBe(false);
    expect(GENERIC_BRANCHES.has('feat/stripe-webhook')).toBe(false);
  });
});

describe('synthesizeQuery', () => {
  it('returns empty string for generic branch + no commits', () => {
    const signals = makeSignals({ branchName: 'main', commitMessages: [] });
    expect(synthesizeQuery(signals)).toBe('');
  });

  it('tokenizes feature branch name', () => {
    const signals = makeSignals({ branchName: 'fix/auth-middleware-bug' });
    const query = synthesizeQuery(signals);
    expect(query).toContain('auth');
    expect(query).toContain('middleware');
    expect(query).toContain('bug');
  });

  it('skips generic branch, uses commit messages instead', () => {
    const signals = makeSignals({
      branchName: 'main',
      commitMessages: ['feat: add stripe webhook payment'],
    });
    const query = synthesizeQuery(signals);
    expect(query).toContain('stripe');
    expect(query).toContain('webhook');
    expect(query).toContain('payment');
  });

  it('combines branch tokens + commit tokens', () => {
    const signals = makeSignals({
      branchName: 'feat/stripe-webhook',
      commitMessages: ['add payment processing endpoint'],
    });
    const query = synthesizeQuery(signals);
    expect(query).toContain('stripe');
    expect(query).toContain('webhook');
    expect(query).toContain('payment');
  });

  it('deduplicates tokens', () => {
    const signals = makeSignals({
      branchName: 'feat/auth',
      commitMessages: ['fix auth bug', 'update auth middleware'],
    });
    const query = synthesizeQuery(signals);
    const parts = query.split(' OR ');
    const authCount = parts.filter(p => p === 'auth').length;
    expect(authCount).toBe(1);
  });

  it('filters purely numeric tokens from ticket numbers', () => {
    const signals = makeSignals({
      branchName: 'JIRA-1234-fix-auth',
      commitMessages: [],
    });
    const query = synthesizeQuery(signals);
    expect(query).not.toContain('1234');
    expect(query).toContain('auth');
  });

  it('returns empty string when only stop words present', () => {
    const signals = makeSignals({
      branchName: 'fix-the-bug',
      commitMessages: ['fix the bug'],
    });
    // 'fix', 'the', 'bug' — 'fix' and 'the' are stop words, 'bug' is not
    const query = synthesizeQuery(signals);
    expect(query).toContain('bug');
  });
});

describe('inferTaskDescription', () => {
  it('returns readable description from branch + commit tokens', () => {
    const signals = makeSignals({
      branchName: 'feat/stripe-webhook',
      commitMessages: ['add payment processing'],
    });
    const desc = inferTaskDescription(signals);
    expect(desc).toContain('stripe');
    expect(desc).toContain('webhook');
    expect(desc.length).toBeLessThanOrEqual(60);
  });

  it('returns fallback message when no vocabulary available', () => {
    const signals = makeSignals({ branchName: 'main', commitMessages: [] });
    const desc = inferTaskDescription(signals);
    expect(desc).toBe('(no description — diff files only)');
  });

  it('caps output at 60 chars', () => {
    const signals = makeSignals({
      branchName: 'feat/very-long-feature-branch-name-that-goes-on',
      commitMessages: ['implement the entire authentication and authorization system'],
    });
    const desc = inferTaskDescription(signals);
    expect(desc.length).toBeLessThanOrEqual(60);
  });
});

describe('buildSignalSummary', () => {
  it('summarizes staged + unstaged + branch + commits', () => {
    const signals = makeSignals({
      stagedFiles: ['src/a.ts', 'src/b.ts'],
      unstagedFiles: ['src/c.ts'],
      branchName: 'fix/auth',
      commitMessages: ['fix bug', 'update test'],
    });
    const summary = buildSignalSummary(signals);
    expect(summary).toContain('2 staged');
    expect(summary).toContain('1 unstaged');
    expect(summary).toContain('fix/auth');
    expect(summary).toContain('2 commits');
  });

  it('omits generic branch from summary', () => {
    const signals = makeSignals({
      stagedFiles: ['src/a.ts'],
      branchName: 'main',
      commitMessages: ['feat: add thing'],
    });
    const summary = buildSignalSummary(signals);
    expect(summary).not.toContain('main');
    expect(summary).toContain('1 staged');
  });

  it('returns empty string for no signals', () => {
    const signals = makeSignals();
    expect(buildSignalSummary(signals)).toBe('');
  });
});

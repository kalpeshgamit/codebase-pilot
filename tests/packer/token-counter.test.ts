import { describe, it, expect } from 'vitest';
import { countTokens, formatTokenCount } from '../../src/packer/token-counter.js';

describe('countTokens', () => {
  it('estimates tokens from text length', () => {
    const text = 'a'.repeat(100);
    expect(countTokens(text)).toBe(25);
  });

  it('returns 0 for empty string', () => {
    expect(countTokens('')).toBe(0);
  });

  it('handles real code', () => {
    const code = 'export function hello(): string {\n  return "world";\n}';
    const tokens = countTokens(code);
    expect(tokens).toBeGreaterThan(10);
    expect(tokens).toBeLessThan(30);
  });
});

describe('formatTokenCount', () => {
  it('formats small numbers without comma', () => {
    expect(formatTokenCount(42)).toBe('42');
  });

  it('formats thousands with comma', () => {
    expect(formatTokenCount(15234)).toBe('15,234');
  });

  it('formats millions', () => {
    expect(formatTokenCount(1234567)).toBe('1,234,567');
  });
});

import { describe, it, expect } from 'vitest';
import { toPosix } from '../src/utils.js';

describe('toPosix', () => {
  it('converts backslashes to forward slashes', () => {
    expect(toPosix('src\\types\\')).toBe('src/types/');
  });

  it('leaves forward slashes unchanged', () => {
    expect(toPosix('src/types/')).toBe('src/types/');
  });

  it('handles mixed separators', () => {
    expect(toPosix('packages\\api/src')).toBe('packages/api/src');
  });

  it('handles empty string', () => {
    expect(toPosix('')).toBe('');
  });
});

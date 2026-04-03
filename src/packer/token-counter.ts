/**
 * Estimate token count from text.
 * Uses ~4 characters per token heuristic.
 * Accurate within ~10% for English text and code.
 */
export function countTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Format a number with comma separators.
 * 15234 → "15,234"
 */
export function formatTokenCount(n: number): string {
  return n.toLocaleString('en-US');
}

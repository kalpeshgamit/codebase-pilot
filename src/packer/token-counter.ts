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

/**
 * Estimate cost in USD for a given token count.
 * Default: Claude Sonnet input pricing ($3/1M tokens).
 * Returns formatted string like "$0.26" or "$4.30".
 */
export function estimateCost(tokens: number, pricePerMillion = 3): string {
  const cost = (tokens / 1_000_000) * pricePerMillion;
  if (cost < 0.01) return '<$0.01';
  return '$' + cost.toFixed(2);
}

/**
 * AI model pricing per 1M input tokens (USD).
 */
export const MODEL_PRICING: Record<string, number> = {
  'claude-sonnet': 3,
  'claude-opus': 15,
  'claude-haiku': 0.25,
  'gpt-4o': 2.5,
  'gpt-4': 30,
  'default': 3,
};

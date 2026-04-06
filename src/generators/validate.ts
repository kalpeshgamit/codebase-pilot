import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate generated config files before writing.
 * Prevents issues like #97, #64, #32, #25, #23 in code-review-graph
 * where invalid hooks/settings were written and reported 4+ times.
 */

// Valid Claude Code hook events (as of 2026)
const VALID_HOOK_EVENTS = new Set([
  'PreToolUse',
  'PostToolUse',
  'Notification',
  'Stop',
]);

// Valid Claude Code tool names for hooks
const VALID_HOOK_TOOLS = new Set([
  'Bash',
  'Read',
  'Write',
  'Edit',
  'Glob',
  'Grep',
  'Agent',
  'WebFetch',
  'WebSearch',
  'NotebookEdit',
]);

export function validateHooksJson(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const parsed = JSON.parse(content);

    // Must have hooks array or be an object with event keys
    if (typeof parsed !== 'object' || parsed === null) {
      errors.push('Hooks config must be a JSON object');
      return { valid: false, errors, warnings };
    }

    // Check for common mistakes
    if (Array.isArray(parsed)) {
      errors.push('Hooks config must be an object, not an array');
      return { valid: false, errors, warnings };
    }

    // Validate each hook entry
    for (const [event, hooks] of Object.entries(parsed)) {
      if (!VALID_HOOK_EVENTS.has(event)) {
        errors.push(`Invalid hook event "${event}". Valid events: ${[...VALID_HOOK_EVENTS].join(', ')}`);
      }

      if (!Array.isArray(hooks)) {
        errors.push(`Hook "${event}" must be an array of hook definitions`);
        continue;
      }

      for (const hook of hooks as any[]) {
        if (!hook.matcher && !hook.command) {
          warnings.push(`Hook in "${event}" has no matcher or command`);
        }
        if (hook.command && typeof hook.command !== 'string') {
          errors.push(`Hook command in "${event}" must be a string`);
        }
      }
    }
  } catch {
    errors.push('Invalid JSON');
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateAgentsJson(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const parsed = JSON.parse(content);

    if (!parsed.version) warnings.push('Missing "version" field');
    if (!parsed.project) warnings.push('Missing "project" field');

    if (!parsed.agents || typeof parsed.agents !== 'object') {
      errors.push('Missing or invalid "agents" object');
      return { valid: false, errors, warnings };
    }

    const validModels = new Set(['opus', 'sonnet', 'haiku']);

    for (const [name, agent] of Object.entries(parsed.agents)) {
      const a = agent as any;
      if (!a.name) errors.push(`Agent "${name}": missing "name" field`);
      if (!a.model) {
        errors.push(`Agent "${name}": missing "model" field`);
      } else if (!validModels.has(a.model)) {
        errors.push(`Agent "${name}": invalid model "${a.model}". Use: opus, sonnet, haiku`);
      }
      if (!Array.isArray(a.context)) {
        errors.push(`Agent "${name}": "context" must be an array of paths`);
      }
      if (typeof a.layer !== 'number') {
        warnings.push(`Agent "${name}": missing "layer" number`);
      }
    }

    if (parsed.patterns && typeof parsed.patterns === 'object') {
      for (const [pattern, agents] of Object.entries(parsed.patterns)) {
        if (!Array.isArray(agents)) {
          errors.push(`Pattern "${pattern}": must be an array of agent names`);
        } else {
          for (const agentName of agents as string[]) {
            if (!parsed.agents[agentName]) {
              warnings.push(`Pattern "${pattern}" references unknown agent "${agentName}"`);
            }
          }
        }
      }
    }
  } catch {
    errors.push('Invalid JSON');
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateClaudeMd(content: string): ValidationResult {
  const warnings: string[] = [];

  if (content.length < 50) {
    warnings.push('CLAUDE.md seems too short (< 50 chars)');
  }
  if (content.length > 50000) {
    warnings.push('CLAUDE.md is very large (> 50K chars) — may impact prompt cache');
  }
  if (!content.includes('#')) {
    warnings.push('CLAUDE.md has no markdown headings');
  }

  return { valid: true, errors: [], warnings };
}

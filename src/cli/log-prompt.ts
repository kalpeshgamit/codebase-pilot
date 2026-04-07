#!/usr/bin/env node
// Hook script for Claude Code UserPromptSubmit — logs actual prompts.
// Called via stdin JSON: { prompt, session_id, cwd, hook_event_name }
// Writes to ~/.codebase-pilot/prompts.jsonl
// NOTE: No child_process import — reads .git/HEAD directly for branch name.

import { appendFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { homedir } from 'node:os';

function getGitBranch(cwd: string): string | undefined {
  try {
    // Read .git/HEAD directly — no child_process needed
    const head = readFileSync(join(cwd, '.git', 'HEAD'), 'utf8').trim();
    if (head.startsWith('ref: refs/heads/')) return head.slice(16);
    return head.slice(0, 8); // detached HEAD — return short hash
  } catch { return undefined; }
}

async function main() {
  // Read hook data from stdin
  let input = '';
  for await (const chunk of process.stdin) input += chunk;

  let data: { prompt?: string; session_id?: string; cwd?: string };
  try {
    data = JSON.parse(input);
  } catch {
    process.exit(0);
    return;
  }

  const prompt = data.prompt;
  if (!prompt || prompt.trim().length === 0) { process.exit(0); return; }

  const cwd = data.cwd || process.cwd();
  const project = basename(cwd);
  const branch = getGitBranch(cwd);

  const entry = {
    date: new Date().toISOString(),
    type: 'prompt',
    project,
    projectPath: cwd,
    sessionId: data.session_id,
    prompt: prompt.slice(0, 2000), // cap at 2000 chars
    promptLength: prompt.length,
    branch,
  };

  const dir = join(homedir(), '.codebase-pilot');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  appendFileSync(join(dir, 'prompts.jsonl'), JSON.stringify(entry) + '\n', 'utf8');

  // Allow the prompt to proceed
  process.exit(0);
}

main();

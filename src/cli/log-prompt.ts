#!/usr/bin/env node
// Hook script for Claude Code UserPromptSubmit — logs actual prompts.
// Called via stdin JSON: { prompt, session_id, cwd, hook_event_name }
// Writes to ~/.codebase-pilot/prompts.jsonl

import { appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';

function getGitBranch(cwd: string): string | undefined {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000 }).trim();
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

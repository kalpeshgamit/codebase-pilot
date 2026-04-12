# Slash Commands Design — Professional Refactor

**Date:** 2026-04-10
**Status:** Approved

## Problem

The 21 project-level slash commands in `.claude/commands/` were written with inconsistent tone, variable depth, and no standard structure. Some had imperative steps, some had prose descriptions, none had a persona line or defined output format.

## Design

### Template

```
You are a senior engineer on a codebase-pilot project.

<Verb phrase>: $ARGUMENTS

Steps:
1. <imperative action>
2. <imperative action>
3. <imperative action>

Output: <deliverable>
Note: <hard constraint> (only when essential)
```

### Rules

- **Persona line** — identical across all 21 commands
- **Objective** — one sharp verb phrase + `$ARGUMENTS`
- **Steps** — 2–5, imperative, no filler words
- **Output** — one line naming the deliverable
- **Note** — hard constraint only (e.g. "no fix before root cause"), omitted when not essential
- **CLI commands** — written inline in the step that uses them

### Command Categories

| Category | Commands | Step count |
|----------|----------|------------|
| Tools | pack-context, scan-secrets, impact-analysis, token-budget, pilot-check | 3 steps |
| Workflow | thinking, writing-plans, executing-plans, TDD, debugging | 4–5 steps |
| Agent ops | dispatch, sync-agents, healthcheck, subagent-driven-development | 3–4 steps |
| Review cycle | requesting-code-review, receiving-code-review, finishing-a-branch, verification | 3 steps |
| Meta | codebase-pilot (root), writing-skills, using-git-worktrees | 3 steps |

## Files

All commands live in `.claude/commands/codebase-pilot:*.md` plus `codebase-pilot.md` (root session-start).

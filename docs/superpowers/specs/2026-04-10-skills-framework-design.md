# Design Spec: codebase-pilot Skills Framework
# (superpowers plugin replacement)

Date: 2026-04-10
Status: Approved

---

## Problem

codebase-pilot currently depends on the `superpowers` plugin for 14 workflow skills
(brainstorming, TDD, debugging, planning, etc.). This creates an external dependency
that users must install separately. The goal is to own these skills natively inside
codebase-pilot so users get one plugin, zero external dependencies, and a tighter
integration with codebase-pilot tooling.

---

## Goal

Port all 14 superpowers skills into `plugin/skills/` under the `codebase-pilot:`
namespace. After implementation, users uninstall superpowers and use codebase-pilot
exclusively.

---

## Plugin Structure

```
plugin/
  .claude-plugin/
    plugin.json           ← add 14 new skill entries
    CLAUDE.md             ← update Available Skills section
  skills/
    # EXISTING (unchanged)
    pilot-check/
    pack-context/
    scan-secrets/
    impact-analysis/
    token-budget/

    # NEW — ported from superpowers
    using-codebase-pilot/         ← replaces superpowers:using-superpowers (full rewrite)
    brainstorming/                ← copy + integrate pilot pack-context
    writing-plans/                ← copy + reference agents.json
    executing-plans/              ← copy + namespace swap
    test-driven-development/      ← copy + namespace swap
    systematic-debugging/         ← copy + integrate pilot impact-analysis
    subagent-driven-development/  ← copy + integrate agents.json dispatch
    dispatching-parallel-agents/  ← copy + reference agents.json patterns
    finishing-a-development-branch/ ← copy + namespace swap
    requesting-code-review/       ← copy + namespace swap
    receiving-code-review/        ← copy + namespace swap
    verification-before-completion/ ← copy + namespace swap
    using-git-worktrees/          ← copy + namespace swap
    writing-skills/               ← copy + namespace swap
```

No TypeScript changes required. Skills are pure markdown — zero build step.

---

## Skill Porting Tiers

### Tier 1 — Namespace swap only (7 skills)

Copy SKILL.md verbatim, replace all `superpowers:` references with `codebase-pilot:`.

| Skill | Source |
|---|---|
| `executing-plans` | superpowers:executing-plans |
| `finishing-a-development-branch` | superpowers:finishing-a-development-branch |
| `receiving-code-review` | superpowers:receiving-code-review |
| `requesting-code-review` | superpowers:requesting-code-review |
| `verification-before-completion` | superpowers:verification-before-completion |
| `using-git-worktrees` | superpowers:using-git-worktrees |
| `writing-skills` | superpowers:writing-skills |

### Tier 2 — Copy + codebase-pilot integration (5 skills)

Copy SKILL.md then add codebase-pilot-specific hooks:

| Skill | Integration |
|---|---|
| `brainstorming` | Add: use `pilot pack-context` to load project context before design questions |
| `writing-plans` | Add: reference `agents.json` for agent boundaries when writing tasks |
| `test-driven-development` | Add: use `pilot impact-analysis` to scope test coverage |
| `systematic-debugging` | Add: use `pilot impact-analysis` to trace blast radius of bug |
| `dispatching-parallel-agents` | Add: read `agents.json` patterns for agent boundaries |

### Tier 3 — Full rewrite (2 skills)

| Skill | Reason |
|---|---|
| `using-codebase-pilot` | Replaces `using-superpowers` — full rewrite for codebase-pilot context, MCP tools, hooks, commands |
| `subagent-driven-development` | Deep integration with `agents.json` dispatch patterns and layer ordering |

---

## plugin.json Updates

Add 14 skill entries to `plugin/.claude-plugin/plugin.json`:

```json
{
  "skills": [
    { "name": "using-codebase-pilot", "path": "skills/using-codebase-pilot/SKILL.md" },
    { "name": "brainstorming", "path": "skills/brainstorming/SKILL.md" },
    { "name": "writing-plans", "path": "skills/writing-plans/SKILL.md" },
    { "name": "executing-plans", "path": "skills/executing-plans/SKILL.md" },
    { "name": "test-driven-development", "path": "skills/test-driven-development/SKILL.md" },
    { "name": "systematic-debugging", "path": "skills/systematic-debugging/SKILL.md" },
    { "name": "subagent-driven-development", "path": "skills/subagent-driven-development/SKILL.md" },
    { "name": "dispatching-parallel-agents", "path": "skills/dispatching-parallel-agents/SKILL.md" },
    { "name": "finishing-a-development-branch", "path": "skills/finishing-a-development-branch/SKILL.md" },
    { "name": "requesting-code-review", "path": "skills/requesting-code-review/SKILL.md" },
    { "name": "receiving-code-review", "path": "skills/receiving-code-review/SKILL.md" },
    { "name": "verification-before-completion", "path": "skills/verification-before-completion/SKILL.md" },
    { "name": "using-git-worktrees", "path": "skills/using-git-worktrees/SKILL.md" },
    { "name": "writing-skills", "path": "skills/writing-skills/SKILL.md" }
  ]
}
```

---

## Architecture Impact

No changes to `src/`. Skills are static markdown, no TypeScript.

`ARCHITECTURE.md` gets one new section:

```
plugin/skills/      — 19 skills total (5 existing + 14 new workflow skills)
                      Pure markdown, zero build step, loaded by Claude Code harness
```

---

## README Updates (post-implementation)

1. Add **"Built-in Skills"** section listing all 19 skills with one-line descriptions
2. Update **"Getting Started"** — remove superpowers install step
3. Add migration note: "Already using superpowers? Uninstall it — codebase-pilot now includes all workflow skills"
4. Update marketplace badge version

---

## Migration Path for Existing Users

```
# Before
mcphub install superpowers
mcphub install codebase-pilot

# After
mcphub install codebase-pilot   ← one install, everything included
```

Superpowers uninstall is safe — all skill references update from `superpowers:` to `codebase-pilot:` namespace.

---

## Success Criteria

- All 14 skills present under `plugin/skills/`
- All registered in `plugin.json`
- All skill cross-references use `codebase-pilot:` namespace (zero `superpowers:` references)
- Tier 2/3 skills reference codebase-pilot tools where relevant
- superpowers plugin uninstalled from this project
- ARCHITECTURE.md updated
- README.md updated
- Version bumped (v1.1.0)

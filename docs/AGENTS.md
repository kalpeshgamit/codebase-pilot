# Agent System

## How Agents Are Generated

codebase-pilot scans your project and maps detected packages to focused agents:

| Package Type | Agent Created | Model | Layer |
|---|---|---|---|
| Database/schema | `schema-agent` | haiku | L1 |
| Types directory | `types-agent` | haiku | L1 |
| API routes | `*-api-agent` | sonnet | L2 |
| Complex async (SSE, WS) | `gateway-agent` | opus | L2 |
| Plugin/extension | `*-plugin-agent` | sonnet | L2 |
| CLI/commands | `*-cli-agent` | haiku | L2 |
| Web frontend | `*-ui-agent` | haiku | L3 |
| Shared library | `*-lib-agent` | haiku | L1 |
| Always created | `standards-agent` | opus | L4 |
| Always created | `supervisor-agent` | opus | L5 |
| Always created | `docs-agent` | haiku | L6 |
| Always created | `healthcheck-agent` | haiku | L0 |

## Layer Execution Order

```
L0: healthcheck (pre-flight, read-only)
L1: foundation agents (sequential where dependent)
L2: logic agents (parallel where independent)
L3: presentation agents (parallel, after L2)
L4: standards-agent — reviews CODE quality (SOLID, naming, structure)
L5: supervisor-agent — reviews AGENT behavior (boundaries, handoffs)
L6: docs-agent — documentation (runs last)
```

## Model Assignment Logic

| Model | When Used | Cost |
|---|---|---|
| **opus** | Complex reasoning: orchestration, MCP gateway, architecture review | 3x |
| **sonnet** | Structured logic: API routes, plugin scaffolding | 1x |
| **haiku** | Mechanical work: schema edits, types, CLI, React pages, docs | 0.2x |

## Dispatch Patterns

Auto-generated based on detected packages:

```
/dispatch new-feature    — foundation + API + frontend + gates
/dispatch api-feature    — foundation + API + gates
/dispatch ui-feature     — frontend + gates
/dispatch cli-command    — CLI + gates
/dispatch new-plugin     — plugin + gates + docs
/dispatch full-feature   — all agents
```

## Handoff Contract

Agents pass minimal typed snippets between layers — never full files:

```
schema-agent  →  { table, columns }          (5-10 lines)
types-agent   →  { interfaces }              (10-20 lines)
api-agent     →  { routes, controller_file } (5-10 lines)
```

## Standards Agent — What It Reviews

- Single Responsibility: one file = one concern
- Open/Closed: extend via config, not modification
- Liskov Substitution: interfaces are substitutable
- Interface Segregation: no bloated interfaces
- Dependency Inversion: depend on abstractions
- File structure: correct package, clean exports, kebab-case
- Project rules: from CLAUDE.md

## Supervisor Agent — What It Audits

- Context boundary: did agent only read its allowed paths?
- Write boundary: did agent only write within its package?
- Handoff contract: did agent use typed snippets, not full files?
- Layer ordering: did L3 wait for L2 to complete?
- Model appropriateness: was haiku used for complex reasoning?

## Healthcheck

Run before any dispatch:

```
/healthcheck
```

Validates:
- All agents defined
- All context paths exist in filesystem
- Dependency chain has no cycles
- Layer ordering is correct
- Model assignments are optimal

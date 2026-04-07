---
name: impact-analysis
description: Analyzes the blast radius of a file change — finds all dependents, transitive imports, affected tests, and risk score. Best before modifying shared files like types, utilities, or core modules.
---

# Impact Analysis (Blast Radius)

Trace the impact of changing any file across the codebase.

## Usage

```bash
codebase-pilot impact --file <path>
```

## Example

```bash
codebase-pilot impact --file src/types.ts
```

Output:
```
Risk: HIGH (53/100)

Direct dependents (18):
  src/agents/generator.ts
  src/mcp/server.ts
  ...

Affected tests (5):
  tests/agents/generator.test.ts
  tests/cli/pack.test.ts
  ...

Total affected: 27 files
```

## Usage Scenarios
- Before modifying a shared type definition or utility
- Before refactoring a core module
- To understand the scope of a bug fix
- During code review — check if a change is high-risk

## Risk Levels
- **Low** (0-25): Isolated change, few dependents
- **Medium** (26-50): Multiple dependents, some test coverage
- **High** (51-75): Many dependents, potential gaps in tests
- **Critical** (76-100): Core file, affects most of codebase

## Tips
- Combine with `--prune` for pack: `codebase-pilot pack --compress --prune <file>` packs only reachable files
- Web dashboard has interactive impact view: `http://localhost:7456/impact?file=<path>`

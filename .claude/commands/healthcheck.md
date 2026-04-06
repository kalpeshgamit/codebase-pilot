Run an orchestration healthcheck for this project:

1. Read .codebase-pilot/agents.json
2. For each agent, verify:
   - Context paths exist (glob the filesystem)
   - Dependency chain is valid (no cycles, no missing agents)
   - Layer ordering is correct
   - Model assignment matches task complexity
3. Output a health report — DO NOT write any files or make any changes.
4. If any issues found, list them with severity and recommended fix.

Format:
```
AGENTS (X/Y)                    status
CONTEXT PATHS                   status
DEPENDENCY CHAIN                status
LAYER ORDERING                  status
MODEL ASSIGNMENT                status
ISSUES: N
STATUS: HEALTHY/UNHEALTHY
```

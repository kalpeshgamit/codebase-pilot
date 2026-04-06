Break this into sub-agents using .codebase-pilot/agents.json

Pattern: $ARGUMENTS

Available patterns:
- `cli-command` — codebase-pilot-cli-agent, standards-agent, supervisor-agent
- `full-feature` — codebase-pilot-cli-agent, types-agent, standards-agent, supervisor-agent, docs-agent

Instructions:
1. Read .codebase-pilot/agents.json
2. Find the pattern matching the first argument
3. Run healthcheck first (verify context paths exist)
4. Spawn agents in layer order:
   - L1 agents first (sequential if dependent)
   - L2 agents in parallel where independent
   - L3 agents in parallel after L2 completes
   - L4 standards-agent reviews all code output
   - L5 supervisor-agent audits agent behavior
   - L6 docs-agent writes documentation (if in pattern)
5. Each agent receives only its context paths — no full file reads
6. Pass minimal typed snippets between agents (5-20 lines, not full files)

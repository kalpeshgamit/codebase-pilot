import { resolve, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { detect } from '../scanner/detector.js';
import { packProject } from '../packer/index.js';
import { collectFiles } from '../packer/collector.js';
import { countTokens, formatTokenCount } from '../packer/token-counter.js';
import { scanForSecrets } from '../security/scanner.js';
import { readPackLogs, getStats, logPackRun, getGitContext } from '../packer/usage-logger.js';
import { basename } from 'node:path';
import type { AgentsConfig, HealthCheckResult } from '../types.js';

// ---------------------------------------------------------------------------
// MCP protocol types (minimal, inline — zero external deps)
// ---------------------------------------------------------------------------

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

interface McpPrompt {
  name: string;
  description: string;
  arguments?: Array<{ name: string; description: string; required?: boolean }>;
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS: McpTool[] = [
  {
    name: 'scan_project',
    description: 'Run project detection — returns languages, frameworks, database, test runner, and package structure.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'pack_codebase',
    description: 'Pack the codebase into a single XML or Markdown file for AI consumption.',
    inputSchema: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['xml', 'md'], description: 'Output format (default: xml)' },
        compress: { type: 'boolean', description: 'Compress code by extracting signatures and folding bodies' },
        agent: { type: 'string', description: 'Pack only files in this agent context' },
        noSecurity: { type: 'boolean', description: 'Skip secret detection' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'count_tokens',
    description: 'Count tokens per file with savings estimate. Returns sorted file list with token counts.',
    inputSchema: {
      type: 'object',
      properties: {
        sort: { type: 'string', enum: ['size', 'name'], description: 'Sort order (default: size)' },
        limit: { type: 'number', description: 'Max files to return (default: 20)' },
        agent: { type: 'string', description: 'Count tokens for a specific agent context' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'health_check',
    description: 'Validate agent orchestration setup — checks context paths, dependency chains, and layer ordering.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'scan_secrets',
    description: 'Scan a specific file for hardcoded secrets and credentials.',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Relative path to the file to scan' },
      },
      required: ['file'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_agents',
    description: 'List all agents from agents.json with their context paths, models, and layers.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'get_agent',
    description: 'Get full details of a specific agent by name.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Agent name (key in agents.json)' },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'detect_languages',
    description: 'Return language breakdown of the project with percentages and file counts.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'get_savings',
    description: 'Return token savings stats from usage-log.jsonl (today, last 7 days, all time).',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'list_files',
    description: 'List files that would be packed, with per-file token counts.',
    inputSchema: {
      type: 'object',
      properties: {
        agent: { type: 'string', description: 'Limit to files in this agent context' },
        limit: { type: 'number', description: 'Max files to return (default: 50)' },
      },
      additionalProperties: false,
    },
  },
];

// ---------------------------------------------------------------------------
// Prompt definitions
// ---------------------------------------------------------------------------

const PROMPTS: McpPrompt[] = [
  {
    name: 'review',
    description: 'Review the codebase changes and suggest improvements.',
    arguments: [
      { name: 'focus', description: 'Area to focus on (e.g. security, performance, architecture)', required: false },
    ],
  },
  {
    name: 'onboard',
    description: 'Explain the project structure and key files for a new developer.',
    arguments: [
      { name: 'role', description: 'Developer role (e.g. frontend, backend, fullstack)', required: false },
    ],
  },
  {
    name: 'optimize',
    description: 'Analyze token usage and suggest optimizations to reduce context size.',
    arguments: [
      { name: 'agent', description: 'Agent name to optimize for', required: false },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadAgentsConfig(root: string): AgentsConfig | null {
  const agentsPath = join(root, '.codebase-pilot', 'agents.json');
  if (!existsSync(agentsPath)) return null;
  try {
    return JSON.parse(readFileSync(agentsPath, 'utf8')) as AgentsConfig;
  } catch {
    return null;
  }
}

function runHealthCheck(root: string): HealthCheckResult[] {
  const config = loadAgentsConfig(root);
  if (!config) return [{ agent: '-', check: 'config', status: 'fail', detail: 'No agents.json found', fix: 'Run "codebase-pilot init"' }];

  const results: HealthCheckResult[] = [];
  const agents = Object.values(config.agents);
  const agentNames = Object.keys(config.agents);

  for (const agent of agents) {
    for (const ctxPath of agent.context) {
      if (ctxPath === 'ALL agent outputs' || ctxPath === 'Agent execution logs' || ctxPath.startsWith('.codebase-pilot/')) continue;
      const fullPath = join(root, ctxPath);
      const exists = existsSync(fullPath);
      results.push({
        agent: agent.name,
        check: 'context_path',
        status: exists ? 'pass' : 'fail',
        detail: exists ? ctxPath : `${ctxPath} NOT FOUND`,
        fix: exists ? undefined : 'Update context path or run "codebase-pilot fix"',
      });
    }
  }

  for (const agent of agents) {
    for (const dep of agent.dependsOn) {
      if (dep === 'ALL previous layers' || dep === 'standards-agent') continue;
      if (!agentNames.includes(dep)) {
        results.push({
          agent: agent.name,
          check: 'dependency',
          status: 'fail',
          detail: `Depends on "${dep}" which does not exist`,
          fix: 'Remove or update dependency in agents.json',
        });
      }
    }
  }

  for (const agent of agents) {
    for (const dep of agent.dependsOn) {
      if (dep === 'ALL previous layers' || dep === 'standards-agent') continue;
      const depAgent = config.agents[dep];
      if (depAgent && depAgent.layer > agent.layer) {
        results.push({
          agent: agent.name,
          check: 'layer_ordering',
          status: 'fail',
          detail: `L${agent.layer} depends on "${dep}" at L${depAgent.layer}`,
          fix: 'Fix layer assignment — dependencies must be in lower layers',
        });
      }
    }
  }

  return results;
}

function getAgentContextPaths(root: string, agentName: string): string[] | null {
  const config = loadAgentsConfig(root);
  if (!config) return null;
  const agent = config.agents[agentName];
  if (!agent) return null;
  return agent.context;
}

// ---------------------------------------------------------------------------
// Tool call handler
// ---------------------------------------------------------------------------

async function handleToolCall(root: string, name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'scan_project': {
      const scan = await detect(root);
      return {
        name: scan.name,
        type: scan.type,
        languages: scan.languages,
        framework: scan.framework,
        database: scan.database,
        testRunner: scan.testRunner,
        packages: scan.packages,
      };
    }

    case 'pack_codebase': {
      const format = (args.format as 'xml' | 'md') ?? 'xml';
      const compress = (args.compress as boolean) ?? false;
      const agent = args.agent as string | undefined;
      const noSecurity = (args.noSecurity as boolean) ?? false;
      const packStart = Date.now();
      const result = packProject({ dir: root, format, compress, agent, noSecurity });
      const git = getGitContext(root);

      // Track MCP tool calls for the Prompts page
      logPackRun(root, {
        date: new Date().toISOString(),
        project: basename(root),
        projectPath: root,
        tokensRaw: result.rawTokens,
        tokensPacked: result.totalTokens,
        files: result.fileCount,
        agent,
        compressed: compress,
        command: 'mcp:pack_codebase',
        branch: git.branch,
        commit: git.commit,
        commitHash: git.commitHash,
        dirty: git.dirty,
        duration: Date.now() - packStart,
      });

      return {
        fileCount: result.fileCount,
        totalTokens: result.totalTokens,
        rawTokens: result.rawTokens,
        compressionRatio: result.compressionRatio,
        skippedFiles: result.skippedFiles,
        output: result.output,
      };
    }

    case 'count_tokens': {
      const sort = (args.sort as 'size' | 'name') ?? 'size';
      const limit = (args.limit as number) ?? 20;
      const agentName = args.agent as string | undefined;

      let contextPaths: string[] | undefined;
      if (agentName) {
        const paths = getAgentContextPaths(root, agentName);
        if (paths) contextPaths = paths;
      }

      const files = collectFiles(root, { agentContextPaths: contextPaths });
      const sorted = sort === 'name'
        ? files.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
        : files.sort((a, b) => b.tokens - a.tokens);

      const limited = sorted.slice(0, limit);
      const totalTokens = files.reduce((sum, f) => sum + f.tokens, 0);

      return {
        totalFiles: files.length,
        totalTokens,
        totalFormatted: formatTokenCount(totalTokens),
        files: limited.map(f => ({
          path: f.relativePath,
          tokens: f.tokens,
          formatted: formatTokenCount(f.tokens),
          language: f.language,
        })),
      };
    }

    case 'health_check': {
      const results = runHealthCheck(root);
      const failures = results.filter(r => r.status === 'fail');
      return {
        status: failures.length === 0 ? 'healthy' : 'unhealthy',
        totalChecks: results.length,
        failures: failures.length,
        results,
      };
    }

    case 'scan_secrets': {
      const file = args.file as string;
      const fullPath = resolve(root, file);
      if (!existsSync(fullPath)) {
        return { error: `File not found: ${file}` };
      }
      const content = readFileSync(fullPath, 'utf8');
      const matches = scanForSecrets(content, file);
      return {
        file,
        secretsFound: matches.length,
        matches,
      };
    }

    case 'list_agents': {
      const config = loadAgentsConfig(root);
      if (!config) return { error: 'No agents.json found. Run "codebase-pilot init" first.' };
      const agents = Object.entries(config.agents).map(([key, agent]) => ({
        key,
        name: agent.name,
        model: agent.model,
        layer: agent.layer,
        context: agent.context,
        task: agent.task,
        dependsOn: agent.dependsOn,
      }));
      return { project: config.project, version: config.version, agents };
    }

    case 'get_agent': {
      const agentName = args.name as string;
      const config = loadAgentsConfig(root);
      if (!config) return { error: 'No agents.json found. Run "codebase-pilot init" first.' };
      const agent = config.agents[agentName];
      if (!agent) return { error: `Agent "${agentName}" not found. Available: ${Object.keys(config.agents).join(', ')}` };
      return { key: agentName, ...agent };
    }

    case 'detect_languages': {
      const scan = await detect(root);
      return {
        languages: scan.languages,
        primary: scan.languages[0]?.name ?? null,
      };
    }

    case 'get_savings': {
      const logs = readPackLogs(root);
      const today = getStats(logs, 1);
      const weekly = getStats(logs, 7);
      const allTime = getStats(logs, 365 * 10);
      return {
        today: { sessions: today.sessions, tokensSaved: today.tokensSaved, formatted: formatTokenCount(today.tokensSaved) },
        weekly: { sessions: weekly.sessions, tokensSaved: weekly.tokensSaved, formatted: formatTokenCount(weekly.tokensSaved) },
        allTime: { sessions: allTime.sessions, tokensSaved: allTime.tokensSaved, formatted: formatTokenCount(allTime.tokensSaved) },
      };
    }

    case 'list_files': {
      const agentName = args.agent as string | undefined;
      const limit = (args.limit as number) ?? 50;

      let contextPaths: string[] | undefined;
      if (agentName) {
        const paths = getAgentContextPaths(root, agentName);
        if (paths) contextPaths = paths;
      }

      const files = collectFiles(root, { agentContextPaths: contextPaths });
      const sorted = files.sort((a, b) => b.tokens - a.tokens);
      const limited = sorted.slice(0, limit);
      const totalTokens = files.reduce((sum, f) => sum + f.tokens, 0);

      return {
        totalFiles: files.length,
        totalTokens,
        totalFormatted: formatTokenCount(totalTokens),
        files: limited.map(f => ({
          path: f.relativePath,
          tokens: f.tokens,
          language: f.language,
        })),
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ---------------------------------------------------------------------------
// Prompt handler
// ---------------------------------------------------------------------------

function handlePromptGet(name: string, args: Record<string, string>): { role: string; content: { type: string; text: string } }[] {
  switch (name) {
    case 'review': {
      const focus = args.focus ? ` Focus on: ${args.focus}.` : '';
      return [{
        role: 'user',
        content: {
          type: 'text',
          text: `Review the codebase for issues, improvements, and best practices.${focus} Use the scan_project tool to understand the project structure, then pack_codebase to review the code. Provide specific, actionable suggestions with file paths and line references.`,
        },
      }];
    }

    case 'onboard': {
      const role = args.role ? ` The developer will be working as a ${args.role} engineer.` : '';
      return [{
        role: 'user',
        content: {
          type: 'text',
          text: `Explain this project to a new developer who is joining the team.${role} Use scan_project to understand the structure, list_agents to see the agent setup, and list_files to identify key files. Cover: project purpose, tech stack, directory layout, how to build/test, and key patterns to follow.`,
        },
      }];
    }

    case 'optimize': {
      const agent = args.agent ? ` Focus on the "${args.agent}" agent context.` : '';
      return [{
        role: 'user',
        content: {
          type: 'text',
          text: `Analyze token usage and suggest optimizations to reduce context size.${agent} Use count_tokens to see per-file breakdown, get_savings to check current savings, and list_files to identify large files. Suggest which files to exclude, split, or compress.`,
        },
      }];
    }

    default:
      return [{
        role: 'user',
        content: { type: 'text', text: `Unknown prompt: ${name}` },
      }];
  }
}

// ---------------------------------------------------------------------------
// MCP message framing (Content-Length header, like LSP)
// ---------------------------------------------------------------------------

function writeMessage(msg: unknown): void {
  const json = JSON.stringify(msg);
  const header = `Content-Length: ${Buffer.byteLength(json)}\r\n\r\n`;
  process.stdout.write(header + json);
}

function sendResult(id: number | string, result: unknown): void {
  const response: JsonRpcResponse = { jsonrpc: '2.0', id, result };
  writeMessage(response);
}

function sendError(id: number | string | null, code: number, message: string, data?: unknown): void {
  const response: JsonRpcResponse = { jsonrpc: '2.0', id, error: { code, message, data } };
  writeMessage(response);
}

// ---------------------------------------------------------------------------
// Message router
// ---------------------------------------------------------------------------

async function handleMessage(root: string, msg: JsonRpcRequest): Promise<void> {
  const { id, method, params } = msg;

  switch (method) {
    case 'initialize': {
      sendResult(id, {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          prompts: {},
        },
        serverInfo: {
          name: 'codebase-pilot',
          version: '0.1.0',
        },
      });
      break;
    }

    case 'notifications/initialized': {
      // Client acknowledgement — no response needed
      break;
    }

    case 'tools/list': {
      sendResult(id, { tools: TOOLS });
      break;
    }

    case 'tools/call': {
      const toolName = params?.name as string;
      const toolArgs = (params?.arguments as Record<string, unknown>) ?? {};
      const callStart = Date.now();
      try {
        const result = await handleToolCall(root, toolName, toolArgs);

        // Log MCP tool usage (non-pack tools get a lightweight log entry)
        if (toolName !== 'pack_codebase') {
          try {
            const mcpLogDir = join(resolve(root, '.codebase-pilot'));
            if (!existsSync(mcpLogDir)) { const { mkdirSync } = await import('node:fs'); mkdirSync(mcpLogDir, { recursive: true }); }
            const entry = JSON.stringify({ date: new Date().toISOString(), tool: toolName, args: Object.keys(toolArgs), duration: Date.now() - callStart }) + '\n';
            const { appendFileSync } = await import('node:fs');
            appendFileSync(join(mcpLogDir, 'mcp-calls.jsonl'), entry, 'utf8');
          } catch { /* ignore logging errors */ }
        }

        sendResult(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        });
      } catch (err) {
        // Sanitize error — never leak internal details (#1429 fix)
        const internal = err instanceof Error ? err.message : String(err);
        const safe = internal.includes('ENOENT') ? 'File or directory not found'
          : internal.includes('EACCES') ? 'Permission denied'
          : internal.includes('SQLITE') ? 'Database error — try rebuilding index'
          : 'Tool execution failed';
        // Log full error server-side for debugging
        process.stderr.write(`[mcp] Tool "${toolName}" error: ${internal}\n`);
        sendResult(id, {
          content: [{ type: 'text', text: JSON.stringify({ error: safe }) }],
          isError: true,
        });
      }
      break;
    }

    case 'prompts/list': {
      sendResult(id, { prompts: PROMPTS });
      break;
    }

    case 'prompts/get': {
      const promptName = params?.name as string;
      const promptArgs = (params?.arguments as Record<string, string>) ?? {};
      const messages = handlePromptGet(promptName, promptArgs);
      sendResult(id, { messages });
      break;
    }

    case 'ping': {
      sendResult(id, {});
      break;
    }

    default: {
      sendError(id, -32601, `Method not found: ${method}`);
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Server entry point
// ---------------------------------------------------------------------------

export function startMcpServer(root: string): void {
  const resolvedRoot = resolve(root);
  let buffer = '';

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk: string) => {
    buffer += chunk;

    while (true) {
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) break;

      const header = buffer.slice(0, headerEnd);
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        // Malformed header — skip past it
        buffer = buffer.slice(headerEnd + 4);
        continue;
      }

      const len = parseInt(match[1], 10);
      const bodyStart = headerEnd + 4;
      if (buffer.length < bodyStart + len) break; // Wait for more data

      const body = buffer.slice(bodyStart, bodyStart + len);
      buffer = buffer.slice(bodyStart + len);

      let msg: JsonRpcRequest;
      try {
        msg = JSON.parse(body) as JsonRpcRequest;
      } catch {
        sendError(null, -32700, 'Parse error');
        continue;
      }

      // Fire and forget — errors are caught inside handleMessage
      handleMessage(resolvedRoot, msg).catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        if (msg.id !== undefined) {
          sendError(msg.id, -32603, `Internal error: ${message}`);
        }
      });
    }
  });

  process.stdin.on('end', () => {
    process.exit(0);
  });

  // Prevent unhandled rejection crashes
  process.on('unhandledRejection', (err) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[codebase-pilot MCP] Unhandled rejection: ${message}\n`);
  });
}

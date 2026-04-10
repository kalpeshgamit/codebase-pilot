# Context Engine — Pack, Tokens & Compress Design Spec

**Date:** 2026-04-03
**Status:** Approved
**Scope:** Add `pack` command (AI-friendly codebase packing), `tokens` command (token counting), `--compress` flag (code compression), built-in security scanning, agent-scoped packing

---

## Problem Statement

codebase-pilot currently generates config files (CLAUDE.md, agents.json, .claudeignore) but doesn't help with the core pain: getting the right code context into an LLM efficiently. Repomix (23K stars) proves this is a massive need. By adding codebase packing, token counting, and code compression, codebase-pilot becomes a complete context engine — not just a scaffolder.

## Key Differentiator

Agent-scoped packing (`--agent api-agent`) is unique to us. No other tool can pack just the files relevant to a specific agent. This makes agents.json both an orchestration config and a context scoping tool.

---

## New Commands

### `codebase-pilot pack [options]`

Pack codebase into a single AI-friendly file.

**Options:**
| Flag | Default | Description |
|------|---------|-------------|
| `--format xml\|md` | `xml` | Output format |
| `--output <path>` | `codebase-pilot-output.{xml\|md}` | Output file path |
| `--copy` | `false` | Copy to clipboard instead of file |
| `--compress` | `false` | Extract signatures, fold function bodies |
| `--agent <name>` | (none) | Pack only files in agent's context paths |
| `--no-security` | `false` | Skip secret detection |
| `--dir <path>` | `.` | Project root |

### `codebase-pilot tokens [options]`

Show token counts per file and total.

**Options:**
| Flag | Default | Description |
|------|---------|-------------|
| `--dir <path>` | `.` | Project root |
| `--sort size\|name` | `size` | Sort order |
| `--limit <n>` | `20` | Show top N files |
| `--agent <name>` | (none) | Count tokens for specific agent's context |

---

## Output Formats

### XML (default)

```xml
<codebase project="my-app" files="42" tokens="15234">
  <file path="src/index.ts" tokens="234" language="TypeScript">
    <content>
import express from 'express';
const app = express();
    </content>
  </file>
</codebase>
```

With `--agent`:
```xml
<codebase project="my-app" agent="api-agent" files="12" tokens="3456">
  ...
</codebase>
```

### Markdown

```markdown
# my-app (42 files, ~15,234 tokens)

## src/index.ts (234 tokens, TypeScript)

\`\`\`typescript
import express from 'express';
const app = express();
\`\`\`
```

---

## Security Scanner

Built-in regex patterns detect secrets before packing. No external dependencies.

### Patterns

| Pattern | Regex |
|---------|-------|
| AWS Access Key | `AKIA[0-9A-Z]{16}` |
| AWS Secret Key | `(?:aws_secret\|secret_access)[^=]*[=:]\s*['"]?[0-9a-zA-Z/+]{40}` |
| GitHub Token | `gh[pousr]_[A-Za-z0-9_]{36,}` |
| GitLab Token | `glpat-[A-Za-z0-9\-]{20,}` |
| Stripe Key | `sk_live_[A-Za-z0-9]{24,}` |
| Private Key | `-----BEGIN\s+(RSA\|EC\|DSA\|OPENSSH)\s+PRIVATE KEY-----` |
| JWT | `eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}` |
| Generic Secrets | `(?:password\|secret\|token\|api_key\|apikey)\s*[=:]\s*['"][^'"]{8,}` |
| Connection Strings | `(?:mongodb\|postgres\|mysql\|redis):\/\/[^\s'"]+` |

### Behavior

- Security scan runs by default on every `pack`
- If secrets found: print warning with file + line, skip those files from output
- `--no-security` disables the scan
- Files matching `.env*` always excluded regardless of flags
- Scanner is a standalone module reusable by other commands

---

## Code Compression

Two tiers — regex always works, tree-sitter enhances when available.

### Tier A: Regex-Based (always available)

Per-language regex patterns extract:
- Function/method signatures → body replaced with `{ /* ... */ }`
- Class/interface/struct declarations with member signatures
- Import/export statements in full
- Type definitions in full

Removes:
- Function/method bodies
- Inline comments (preserves JSDoc on exports)

**Language patterns:**

| Language | Signature patterns |
|----------|-------------------|
| TypeScript/JS | `export`, `function`, `class`, `interface`, `type`, `const` |
| Python | `def`, `class`, `@decorator` |
| Go | `func`, `type`, `struct`, `interface` |
| Rust | `fn`, `pub`, `struct`, `enum`, `impl`, `trait` |
| Java/Kotlin | `public\|private\|protected`, `class`, `interface`, `fun` |
| Ruby | `def`, `class`, `module` |
| PHP | `function`, `class`, `interface`, `trait` |
| C/C++ | function declarations, `class`, `struct`, `namespace` |

**Example:**
```typescript
// Before
export function createUser(data: UserInput): Promise<User> {
  const validated = schema.parse(data);
  const user = await db.user.create({ data: validated });
  await sendWelcomeEmail(user.email);
  return user;
}

// After Tier A
export function createUser(data: UserInput): Promise<User> { /* ... */ }
```

### Tier B: Tree-sitter Enhanced (when installed)

- Accurate AST parsing, no regex edge cases
- Statement counting inside folded bodies: `{ /* 4 statements */ }`
- Preserves doc comments on public symbols
- Falls back to Tier A for languages without installed grammars
- Uses existing optional dependencies (tree-sitter, tree-sitter-typescript, etc.)

**Expected compression:**
- Tier A: ~60-70% token reduction
- Tier B: ~70-80% token reduction

---

## Token Counter

Character-based estimation: `Math.ceil(text.length / 4)`.

- No external tokenizer dependency
- Accurate within ~10% of actual token counts for English/code
- Good enough for context limit planning (128K, 200K window estimation)

---

## Agent-Scoped Packing

When `--agent <name>` is passed:

1. Read `.codebase-pilot/agents.json`
2. Find the named agent's `context` array (e.g., `["packages/api/src/"]`)
3. Collect only files under those paths
4. Apply same security scan + optional compression
5. Output includes agent name in header

This works with both `pack` and `tokens` commands.

---

## File Collection

### What gets included

1. Walk project directory recursively
2. Skip directories in the registry's skip dirs set (node_modules, dist, etc.)
3. Skip files matching `.claudeignore` patterns (if exists)
4. Skip `.env*` files always
5. Skip files flagged by security scanner
6. If `--agent` specified, only include files under agent context paths

### .claudeignore integration

The file collector reads `.claudeignore` (gitignore format) and applies those patterns. This means the same ignore rules that filter Claude Code's context also filter the pack output.

---

## CLI Output

### `pack` output
```
codebase-pilot pack

  Packing project...

  Security scan:  2 files skipped (secrets detected)
    .env                     — excluded (dotenv file)
    src/config/keys.ts       — AWS key detected (line 12)

  Files:    42 packed
  Tokens:   ~15,234 (estimated)
  Format:   XML
  Output:   codebase-pilot-output.xml

  Done!
```

### `pack --compress` output
```
codebase-pilot pack --compress

  Packing project (compressed)...

  Compression:  tree-sitter available (TypeScript, Python)
  Security scan:  clean

  Files:    42 packed
  Tokens:   ~4,037 (compressed from ~15,234, 73% reduction)
  Format:   XML
  Output:   codebase-pilot-output.xml

  Done!
```

### `pack --agent api-agent` output
```
codebase-pilot pack --agent api-agent

  Packing agent context: api-agent
  Context paths: packages/api/src/

  Security scan:  clean

  Files:    12 packed
  Tokens:   ~3,456 (estimated)
  Format:   XML
  Output:   codebase-pilot-output.xml

  Done!
```

### `tokens` output
```
codebase-pilot tokens

  Token count by file (top 20):

    src/registry/languages.ts     2,456 tokens  ██████████████░░  18%
    src/registry/frameworks.ts    1,823 tokens  ██████████░░░░░░  13%
    src/registry/databases.ts     1,456 tokens  ████████░░░░░░░░  11%
    src/scanner/structure.ts        892 tokens  █████░░░░░░░░░░░   7%
    src/cli/fix.ts                  734 tokens  ████░░░░░░░░░░░░   5%
    ...

  Total: 13,456 tokens across 52 files
  Compressed: ~4,037 tokens (with --compress)
```

---

## File Structure

```
src/
  cli/
    pack.ts              # NEW — pack command
    tokens.ts            # NEW — tokens command
  packer/
    index.ts             # Orchestrator: collect → process → format
    collector.ts         # Walk files, respect .claudeignore + agent scoping
    formatter-xml.ts     # XML output format
    formatter-md.ts      # Markdown output format
    token-counter.ts     # Character-based token estimator
  security/
    scanner.ts           # Regex-based secret detection
    patterns.ts          # All regex patterns as data
  compress/
    index.ts             # Compression orchestrator (picks tier A or B)
    regex-compress.ts    # Tier A: regex-based signature extraction
    treesitter-compress.ts  # Tier B: optional tree-sitter enhancement
    patterns.ts          # Per-language regex patterns for Tier A
tests/
  packer/
    collector.test.ts
    formatter-xml.test.ts
    formatter-md.test.ts
    token-counter.test.ts
  security/
    scanner.test.ts
  compress/
    regex-compress.test.ts
  cli/
    pack.test.ts
    tokens.test.ts
```

---

## Implementation Order

1. Token counter (shared utility, no deps)
2. Security scanner + patterns (standalone module)
3. File collector (walk + .claudeignore + agent scoping)
4. Regex compression (Tier A, per-language patterns)
5. XML formatter
6. Markdown formatter
7. `pack` CLI command (wire everything together)
8. `tokens` CLI command
9. Tree-sitter compression (Tier B, optional enhancement)
10. Clipboard support (`--copy` flag)
11. Integration tests + self-test

## Success Criteria

- `codebase-pilot pack` produces valid XML/Markdown with all project files
- `codebase-pilot pack --agent api-agent` scopes output to agent's context
- `codebase-pilot pack --compress` reduces tokens by 60%+
- `codebase-pilot tokens` shows accurate per-file token breakdown
- Security scanner catches AWS keys, GitHub tokens, private keys in test fixtures
- All new features work on Linux, macOS, Windows
- Zero new required dependencies

# Context Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `pack` and `tokens` commands with security scanning, code compression, and agent-scoped packing — transforming codebase-pilot from a scaffolder into a complete context engine.

**Architecture:** File collector walks the project respecting .claudeignore + agent scoping, pipes files through optional security scan and compression, then formats as XML or Markdown with token counts. All modules are independent with clear interfaces.

**Tech Stack:** TypeScript, Node.js fs APIs, Vitest, commander (existing), optional tree-sitter (existing optional dep)

---

## Task Dependency Graph

```
Task 1 (token counter) ──────────────────────────────┐
Task 2 (security patterns + scanner) ── parallel ────┤
Task 3 (compression patterns + regex compressor) ────┤
                                                      ↓
Task 4 (file collector) ←─────────────────────────────┘
                                                      │
Task 5 (XML formatter) ── parallel ───────────────────┤
Task 6 (MD formatter) ── parallel ────────────────────┤
                                                      ↓
Task 7 (pack orchestrator) ←──────────────────────────┘
                                                      │
Task 8 (pack CLI command) ── parallel ────────────────┤
Task 9 (tokens CLI command) ── parallel ──────────────┤
                                                      ↓
Task 10 (tree-sitter Tier B compression) ─────────────┤
Task 11 (integration tests + self-test) ←─────────────┘
```

**Parallelizable groups:**
- Group A: Tasks 1, 2, 3 (independent utility modules)
- Group B: Tasks 5, 6 (independent formatters)
- Group C: Tasks 8, 9 (independent CLI commands)

---

## Task 1: Token Counter

**Files:**
- Create: `src/packer/token-counter.ts`
- Create: `tests/packer/token-counter.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/packer/token-counter.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { countTokens, formatTokenCount } from '../../src/packer/token-counter.js';

describe('countTokens', () => {
  it('estimates tokens from text length', () => {
    // ~4 chars per token
    const text = 'a'.repeat(100);
    expect(countTokens(text)).toBe(25);
  });

  it('returns 0 for empty string', () => {
    expect(countTokens('')).toBe(0);
  });

  it('handles real code', () => {
    const code = 'export function hello(): string {\n  return "world";\n}';
    const tokens = countTokens(code);
    expect(tokens).toBeGreaterThan(10);
    expect(tokens).toBeLessThan(30);
  });
});

describe('formatTokenCount', () => {
  it('formats small numbers without comma', () => {
    expect(formatTokenCount(42)).toBe('42');
  });

  it('formats thousands with comma', () => {
    expect(formatTokenCount(15234)).toBe('15,234');
  });

  it('formats millions', () => {
    expect(formatTokenCount(1234567)).toBe('1,234,567');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/packer/token-counter.test.ts`
Expected: FAIL — module doesn't exist

- [ ] **Step 3: Write implementation**

Create `src/packer/token-counter.ts`:

```typescript
/**
 * Estimate token count from text.
 * Uses ~4 characters per token heuristic.
 * Accurate within ~10% for English text and code.
 */
export function countTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Format a number with comma separators.
 * 15234 → "15,234"
 */
export function formatTokenCount(n: number): string {
  return n.toLocaleString('en-US');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/packer/token-counter.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/packer/token-counter.ts tests/packer/token-counter.test.ts
git commit -m "feat: add token counter utility"
```

---

## Task 2: Security Scanner

**Files:**
- Create: `src/security/patterns.ts`
- Create: `src/security/scanner.ts`
- Create: `tests/security/scanner.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/security/scanner.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { scanForSecrets } from '../../src/security/scanner.js';

describe('scanForSecrets', () => {
  it('detects AWS access key', () => {
    const content = 'const key = "AKIAIOSFODNN7EXAMPLE";';
    const results = scanForSecrets(content, 'config.ts');
    expect(results.length).toBe(1);
    expect(results[0].pattern).toBe('AWS Access Key');
    expect(results[0].line).toBe(1);
  });

  it('detects GitHub token', () => {
    const content = 'token: "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn"';
    const results = scanForSecrets(content, 'auth.ts');
    expect(results.length).toBe(1);
    expect(results[0].pattern).toBe('GitHub Token');
  });

  it('detects private key', () => {
    const content = '-----BEGIN RSA PRIVATE KEY-----\nMIIE...';
    const results = scanForSecrets(content, 'key.pem');
    expect(results.length).toBe(1);
    expect(results[0].pattern).toBe('Private Key');
  });

  it('detects connection string', () => {
    const content = 'const db = "postgres://user:pass@localhost:5432/mydb";';
    const results = scanForSecrets(content, 'db.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('detects generic secret assignment', () => {
    const content = 'password = "super_secret_123"';
    const results = scanForSecrets(content, 'config.ts');
    expect(results.length).toBe(1);
    expect(results[0].pattern).toBe('Generic Secret');
  });

  it('detects JWT token', () => {
    const content = 'const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc"';
    const results = scanForSecrets(content, 'auth.ts');
    expect(results.length).toBe(1);
    expect(results[0].pattern).toBe('JWT');
  });

  it('returns empty for clean content', () => {
    const content = 'export function hello() { return "world"; }';
    const results = scanForSecrets(content, 'hello.ts');
    expect(results).toEqual([]);
  });

  it('detects Stripe key', () => {
    const content = 'stripe.key = "sk_live_abc123def456ghi789jkl012mno345"';
    const results = scanForSecrets(content, 'pay.ts');
    expect(results.length).toBe(1);
    expect(results[0].pattern).toBe('Stripe Key');
  });

  it('identifies .env files', () => {
    expect(isEnvFile('.env')).toBe(true);
    expect(isEnvFile('.env.local')).toBe(true);
    expect(isEnvFile('.env.production')).toBe(true);
    expect(isEnvFile('src/index.ts')).toBe(false);
  });
});

import { isEnvFile } from '../../src/security/scanner.js';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/security/scanner.test.ts`
Expected: FAIL

- [ ] **Step 3: Create security patterns**

Create `src/security/patterns.ts`:

```typescript
export interface SecretPattern {
  name: string;
  regex: RegExp;
}

export const SECRET_PATTERNS: SecretPattern[] = [
  {
    name: 'AWS Access Key',
    regex: /AKIA[0-9A-Z]{16}/,
  },
  {
    name: 'AWS Secret Key',
    regex: /(?:aws_secret|secret_access)[^=\n]*[=:]\s*['"]?[0-9a-zA-Z/+]{40}/i,
  },
  {
    name: 'GitHub Token',
    regex: /gh[pousr]_[A-Za-z0-9_]{36,}/,
  },
  {
    name: 'GitLab Token',
    regex: /glpat-[A-Za-z0-9\-]{20,}/,
  },
  {
    name: 'Stripe Key',
    regex: /sk_live_[A-Za-z0-9]{24,}/,
  },
  {
    name: 'Private Key',
    regex: /-----BEGIN\s+(?:RSA|EC|DSA|OPENSSH)\s+PRIVATE KEY-----/,
  },
  {
    name: 'JWT',
    regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}/,
  },
  {
    name: 'Generic Secret',
    regex: /(?:password|secret|token|api_key|apikey)\s*[=:]\s*['"][^'"]{8,}['"]/i,
  },
  {
    name: 'Connection String',
    regex: /(?:mongodb|postgres|mysql|redis):\/\/[^\s'"]+/,
  },
];
```

- [ ] **Step 4: Create security scanner**

Create `src/security/scanner.ts`:

```typescript
import { basename } from 'node:path';
import { SECRET_PATTERNS } from './patterns.js';

export interface SecretMatch {
  pattern: string;
  line: number;
  file: string;
}

export function scanForSecrets(content: string, filePath: string): SecretMatch[] {
  const matches: SecretMatch[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.regex.test(lines[i])) {
        matches.push({
          pattern: pattern.name,
          line: i + 1,
          file: filePath,
        });
        break; // One match per line is enough
      }
    }
  }

  return matches;
}

export function isEnvFile(filePath: string): boolean {
  const name = basename(filePath);
  return name === '.env' || name.startsWith('.env.');
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/security/scanner.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/security/patterns.ts src/security/scanner.ts tests/security/scanner.test.ts
git commit -m "feat: built-in secret detection scanner (9 patterns)"
```

---

## Task 3: Regex Compression (Tier A)

**Files:**
- Create: `src/compress/patterns.ts`
- Create: `src/compress/regex-compress.ts`
- Create: `tests/compress/regex-compress.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/compress/regex-compress.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { compressCode } from '../../src/compress/regex-compress.js';

describe('compressCode', () => {
  it('folds TypeScript function bodies', () => {
    const code = `export function createUser(data: UserInput): Promise<User> {
  const validated = schema.parse(data);
  const user = await db.user.create({ data: validated });
  return user;
}`;
    const result = compressCode(code, 'TypeScript');
    expect(result).toContain('export function createUser(data: UserInput): Promise<User>');
    expect(result).toContain('/* ... */');
    expect(result).not.toContain('schema.parse');
  });

  it('folds Python function bodies', () => {
    const code = `def create_user(data: dict) -> User:
    validated = schema.parse(data)
    user = db.create(validated)
    return user`;
    const result = compressCode(code, 'Python');
    expect(result).toContain('def create_user(data: dict) -> User:');
    expect(result).toContain('...');
    expect(result).not.toContain('schema.parse');
  });

  it('preserves import statements', () => {
    const code = `import express from 'express';
import { Router } from 'express';

export function setup() {
  const app = express();
  return app;
}`;
    const result = compressCode(code, 'TypeScript');
    expect(result).toContain("import express from 'express'");
    expect(result).toContain("import { Router } from 'express'");
  });

  it('folds Go function bodies', () => {
    const code = `func CreateUser(data UserInput) (*User, error) {
	validated := schema.Parse(data)
	user, err := db.Create(validated)
	if err != nil {
		return nil, err
	}
	return user, nil
}`;
    const result = compressCode(code, 'Go');
    expect(result).toContain('func CreateUser(data UserInput) (*User, error)');
    expect(result).toContain('/* ... */');
  });

  it('folds Rust function bodies', () => {
    const code = `pub fn create_user(data: UserInput) -> Result<User, Error> {
    let validated = schema::parse(data)?;
    let user = db::create(validated)?;
    Ok(user)
}`;
    const result = compressCode(code, 'Rust');
    expect(result).toContain('pub fn create_user(data: UserInput) -> Result<User, Error>');
    expect(result).toContain('/* ... */');
  });

  it('preserves type/interface declarations', () => {
    const code = `export interface User {
  id: string;
  name: string;
  email: string;
}

export function getUser(id: string): User {
  return db.find(id);
}`;
    const result = compressCode(code, 'TypeScript');
    expect(result).toContain('export interface User');
    expect(result).toContain('id: string');
    expect(result).toContain('name: string');
  });

  it('returns original for unknown languages', () => {
    const code = 'some code here';
    const result = compressCode(code, 'Brainfuck');
    expect(result).toBe(code);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/compress/regex-compress.test.ts`
Expected: FAIL

- [ ] **Step 3: Create compression patterns**

Create `src/compress/patterns.ts`:

```typescript
export interface CompressionPattern {
  // Matches the start of a block (function signature, class declaration)
  signature: RegExp;
  // How to find the end of the block
  blockType: 'brace' | 'indent';
  // What to replace the body with
  placeholder: string;
}

export interface LanguageCompression {
  language: string;
  aliases: string[];
  // Lines matching these are always preserved
  preservePatterns: RegExp[];
  // Block patterns for body folding
  blockPatterns: CompressionPattern[];
}

export const COMPRESSION_LANGUAGES: LanguageCompression[] = [
  {
    language: 'TypeScript',
    aliases: ['JavaScript'],
    preservePatterns: [
      /^\s*import\s/,
      /^\s*export\s+(?:type|interface|enum)\s/,
      /^\s*(?:type|interface|enum)\s/,
    ],
    blockPatterns: [
      {
        signature: /^(\s*(?:export\s+)?(?:async\s+)?function\s+\w+[^{]*)\{/,
        blockType: 'brace',
        placeholder: '{ /* ... */ }',
      },
      {
        signature: /^(\s*(?:export\s+)?(?:const|let)\s+\w+\s*=\s*(?:async\s+)?\([^)]*\)[^{]*)\{/,
        blockType: 'brace',
        placeholder: '{ /* ... */ }',
      },
      {
        signature: /^(\s*(?:export\s+)?class\s+\w+[^{]*)\{/,
        blockType: 'brace',
        placeholder: '{ /* ... */ }',
      },
    ],
  },
  {
    language: 'Python',
    aliases: [],
    preservePatterns: [
      /^\s*(?:import|from)\s/,
      /^\s*class\s+\w+/,
      /^\s*@\w+/,
    ],
    blockPatterns: [
      {
        signature: /^(\s*(?:async\s+)?def\s+\w+\([^)]*\)[^:]*:)/,
        blockType: 'indent',
        placeholder: ' ...',
      },
    ],
  },
  {
    language: 'Go',
    aliases: [],
    preservePatterns: [
      /^\s*(?:import|package)\s/,
      /^\s*type\s+\w+\s+(?:struct|interface)\s/,
    ],
    blockPatterns: [
      {
        signature: /^(\s*func\s+(?:\([^)]*\)\s+)?\w+\([^)]*\)[^{]*)\{/,
        blockType: 'brace',
        placeholder: '{ /* ... */ }',
      },
    ],
  },
  {
    language: 'Rust',
    aliases: [],
    preservePatterns: [
      /^\s*use\s/,
      /^\s*(?:pub\s+)?(?:struct|enum|trait|type)\s/,
    ],
    blockPatterns: [
      {
        signature: /^(\s*(?:pub\s+)?(?:async\s+)?fn\s+\w+[^{]*)\{/,
        blockType: 'brace',
        placeholder: '{ /* ... */ }',
      },
      {
        signature: /^(\s*(?:pub\s+)?impl\s+[^{]*)\{/,
        blockType: 'brace',
        placeholder: '{ /* ... */ }',
      },
    ],
  },
  {
    language: 'Java',
    aliases: ['Kotlin'],
    preservePatterns: [
      /^\s*(?:import|package)\s/,
      /^\s*(?:public|private|protected)?\s*(?:abstract\s+)?(?:class|interface|enum|record)\s/,
    ],
    blockPatterns: [
      {
        signature: /^(\s*(?:public|private|protected)?\s*(?:static\s+)?(?:abstract\s+)?(?:synchronized\s+)?\w+(?:<[^>]*>)?\s+\w+\s*\([^)]*\)[^{]*)\{/,
        blockType: 'brace',
        placeholder: '{ /* ... */ }',
      },
    ],
  },
  {
    language: 'Ruby',
    aliases: [],
    preservePatterns: [
      /^\s*require/,
      /^\s*(?:class|module)\s/,
      /^\s*attr_/,
    ],
    blockPatterns: [
      {
        signature: /^(\s*def\s+\w+[^$]*)/,
        blockType: 'indent',
        placeholder: '\n    # ...\n  end',
      },
    ],
  },
  {
    language: 'PHP',
    aliases: [],
    preservePatterns: [
      /^\s*(?:use|namespace)\s/,
      /^\s*(?:class|interface|trait|enum)\s/,
    ],
    blockPatterns: [
      {
        signature: /^(\s*(?:public|private|protected)?\s*(?:static\s+)?function\s+\w+\s*\([^)]*\)[^{]*)\{/,
        blockType: 'brace',
        placeholder: '{ /* ... */ }',
      },
    ],
  },
  {
    language: 'C++',
    aliases: ['C'],
    preservePatterns: [
      /^\s*#include/,
      /^\s*(?:class|struct|namespace|enum)\s/,
      /^\s*using\s/,
    ],
    blockPatterns: [
      {
        signature: /^(\s*(?:virtual\s+)?(?:static\s+)?(?:inline\s+)?(?:const\s+)?[\w:*&<>]+\s+\w+\s*\([^)]*\)[^{;]*)\{/,
        blockType: 'brace',
        placeholder: '{ /* ... */ }',
      },
    ],
  },
];
```

- [ ] **Step 4: Create regex compressor**

Create `src/compress/regex-compress.ts`:

```typescript
import { COMPRESSION_LANGUAGES } from './patterns.js';

/**
 * Compress code by extracting signatures and folding function bodies.
 * Tier A: regex-based, always available, ~60-70% token reduction.
 */
export function compressCode(code: string, language: string): string {
  const langDef = COMPRESSION_LANGUAGES.find(
    l => l.language === language || l.aliases.includes(language),
  );
  if (!langDef) return code;

  const lines = code.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Check if line should always be preserved
    if (langDef.preservePatterns.some(p => p.test(line))) {
      result.push(line);
      i++;
      continue;
    }

    // Check if line matches a block pattern
    let matched = false;
    for (const pattern of langDef.blockPatterns) {
      const match = line.match(pattern.signature);
      if (match) {
        if (pattern.blockType === 'brace') {
          result.push(match[1] + ' ' + pattern.placeholder);
          i = skipBraceBlock(lines, i);
        } else if (pattern.blockType === 'indent') {
          result.push(match[1] + pattern.placeholder);
          i = skipIndentBlock(lines, i);
        }
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Keep lines that look like declarations or empty lines
      if (line.trim() === '' || isDeclarationLine(line)) {
        result.push(line);
      }
      i++;
    }
  }

  return result.join('\n');
}

function skipBraceBlock(lines: string[], startLine: number): number {
  let depth = 0;
  let i = startLine;

  for (; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
    }
    if (depth === 0 && i > startLine) return i + 1;
  }

  return i;
}

function skipIndentBlock(lines: string[], startLine: number): number {
  const baseIndent = getIndent(lines[startLine]);
  let i = startLine + 1;

  while (i < lines.length) {
    const line = lines[i];
    // Empty lines don't end the block
    if (line.trim() === '') {
      i++;
      continue;
    }
    // Line with same or less indent ends the block
    if (getIndent(line) <= baseIndent) break;
    i++;
  }

  return i;
}

function getIndent(line: string): number {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

function isDeclarationLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.startsWith('export ') ||
    trimmed.startsWith('const ') ||
    trimmed.startsWith('let ') ||
    trimmed.startsWith('var ') ||
    trimmed.startsWith('type ') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('*') ||
    trimmed.startsWith('/**')
  );
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/compress/regex-compress.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/compress/patterns.ts src/compress/regex-compress.ts tests/compress/regex-compress.test.ts
git commit -m "feat: regex-based code compression (Tier A, 8 languages)"
```

---

## Task 4: File Collector

**Files:**
- Create: `src/packer/collector.ts`
- Create: `tests/packer/collector.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/packer/collector.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { collectFiles } from '../../src/packer/collector.js';

describe('collectFiles', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cp-collector-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('collects all source files', () => {
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeFileSync(join(tmpDir, 'src', 'index.ts'), 'export {}');
    writeFileSync(join(tmpDir, 'src', 'app.ts'), 'const x = 1;');

    const files = collectFiles(tmpDir, {});
    expect(files.length).toBe(2);
    expect(files[0].relativePath).toBeDefined();
    expect(files[0].content).toBeDefined();
  });

  it('skips node_modules', () => {
    mkdirSync(join(tmpDir, 'node_modules', 'foo'), { recursive: true });
    writeFileSync(join(tmpDir, 'node_modules', 'foo', 'index.js'), '');
    writeFileSync(join(tmpDir, 'index.ts'), 'export {}');

    const files = collectFiles(tmpDir, {});
    expect(files.length).toBe(1);
    expect(files[0].relativePath).toBe('index.ts');
  });

  it('skips .env files', () => {
    writeFileSync(join(tmpDir, '.env'), 'SECRET=foo');
    writeFileSync(join(tmpDir, '.env.local'), 'SECRET=bar');
    writeFileSync(join(tmpDir, 'index.ts'), 'export {}');

    const files = collectFiles(tmpDir, {});
    expect(files.length).toBe(1);
  });

  it('respects .claudeignore patterns', () => {
    writeFileSync(join(tmpDir, '.claudeignore'), '*.log\ncoverage/');
    writeFileSync(join(tmpDir, 'app.log'), 'log data');
    writeFileSync(join(tmpDir, 'index.ts'), 'export {}');

    const files = collectFiles(tmpDir, {});
    expect(files.length).toBe(1);
    expect(files[0].relativePath).toBe('index.ts');
  });

  it('scopes to agent context when specified', () => {
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    mkdirSync(join(tmpDir, 'docs'), { recursive: true });
    writeFileSync(join(tmpDir, 'src', 'index.ts'), 'export {}');
    writeFileSync(join(tmpDir, 'docs', 'readme.md'), '# docs');

    const files = collectFiles(tmpDir, { agentContextPaths: ['src/'] });
    expect(files.length).toBe(1);
    expect(files[0].relativePath).toBe('src/index.ts');
  });

  it('includes language info based on extension', () => {
    writeFileSync(join(tmpDir, 'main.py'), 'print("hi")');
    const files = collectFiles(tmpDir, {});
    expect(files[0].language).toBe('Python');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/packer/collector.test.ts`
Expected: FAIL

- [ ] **Step 3: Write implementation**

Create `src/packer/collector.ts`:

```typescript
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname, basename } from 'node:path';
import { getSkipDirs, getLanguageByExt } from '../registry/index.js';
import { toPosix } from '../utils.js';

export interface CollectedFile {
  relativePath: string;
  content: string;
  language: string | null;
  tokens: number;
}

export interface CollectOptions {
  agentContextPaths?: string[];
  claudeignorePatterns?: string[];
}

export function collectFiles(root: string, options: CollectOptions): CollectedFile[] {
  const skipDirs = getSkipDirs();
  const claudeignore = loadClaudeignore(root);
  const files: CollectedFile[] = [];

  function walk(dir: string, depth: number): void {
    if (depth > 10) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.startsWith('.') && entry !== '.') {
        // Allow .claudeignore itself to be read but skip dot dirs/files
        continue;
      }
      if (skipDirs.has(entry)) continue;

      const fullPath = join(dir, entry);
      const relPath = toPosix(relative(root, fullPath));

      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        walk(fullPath, depth + 1);
      } else if (stat.isFile()) {
        // Skip .env files
        if (basename(entry) === '.env' || basename(entry).startsWith('.env.')) continue;

        // Skip by .claudeignore patterns
        if (matchesClaudeignore(relPath, claudeignore)) continue;

        // Skip if agent scoping is active and file is outside context
        if (options.agentContextPaths && options.agentContextPaths.length > 0) {
          const inScope = options.agentContextPaths.some(
            ctx => relPath.startsWith(ctx) || relPath === ctx.replace(/\/$/, ''),
          );
          if (!inScope) continue;
        }

        // Skip binary files (simple heuristic)
        if (isBinaryExt(extname(entry))) continue;

        try {
          const content = readFileSync(fullPath, 'utf8');
          const ext = extname(entry);
          const lang = getLanguageByExt(ext) || getLanguageByExt(ext.toLowerCase());

          files.push({
            relativePath: relPath,
            content,
            language: lang?.name ?? null,
            tokens: Math.ceil(content.length / 4),
          });
        } catch {
          // Skip files that can't be read as utf8
        }
      }
    }
  }

  walk(root, 0);
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function loadClaudeignore(root: string): string[] {
  const ignorePath = join(root, '.claudeignore');
  if (!existsSync(ignorePath)) return [];
  try {
    return readFileSync(ignorePath, 'utf8')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));
  } catch {
    return [];
  }
}

function matchesClaudeignore(filePath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    // Simple glob matching
    if (pattern.endsWith('/')) {
      // Directory pattern
      if (filePath.startsWith(pattern) || filePath.includes('/' + pattern)) return true;
    } else if (pattern.startsWith('*.')) {
      // Extension pattern
      if (filePath.endsWith(pattern.slice(1))) return true;
    } else if (pattern.includes('*')) {
      // Simple wildcard
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      if (regex.test(filePath)) return true;
    } else {
      // Exact match or path prefix
      if (filePath === pattern || filePath.startsWith(pattern + '/')) return true;
    }
  }
  return false;
}

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.exe', '.dll', '.so', '.dylib', '.o', '.a',
  '.mp3', '.mp4', '.wav', '.avi', '.mov',
  '.sqlite', '.db', '.wasm',
]);

function isBinaryExt(ext: string): boolean {
  return BINARY_EXTENSIONS.has(ext.toLowerCase());
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/packer/collector.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/packer/collector.ts tests/packer/collector.test.ts
git commit -m "feat: file collector with .claudeignore + agent scoping"
```

---

## Task 5: XML Formatter

**Files:**
- Create: `src/packer/formatter-xml.ts`
- Create: `tests/packer/formatter-xml.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/packer/formatter-xml.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { formatXml } from '../../src/packer/formatter-xml.js';
import type { CollectedFile } from '../../src/packer/collector.js';

describe('formatXml', () => {
  const files: CollectedFile[] = [
    { relativePath: 'src/index.ts', content: 'export {}', language: 'TypeScript', tokens: 3 },
    { relativePath: 'src/app.ts', content: 'const x = 1;', language: 'TypeScript', tokens: 5 },
  ];

  it('produces valid XML structure', () => {
    const xml = formatXml('my-app', files);
    expect(xml).toContain('<codebase');
    expect(xml).toContain('</codebase>');
    expect(xml).toContain('<file');
    expect(xml).toContain('</file>');
  });

  it('includes project name and file count', () => {
    const xml = formatXml('my-app', files);
    expect(xml).toContain('project="my-app"');
    expect(xml).toContain('files="2"');
  });

  it('includes total tokens', () => {
    const xml = formatXml('my-app', files);
    expect(xml).toContain('tokens="8"');
  });

  it('includes file paths and content', () => {
    const xml = formatXml('my-app', files);
    expect(xml).toContain('path="src/index.ts"');
    expect(xml).toContain('export {}');
  });

  it('includes language attribute', () => {
    const xml = formatXml('my-app', files);
    expect(xml).toContain('language="TypeScript"');
  });

  it('includes agent name when provided', () => {
    const xml = formatXml('my-app', files, 'api-agent');
    expect(xml).toContain('agent="api-agent"');
  });

  it('escapes XML special characters in content', () => {
    const filesWithXml: CollectedFile[] = [
      { relativePath: 'test.ts', content: 'const a = 1 < 2 && b > 3;', language: 'TypeScript', tokens: 10 },
    ];
    const xml = formatXml('proj', filesWithXml);
    expect(xml).toContain('&lt;');
    expect(xml).toContain('&amp;');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/packer/formatter-xml.test.ts`
Expected: FAIL

- [ ] **Step 3: Write implementation**

Create `src/packer/formatter-xml.ts`:

```typescript
import type { CollectedFile } from './collector.js';

export function formatXml(
  projectName: string,
  files: CollectedFile[],
  agentName?: string,
): string {
  const totalTokens = files.reduce((sum, f) => sum + f.tokens, 0);
  const agentAttr = agentName ? ` agent="${escapeAttr(agentName)}"` : '';

  const lines: string[] = [];
  lines.push(
    `<codebase project="${escapeAttr(projectName)}"${agentAttr} files="${files.length}" tokens="${totalTokens}">`,
  );

  for (const file of files) {
    const langAttr = file.language ? ` language="${escapeAttr(file.language)}"` : '';
    lines.push(
      `  <file path="${escapeAttr(file.relativePath)}" tokens="${file.tokens}"${langAttr}>`,
    );
    lines.push('    <content>');
    lines.push(escapeXml(file.content));
    lines.push('    </content>');
    lines.push('  </file>');
  }

  lines.push('</codebase>');
  return lines.join('\n');
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/packer/formatter-xml.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/packer/formatter-xml.ts tests/packer/formatter-xml.test.ts
git commit -m "feat: XML formatter for pack output"
```

---

## Task 6: Markdown Formatter

**Files:**
- Create: `src/packer/formatter-md.ts`
- Create: `tests/packer/formatter-md.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/packer/formatter-md.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { formatMarkdown } from '../../src/packer/formatter-md.js';
import type { CollectedFile } from '../../src/packer/collector.js';

describe('formatMarkdown', () => {
  const files: CollectedFile[] = [
    { relativePath: 'src/index.ts', content: 'export {}', language: 'TypeScript', tokens: 3 },
    { relativePath: 'main.py', content: 'print("hi")', language: 'Python', tokens: 5 },
  ];

  it('includes project header with file count and tokens', () => {
    const md = formatMarkdown('my-app', files);
    expect(md).toContain('# my-app');
    expect(md).toContain('2 files');
  });

  it('includes file sections with language', () => {
    const md = formatMarkdown('my-app', files);
    expect(md).toContain('## src/index.ts');
    expect(md).toContain('TypeScript');
  });

  it('uses fenced code blocks with language', () => {
    const md = formatMarkdown('my-app', files);
    expect(md).toContain('```typescript');
    expect(md).toContain('```python');
    expect(md).toContain('export {}');
  });

  it('includes agent name when provided', () => {
    const md = formatMarkdown('my-app', files, 'api-agent');
    expect(md).toContain('api-agent');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/packer/formatter-md.test.ts`
Expected: FAIL

- [ ] **Step 3: Write implementation**

Create `src/packer/formatter-md.ts`:

```typescript
import type { CollectedFile } from './collector.js';
import { formatTokenCount } from './token-counter.js';

export function formatMarkdown(
  projectName: string,
  files: CollectedFile[],
  agentName?: string,
): string {
  const totalTokens = files.reduce((sum, f) => sum + f.tokens, 0);
  const agentLabel = agentName ? `, agent: ${agentName}` : '';

  const lines: string[] = [];
  lines.push(`# ${projectName} (${files.length} files, ~${formatTokenCount(totalTokens)} tokens${agentLabel})`);
  lines.push('');

  for (const file of files) {
    const langLabel = file.language ? `, ${file.language}` : '';
    lines.push(`## ${file.relativePath} (${formatTokenCount(file.tokens)} tokens${langLabel})`);
    lines.push('');
    const fence = file.language ? '```' + file.language.toLowerCase() : '```';
    lines.push(fence);
    lines.push(file.content);
    lines.push('```');
    lines.push('');
  }

  return lines.join('\n');
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/packer/formatter-md.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/packer/formatter-md.ts tests/packer/formatter-md.test.ts
git commit -m "feat: Markdown formatter for pack output"
```

---

## Task 7: Pack Orchestrator

**Files:**
- Create: `src/packer/index.ts`

- [ ] **Step 1: Write implementation**

Create `src/packer/index.ts`:

```typescript
import { basename } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { collectFiles } from './collector.js';
import type { CollectedFile } from './collector.js';
import { countTokens } from './token-counter.js';
import { formatXml } from './formatter-xml.js';
import { formatMarkdown } from './formatter-md.js';
import { scanForSecrets, isEnvFile } from '../security/scanner.js';
import { compressCode } from '../compress/regex-compress.js';
import type { AgentsConfig } from '../types.js';

export interface PackOptions {
  dir: string;
  format: 'xml' | 'md';
  compress: boolean;
  agent?: string;
  noSecurity: boolean;
}

export interface PackResult {
  output: string;
  fileCount: number;
  totalTokens: number;
  skippedFiles: Array<{ file: string; reason: string }>;
  compressionRatio?: number;
}

export function packProject(options: PackOptions): PackResult {
  const root = options.dir;
  const projectName = basename(root);
  const skippedFiles: Array<{ file: string; reason: string }> = [];

  // Resolve agent context paths if specified
  let agentContextPaths: string[] | undefined;
  let agentName: string | undefined;
  if (options.agent) {
    agentName = options.agent;
    agentContextPaths = resolveAgentPaths(root, options.agent);
    if (!agentContextPaths) {
      throw new Error(`Agent "${options.agent}" not found in .codebase-pilot/agents.json`);
    }
  }

  // Collect files
  let files = collectFiles(root, { agentContextPaths });

  // Security scan
  if (!options.noSecurity) {
    files = files.filter(file => {
      if (isEnvFile(file.relativePath)) {
        skippedFiles.push({ file: file.relativePath, reason: 'dotenv file' });
        return false;
      }
      const secrets = scanForSecrets(file.content, file.relativePath);
      if (secrets.length > 0) {
        const detail = secrets.map(s => `${s.pattern} (line ${s.line})`).join(', ');
        skippedFiles.push({ file: file.relativePath, reason: detail });
        return false;
      }
      return true;
    });
  }

  // Compression
  let originalTokens = files.reduce((sum, f) => sum + f.tokens, 0);
  if (options.compress) {
    files = files.map(file => {
      if (file.language) {
        const compressed = compressCode(file.content, file.language);
        return {
          ...file,
          content: compressed,
          tokens: countTokens(compressed),
        };
      }
      return file;
    });
  }

  const totalTokens = files.reduce((sum, f) => sum + f.tokens, 0);

  // Format output
  const output = options.format === 'xml'
    ? formatXml(projectName, files, agentName)
    : formatMarkdown(projectName, files, agentName);

  return {
    output,
    fileCount: files.length,
    totalTokens,
    skippedFiles,
    compressionRatio: options.compress
      ? Math.round((1 - totalTokens / originalTokens) * 100)
      : undefined,
  };
}

function resolveAgentPaths(root: string, agentName: string): string[] | null {
  const agentsPath = join(root, '.codebase-pilot', 'agents.json');
  if (!existsSync(agentsPath)) return null;

  try {
    const config: AgentsConfig = JSON.parse(readFileSync(agentsPath, 'utf8'));
    const agent = config.agents[agentName];
    if (!agent) return null;

    return agent.context.filter(
      p => p !== 'ALL agent outputs' && p !== 'Agent execution logs',
    );
  } catch {
    return null;
  }
}

export { collectFiles } from './collector.js';
export { countTokens, formatTokenCount } from './token-counter.js';
export { formatXml } from './formatter-xml.js';
export { formatMarkdown } from './formatter-md.js';
```

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 3: Commit**

```bash
git add src/packer/index.ts
git commit -m "feat: pack orchestrator (collect → security → compress → format)"
```

---

## Task 8: Pack CLI Command

**Files:**
- Create: `src/cli/pack.ts`
- Modify: `src/bin/codebase-pilot.ts` (add pack command)

- [ ] **Step 1: Create pack command**

Create `src/cli/pack.ts`:

```typescript
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { packProject } from '../packer/index.js';
import { formatTokenCount } from '../packer/token-counter.js';

interface PackCommandOptions {
  dir: string;
  format: string;
  output?: string;
  copy: boolean;
  compress: boolean;
  agent?: string;
  security: boolean;
}

export async function packCommand(options: PackCommandOptions): Promise<void> {
  const root = resolve(options.dir);
  const format = (options.format === 'md' ? 'md' : 'xml') as 'xml' | 'md';
  const ext = format === 'xml' ? '.xml' : '.md';
  const outputPath = options.output || `codebase-pilot-output${ext}`;

  console.log('');

  if (options.agent) {
    console.log(`  Packing agent context: ${options.agent}`);
  } else if (options.compress) {
    console.log('  Packing project (compressed)...');
  } else {
    console.log('  Packing project...');
  }
  console.log('');

  try {
    const result = packProject({
      dir: root,
      format,
      compress: options.compress,
      agent: options.agent,
      noSecurity: !options.security,
    });

    // Print security results
    if (result.skippedFiles.length > 0) {
      console.log(`  Security scan:  ${result.skippedFiles.length} file${result.skippedFiles.length > 1 ? 's' : ''} skipped (secrets detected)`);
      for (const skip of result.skippedFiles) {
        console.log(`    ${skip.file.padEnd(30)} — ${skip.reason}`);
      }
      console.log('');
    } else if (options.security) {
      console.log('  Security scan:  clean');
      console.log('');
    }

    // Output
    if (options.copy) {
      // Clipboard support — write to stdout for piping
      process.stdout.write(result.output);
      return;
    }

    writeFileSync(outputPath, result.output, 'utf8');

    console.log(`  Files:    ${result.fileCount} packed`);
    if (result.compressionRatio !== undefined) {
      const originalTokens = Math.round(result.totalTokens / (1 - result.compressionRatio / 100));
      console.log(`  Tokens:   ~${formatTokenCount(result.totalTokens)} (compressed from ~${formatTokenCount(originalTokens)}, ${result.compressionRatio}% reduction)`);
    } else {
      console.log(`  Tokens:   ~${formatTokenCount(result.totalTokens)} (estimated)`);
    }
    console.log(`  Format:   ${format.toUpperCase()}`);
    console.log(`  Output:   ${outputPath}`);
    console.log('');
    console.log('  Done!');
    console.log('');
  } catch (err) {
    console.error(`  Error: ${(err as Error).message}`);
    console.log('');
    process.exitCode = 1;
  }
}
```

- [ ] **Step 2: Register pack command in CLI entry point**

In `src/bin/codebase-pilot.ts`, add import and command registration.

Add to imports at the top:
```typescript
import { packCommand } from '../cli/pack.js';
```

Add before `program.parse()`:
```typescript
program
  .command('pack')
  .description('Pack codebase into AI-friendly single file')
  .option('-d, --dir <path>', 'Project directory', '.')
  .option('-f, --format <type>', 'Output format: xml or md', 'xml')
  .option('-o, --output <path>', 'Output file path')
  .option('-c, --copy', 'Copy to stdout for piping', false)
  .option('--compress', 'Compress code (extract signatures, fold bodies)', false)
  .option('--agent <name>', 'Pack only files in agent context')
  .option('--no-security', 'Skip secret detection')
  .action(packCommand);
```

- [ ] **Step 3: Run build and quick manual test**

Run: `npm run build && node dist/bin/codebase-pilot.js pack --help`
Expected: Shows pack help with all options

- [ ] **Step 4: Commit**

```bash
git add src/cli/pack.ts src/bin/codebase-pilot.ts
git commit -m "feat: add pack CLI command"
```

---

## Task 9: Tokens CLI Command

**Files:**
- Create: `src/cli/tokens.ts`
- Modify: `src/bin/codebase-pilot.ts` (add tokens command)

- [ ] **Step 1: Create tokens command**

Create `src/cli/tokens.ts`:

```typescript
import { resolve } from 'node:path';
import { collectFiles } from '../packer/collector.js';
import { formatTokenCount } from '../packer/token-counter.js';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AgentsConfig } from '../types.js';

interface TokensCommandOptions {
  dir: string;
  sort: string;
  limit: string;
  agent?: string;
}

export async function tokensCommand(options: TokensCommandOptions): Promise<void> {
  const root = resolve(options.dir);
  const sortBy = options.sort === 'name' ? 'name' : 'size';
  const limit = parseInt(options.limit, 10) || 20;

  console.log('');

  // Resolve agent context if specified
  let agentContextPaths: string[] | undefined;
  if (options.agent) {
    agentContextPaths = resolveAgentPaths(root, options.agent);
    if (!agentContextPaths) {
      console.log(`  Error: Agent "${options.agent}" not found in .codebase-pilot/agents.json`);
      console.log('');
      process.exitCode = 1;
      return;
    }
    console.log(`  Token count for agent: ${options.agent}`);
  } else {
    console.log('  Token count by file:');
  }
  console.log('');

  const files = collectFiles(root, { agentContextPaths });

  if (files.length === 0) {
    console.log('  No files found.');
    console.log('');
    return;
  }

  // Sort
  const sorted = [...files];
  if (sortBy === 'size') {
    sorted.sort((a, b) => b.tokens - a.tokens);
  } else {
    sorted.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  }

  const totalTokens = files.reduce((sum, f) => sum + f.tokens, 0);
  const display = sorted.slice(0, limit);
  const maxPathLen = Math.min(40, Math.max(...display.map(f => f.relativePath.length)));
  const maxTokens = display[0]?.tokens || 1;

  for (const file of display) {
    const pct = totalTokens > 0 ? Math.round((file.tokens / totalTokens) * 100) : 0;
    const barLen = Math.round((file.tokens / maxTokens) * 16);
    const bar = '\u2588'.repeat(barLen) + '\u2591'.repeat(16 - barLen);
    const path = file.relativePath.padEnd(maxPathLen);
    const tokens = formatTokenCount(file.tokens).padStart(8);
    console.log(`    ${path}  ${tokens} tokens  ${bar}  ${pct}%`);
  }

  if (files.length > limit) {
    console.log(`    ... and ${files.length - limit} more files`);
  }

  console.log('');
  console.log(`  Total: ${formatTokenCount(totalTokens)} tokens across ${files.length} files`);
  console.log('');
}

function resolveAgentPaths(root: string, agentName: string): string[] | null {
  const agentsPath = join(root, '.codebase-pilot', 'agents.json');
  if (!existsSync(agentsPath)) return null;
  try {
    const config: AgentsConfig = JSON.parse(readFileSync(agentsPath, 'utf8'));
    const agent = config.agents[agentName];
    if (!agent) return null;
    return agent.context.filter(
      p => p !== 'ALL agent outputs' && p !== 'Agent execution logs',
    );
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Register tokens command in CLI entry point**

In `src/bin/codebase-pilot.ts`, add import:
```typescript
import { tokensCommand } from '../cli/tokens.js';
```

Add before `program.parse()`:
```typescript
program
  .command('tokens')
  .description('Show token counts per file and total')
  .option('-d, --dir <path>', 'Project directory', '.')
  .option('-s, --sort <type>', 'Sort by: size or name', 'size')
  .option('-l, --limit <n>', 'Show top N files', '20')
  .option('--agent <name>', 'Count tokens for specific agent context')
  .action(tokensCommand);
```

- [ ] **Step 3: Build and manual test**

Run: `npm run build && node dist/bin/codebase-pilot.js tokens --help`
Expected: Shows tokens help

- [ ] **Step 4: Commit**

```bash
git add src/cli/tokens.ts src/bin/codebase-pilot.ts
git commit -m "feat: add tokens CLI command"
```

---

## Task 10: Tree-sitter Compression (Tier B)

**Files:**
- Create: `src/compress/index.ts`
- Create: `src/compress/treesitter-compress.ts`

- [ ] **Step 1: Create compression orchestrator**

Create `src/compress/index.ts`:

```typescript
import { compressCode as regexCompress } from './regex-compress.js';
import { treeSitterCompress, isTreeSitterAvailable } from './treesitter-compress.js';

export interface CompressResult {
  code: string;
  method: 'tree-sitter' | 'regex' | 'none';
}

/**
 * Compress code using best available method.
 * Tier B (tree-sitter) if available, falls back to Tier A (regex).
 */
export function compress(code: string, language: string): CompressResult {
  // Try tree-sitter first
  if (isTreeSitterAvailable(language)) {
    try {
      const result = treeSitterCompress(code, language);
      if (result) return { code: result, method: 'tree-sitter' };
    } catch {
      // Fall through to regex
    }
  }

  // Fall back to regex compression
  const result = regexCompress(code, language);
  if (result !== code) {
    return { code: result, method: 'regex' };
  }

  return { code, method: 'none' };
}

export { compressCode } from './regex-compress.js';
```

- [ ] **Step 2: Create tree-sitter compression stub**

Create `src/compress/treesitter-compress.ts`:

```typescript
/**
 * Tree-sitter enhanced compression (Tier B).
 * Uses optional tree-sitter dependency for accurate AST-based compression.
 * Returns null if tree-sitter is not available for the given language.
 */

const LANGUAGE_GRAMMAR_MAP: Record<string, string> = {
  TypeScript: 'tree-sitter-typescript',
  JavaScript: 'tree-sitter-typescript',
  Python: 'tree-sitter-python',
  Go: 'tree-sitter-go',
  Rust: 'tree-sitter-rust',
};

let treeSitterAvailable: boolean | null = null;

export function isTreeSitterAvailable(language: string): boolean {
  if (!(language in LANGUAGE_GRAMMAR_MAP)) return false;

  if (treeSitterAvailable === null) {
    try {
      require('tree-sitter');
      treeSitterAvailable = true;
    } catch {
      treeSitterAvailable = false;
    }
  }

  return treeSitterAvailable;
}

export function treeSitterCompress(code: string, language: string): string | null {
  if (!isTreeSitterAvailable(language)) return null;

  // Tree-sitter integration will be implemented in v0.2
  // For now, return null to fall back to regex compression
  return null;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/compress/index.ts src/compress/treesitter-compress.ts
git commit -m "feat: compression orchestrator with tree-sitter stub (Tier B)"
```

---

## Task 11: Integration Tests + Self-Test + Update Exports

**Files:**
- Create: `tests/cli/pack.test.ts`
- Create: `tests/cli/tokens.test.ts`
- Modify: `src/index.ts` (add new exports)

- [ ] **Step 1: Create pack integration test**

Create `tests/cli/pack.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { packProject } from '../../src/packer/index.js';

describe('packProject integration', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cp-pack-'));
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeFileSync(join(tmpDir, 'src', 'index.ts'), 'export function hello() {\n  return "world";\n}');
    writeFileSync(join(tmpDir, 'src', 'app.ts'), 'const x = 1;');
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('packs project as XML', () => {
    const result = packProject({ dir: tmpDir, format: 'xml', compress: false, noSecurity: false });
    expect(result.output).toContain('<codebase');
    expect(result.fileCount).toBe(2);
    expect(result.totalTokens).toBeGreaterThan(0);
  });

  it('packs project as Markdown', () => {
    const result = packProject({ dir: tmpDir, format: 'md', compress: false, noSecurity: false });
    expect(result.output).toContain('# ');
    expect(result.output).toContain('```typescript');
  });

  it('compresses code when --compress is used', () => {
    const normal = packProject({ dir: tmpDir, format: 'xml', compress: false, noSecurity: true });
    const compressed = packProject({ dir: tmpDir, format: 'xml', compress: true, noSecurity: true });
    expect(compressed.totalTokens).toBeLessThanOrEqual(normal.totalTokens);
  });

  it('skips files with secrets', () => {
    writeFileSync(join(tmpDir, 'src', 'config.ts'), 'const key = "AKIAIOSFODNN7EXAMPLE";');
    const result = packProject({ dir: tmpDir, format: 'xml', compress: false, noSecurity: false });
    expect(result.skippedFiles.length).toBe(1);
    expect(result.skippedFiles[0].file).toContain('config.ts');
  });

  it('scopes to agent context', () => {
    mkdirSync(join(tmpDir, '.codebase-pilot'), { recursive: true });
    writeFileSync(join(tmpDir, '.codebase-pilot', 'agents.json'), JSON.stringify({
      version: '1.0.0',
      project: 'test',
      agents: {
        'src-agent': { name: 'src-agent', model: 'haiku', context: ['src/'], task: 'test', layer: 1, dependsOn: [] },
      },
      patterns: {},
    }));
    mkdirSync(join(tmpDir, 'docs'), { recursive: true });
    writeFileSync(join(tmpDir, 'docs', 'readme.md'), '# readme');

    const result = packProject({ dir: tmpDir, format: 'xml', compress: false, noSecurity: true, agent: 'src-agent' });
    expect(result.fileCount).toBe(2); // only src/ files
    expect(result.output).toContain('agent="src-agent"');
    expect(result.output).not.toContain('readme.md');
  });
});
```

- [ ] **Step 2: Create tokens integration test**

Create `tests/cli/tokens.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { collectFiles } from '../../src/packer/collector.js';
import { countTokens } from '../../src/packer/token-counter.js';

describe('tokens integration', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cp-tokens-'));
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeFileSync(join(tmpDir, 'src', 'big.ts'), 'x'.repeat(4000));
    writeFileSync(join(tmpDir, 'src', 'small.ts'), 'export {}');
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('collects files with token counts', () => {
    const files = collectFiles(tmpDir, {});
    expect(files.length).toBe(2);
    expect(files.every(f => f.tokens > 0)).toBe(true);
  });

  it('sorts by token size descending', () => {
    const files = collectFiles(tmpDir, {});
    const sorted = [...files].sort((a, b) => b.tokens - a.tokens);
    expect(sorted[0].tokens).toBeGreaterThan(sorted[1].tokens);
  });

  it('counts tokens accurately', () => {
    const tokens = countTokens('x'.repeat(4000));
    expect(tokens).toBe(1000); // 4000/4
  });
});
```

- [ ] **Step 3: Update src/index.ts with new exports**

Add to `src/index.ts`:

```typescript
// Packer exports
export { packProject } from './packer/index.js';
export { collectFiles } from './packer/collector.js';
export { countTokens, formatTokenCount } from './packer/token-counter.js';
export { formatXml } from './packer/formatter-xml.js';
export { formatMarkdown } from './packer/formatter-md.js';

// Security exports
export { scanForSecrets, isEnvFile } from './security/scanner.js';

// Compression exports
export { compress, compressCode } from './compress/index.js';
```

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 5: Build and self-test**

```bash
npm run build
node dist/bin/codebase-pilot.js pack --dir . --format xml --output self-test.xml
node dist/bin/codebase-pilot.js tokens --dir .
node dist/bin/codebase-pilot.js pack --dir . --compress --format md --output self-test-compressed.md
node dist/bin/codebase-pilot.js pack --agent codebase-pilot-cli-agent --dir .
```

Verify:
- XML output contains all source files
- Token counts are shown per file
- Compressed output is smaller than uncompressed
- Agent-scoped pack only includes files from that agent's context

- [ ] **Step 6: Clean up test artifacts and commit**

```bash
rm -f self-test.xml self-test-compressed.md codebase-pilot-output.xml
git add src/index.ts tests/cli/pack.test.ts tests/cli/tokens.test.ts
git commit -m "feat: integration tests + self-test for pack and tokens commands"
```

---

## Task Parallelization Summary

| Round | Tasks | Agents |
|-------|-------|--------|
| 1 | Task 1 (tokens), Task 2 (security), Task 3 (compression) | 3 parallel |
| 2 | Task 4 (collector) | 1 (depends on registry) |
| 3 | Task 5 (XML), Task 6 (MD) | 2 parallel |
| 4 | Task 7 (orchestrator) | 1 (depends on 4,5,6) |
| 5 | Task 8 (pack CLI), Task 9 (tokens CLI) | 2 parallel |
| 6 | Task 10 (tree-sitter stub) | 1 |
| 7 | Task 11 (integration + self-test) | 1 |

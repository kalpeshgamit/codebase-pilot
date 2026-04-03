# Contributing

## Setup

```bash
git clone https://github.com/nicgamit/codebase-pilot
cd codebase-pilot
npm install --legacy-peer-deps
```

## Development

```bash
# Run CLI in dev mode
npx tsx src/bin/codebase-pilot.ts init --dir /path/to/project

# Type check
npm run typecheck

# Run tests
npm test

# Build
npm run build
```

## Project Rules

- Zero cloud dependencies — everything runs locally
- Zero lock-in — eject must always work
- Language-agnostic — detection via file patterns, not hardcoded
- Monorepo-aware — all scanners check workspace packages
- Merge, don't overwrite — respect existing Claude Code config

## Code Standards

- TypeScript strict mode
- ESM modules (type: "module")
- No `require()` — use `import` everywhere
- Node built-in imports use `node:` prefix (`node:fs`, `node:path`)
- Functions over classes where possible
- Early returns over nested conditionals

## Project Structure

```
src/
  bin/              # CLI entry point
  cli/              # 7 commands: init, scan, fix, health, eject, pack, tokens
  scanner/          # Project detection engine
  agents/           # Agent generator (scan → agents.json)
  generators/       # File generators (CLAUDE.md, .claudeignore, etc.)
  packer/           # Codebase packing engine (collector, formatters, token counter)
  security/         # Secret detection (152 patterns, 15 categories)
  compress/         # Code compression (Tier A regex, Tier B tree-sitter)
  types.ts          # All interfaces
  index.ts          # Public API
tests/
  security/         # Secret detection tests
  packer/           # Pack engine tests
  compress/         # Compression tests
```

## Adding a New Framework Detector

Edit `src/scanner/framework.ts`:

```typescript
// Add to DETECTORS array (order matters — more specific first)
{ name: 'YourFramework', detect: (r) => hasDepIn(r, 'your-package') },
```

## Adding a New Language

Edit `src/scanner/language.ts`:

```typescript
// Add to LANGUAGE_MAP
'.ext': 'LanguageName',
```

## Adding a New ORM/Database

Edit `src/scanner/database.ts`:

```typescript
// Add to DETECTORS array
{
  orm: 'YourORM',
  type: 'auto',
  detect: (r) => hasNodeDep(r, 'your-orm-package') ? 'auto' : null,
},
```

## Adding a Security Pattern

Edit `src/security/patterns.ts` and add to the appropriate category:

```typescript
// In src/security/patterns.ts, add to the appropriate category:
{ name: 'MyService API Key', category: 'cloud', regex: /myservice_[A-Za-z0-9]{32,}/ },
```

Then add a test case in `tests/security/` to verify the pattern matches real-world examples and does not produce false positives.

## Commit Messages

Follow conventional commits:

```
feat: add FastAPI framework detection
fix: monorepo scanner missing nested packages
docs: add contributing guide
test: add vitest tests for language detector
```

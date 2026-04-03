# Contributing to codebase-pilot

Thanks for your interest in contributing! This guide will help you get started.

## Development Setup

```bash
git clone https://github.com/codebase-pilot/codebase-pilot.git
cd codebase-pilot
npm install
npm run build
```

## Project Structure

```
src/
  bin/              # CLI entry point
  cli/              # 7 commands: init, scan, fix, health, eject, pack, tokens
  scanner/          # Project detection (delegates to registry)
  registry/         # Data-driven language/framework/ORM/test detection
  agents/           # Agent generator (scan → agents.json)
  generators/       # File generators (CLAUDE.md, .claudeignore, etc.)
  packer/           # Codebase packing engine (collector, formatters, token counter)
  security/         # Secret detection (152 patterns, 15 categories)
  compress/         # Code compression (Tier A regex, Tier B tree-sitter)
  types.ts          # All interfaces
  utils.ts          # Cross-platform utilities
  index.ts          # Public API
tests/
  security/         # Secret detection tests
  packer/           # Pack engine tests
  compress/         # Compression tests
```

## Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run typecheck     # TypeScript type checking
npm run build         # Build with tsup
```

## Adding a New Language

Add an entry to `src/registry/languages.ts`:

```typescript
{
  name: 'MyLang',
  extensions: ['.ml'],
  tier: 2,  // 1=full ecosystem, 2=pkg+test, 3=extension only
  skipDirs: ['build'],
  entryPoints: ['src/main.ml'],
  packageFiles: ['manifest.toml'],
}
```

## Adding a New Framework

Add a detector to `src/registry/frameworks.ts`:

```typescript
{
  name: 'MyFramework',
  language: 'MyLang',
  category: 'backend',
  detect: (root) => fileContains(join(root, 'manifest.toml'), 'myframework'),
}
```

Same pattern for test runners (`src/registry/testing.ts`) and ORMs (`src/registry/databases.ts`).

## Adding a Security Pattern

Edit `src/security/patterns.ts` and add to the appropriate category:

```typescript
// In src/security/patterns.ts, add to the appropriate category:
{ name: 'MyService API Key', category: 'cloud', regex: /myservice_[A-Za-z0-9]{32,}/ },
```

Then add a test case in `tests/security/` to verify the pattern matches real-world examples and does not produce false positives.

## Code Style

- ESM modules only (`import`, never `require`)
- Node built-in imports use `node:` prefix
- Functions over classes
- Use `toPosix()` from `src/utils.ts` for config paths
- Use `path.join()` for filesystem operations

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Write tests for new functionality
4. Ensure all tests pass (`npm test`)
5. Ensure TypeScript compiles (`npm run typecheck`)
6. Submit a pull request

## Principles

- **Zero cloud** — no API calls, no accounts, no telemetry
- **Zero lock-in** — eject must always work
- **Cross-platform** — Linux, macOS, Windows
- **Data-driven** — add languages/frameworks via registry, not code changes

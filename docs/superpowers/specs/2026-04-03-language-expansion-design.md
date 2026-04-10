# Language Expansion & Public Plugin — Design Spec

**Date:** 2026-04-03
**Status:** Approved
**Scope:** Expand from 23 to 50+ languages, refactor to data-driven registry, fix self-test issues, add test suite, prepare for npm publish + Claude Code plugin

---

## Problem Statement

Self-test of codebase-pilot on its own project revealed:
1. `fix` command can't resolve `src/types/` → `src/types.ts` (file vs directory)
2. Package type detected as "unknown" for CLI tool projects
3. Zero test files — high regression risk
4. All detection data hardcoded in source — adding languages means editing code

Additionally, to serve as a public plugin for all Claude-based coding, we need 50+ language support across diverse ecosystems.

## Approach: Hybrid Data Registry + Detection Functions

Static data (extensions, skip dirs, entry points) lives in TypeScript registry files. Complex detection logic (framework/ORM checks) uses small detector functions referenced by the registry. Tier 2/3 languages only need registry entries. Tier 1 languages get custom detectors.

## Language Tiers

### Tier 1 — Full Ecosystem (15 languages)

Full framework, ORM, test runner, package manager, build tool detection.

| Language | Extensions | Frameworks | ORMs | Test Runners | Pkg Managers |
|----------|-----------|-----------|------|-------------|-------------|
| TypeScript | .ts, .tsx | Next.js, Nuxt, SvelteKit, Remix, Astro, Express, Fastify, Hono, NestJS, Koa | Prisma, Drizzle, TypeORM, Sequelize, Mongoose | Vitest, Jest, Mocha | npm, pnpm, yarn, bun |
| JavaScript | .js, .jsx, .mjs, .cjs | (shared with TS) | (shared with TS) | (shared with TS) | (shared with TS) |
| Python | .py, .pyw, .pyi | Django, FastAPI, Flask, Starlette, Tornado, Sanic | SQLAlchemy, Django ORM, Tortoise, Peewee | pytest, unittest | pip, poetry, uv, conda |
| Go | .go | Gin, Echo, Fiber, Chi, Gorilla | GORM, sqlx, ent, sqlc | go test | go mod |
| Rust | .rs | Actix, Axum, Rocket, Warp, Tide | Diesel, SeaORM, sqlx | cargo test | cargo |
| Java | .java | Spring Boot, Quarkus, Micronaut, Vert.x | Hibernate, JPA, jOOQ, MyBatis | JUnit, TestNG | Maven, Gradle |
| Kotlin | .kt, .kts | Ktor, Spring Boot | Exposed, Ktorm | JUnit, Kotest | Gradle, Maven |
| Ruby | .rb, .rake | Rails, Sinatra, Hanami | ActiveRecord, Sequel, ROM | RSpec, Minitest | Bundler |
| PHP | .php | Laravel, Symfony, Slim, Lumen | Eloquent, Doctrine | PHPUnit, Pest | Composer |
| C# | .cs, .csx | ASP.NET Core, Blazor, MAUI | Entity Framework, Dapper, NHibernate | xUnit, NUnit, MSTest | NuGet, dotnet |
| Swift | .swift | Vapor, Hummingbird | Fluent | XCTest, Quick | SPM |
| Dart | .dart | Flutter, Dart Frog, Serverpod | Drift, Floor | flutter_test, test | pub |
| Elixir | .ex, .exs | Phoenix, Plug | Ecto | ExUnit | Mix |
| Scala | .scala, .sc | Play, Akka HTTP, http4s, ZIO HTTP | Slick, Doobie, Quill | ScalaTest, Specs2, MUnit | sbt, Mill |
| C/C++ | .c, .h, .cpp, .hpp, .cc, .cxx | Qt, Boost.Beast, Crow, Drogon | — | GoogleTest, Catch2, CTest | CMake, Conan, vcpkg, Make |
| Zig | .zig | — | — | zig test | zig build |

### Tier 2 — Package Manager + Test Runner (20 languages)

Extension detection + package manager + test runner + entry points.

| Language | Extensions | Test Runner | Pkg Manager |
|----------|-----------|------------|-------------|
| Haskell | .hs, .lhs | HSpec, Tasty | Cabal, Stack |
| Clojure | .clj, .cljs, .cljc, .edn | clojure.test | Leiningen, deps.edn |
| F# | .fs, .fsi, .fsx | Expecto, xUnit | dotnet, Paket |
| OCaml | .ml, .mli | OUnit, Alcotest | opam, dune |
| Nim | .nim, .nims | unittest | Nimble |
| Crystal | .cr | crystal spec | Shards |
| Julia | .jl | Test (stdlib) | Pkg |
| Perl | .pl, .pm, .t | Test::More, prove | CPAN, cpanm |
| Lua | .lua | busted, luaunit | LuaRocks |
| R | .r, .R, .Rmd | testthat | CRAN, renv |
| Erlang | .erl, .hrl | EUnit, Common Test | rebar3 |
| Groovy | .groovy, .gvy | Spock, JUnit | Gradle |
| V | .v | v test | vpkg |
| Objective-C | .m, .mm | XCTest | CocoaPods, SPM |
| D | .d | unittest | dub |
| Ada | .adb, .ads | AUnit | Alire, gprbuild |
| Fortran | .f90, .f95, .f03, .f | pFUnit | fpm |
| COBOL | .cob, .cbl, .cpy | — | — |
| Hack | .hack, .hh | HackTest | — |
| Gleam | .gleam | gleeunit | gleam |

### Tier 3 — Extension Only (15+ languages)

File extension mapping + generic agent template.

| Language | Extensions |
|----------|-----------|
| Lisp | .lisp, .lsp, .cl |
| Scheme | .scm, .ss |
| Racket | .rkt |
| Prolog | .pl, .pro |
| Forth | .fs, .fth |
| APL | .apl, .dyalog |
| VHDL | .vhd, .vhdl |
| Verilog | .v, .sv, .svh |
| Tcl | .tcl |
| Bash/Shell | .sh, .bash, .zsh |
| PowerShell | .ps1, .psm1, .psd1 |
| Terraform/HCL | .tf, .hcl |
| Solidity | .sol |
| Move | .move |
| Cairo | .cairo |
| GraphQL | .graphql, .gql |
| Protobuf | .proto |
| SQL | .sql |

**Extension Conflict Resolution:**
- `.v` → check directory context: `src/` patterns = V lang, `rtl/` or `tb/` = Verilog
- `.fs` → check directory context: if F# project files (.fsproj) present = F#, else = Forth
- `.pl` → check first line shebang or directory: Perl (`#!/usr/bin/perl`) vs Prolog

## Registry Architecture

### File Structure

```
src/registry/
  languages.ts          # All 50+ languages, tiers, extensions
  frameworks.ts         # Tier 1 framework detectors
  databases.ts          # Tier 1 ORM detectors
  testing.ts            # Tier 1+2 test runner detectors
  package-managers.ts   # Tier 1+2 package manager detection
  skip-dirs.ts          # Per-language build/cache dirs to skip
  entry-points.ts       # Per-language entry point patterns
  index.ts              # Registry loader + lookup helpers
```

### Registry Types

```typescript
type Tier = 1 | 2 | 3;

interface LanguageEntry {
  name: string;
  extensions: string[];
  tier: Tier;
  skipDirs?: string[];           // Language-specific dirs to skip
  entryPoints?: string[];        // Common entry point patterns
  packageFiles?: string[];       // e.g., package.json, go.mod, Cargo.toml
}

interface FrameworkDetector {
  name: string;
  language: string;
  detect: (root: string) => Promise<boolean>;
  category: 'backend' | 'frontend' | 'fullstack' | 'mobile' | 'desktop';
}

interface TestRunnerDetector {
  name: string;
  language: string;
  detect: (root: string) => Promise<boolean>;
}

interface OrmDetector {
  name: string;
  language: string;
  detect: (root: string) => Promise<{ found: boolean; type?: string; schemaPath?: string }>;
}

interface PackageManagerDetector {
  name: string;
  language: string;
  lockFile?: string;
  configFile: string;
  detect: (root: string) => Promise<boolean>;
}
```

### Scanner Refactor

Current scanners read from hardcoded maps. After refactor:

```typescript
// Before (language.ts)
const LANGUAGE_MAP = { '.ts': 'TypeScript', '.py': 'Python', ... };

// After (language.ts)
import { getLanguageRegistry } from '../registry/index.js';
const registry = getLanguageRegistry();
// registry provides extension lookup, skip dirs, entry points
```

Each scanner becomes a thin orchestrator that delegates to registry data.

## Fix Command — Smart Path Resolution

### Current behavior
- Checks if path exists
- If not → "manual fix needed"

### New behavior

```
Path not found
  → Try file variants (.ts, .js, .py, .go, .rs based on detected language)
  → Try directory variant (drop extension)
  → Fuzzy search: list parent directory, find closest match by name
  → If single match → auto-fix + log
  → If multiple matches → show candidates, pick best, log reasoning
  → If no match → "manual fix needed" (current behavior)
```

## Package Type Detection Fix

### New inference rules (in priority order)

1. **`bin` field in package.json** → `cli`
2. **CLI framework deps:** commander, yargs, meow, clipanion, oclif, clap (Rust), cobra/urfave-cli (Go), click/typer (Python), thor (Ruby) → `cli`
3. **Directory patterns:** `src/commands/`, `src/cli/`, `cmd/` → `cli`
4. **Server framework deps:** express, fastify, gin, actix, django, rails → `api`
5. **Frontend framework deps:** react, vue, angular, svelte, flutter → `web`
6. **Existing rules** (by name, by structure) → as-is
7. **Default** → `unknown`

## Test Suite

### Structure

```
tests/
  registry/
    languages.test.ts        # Validate all entries, no duplicate extensions, all tiers
    frameworks.test.ts       # Each Tier 1 framework detector
    databases.test.ts        # Each Tier 1 ORM detector
  scanner/
    language.test.ts         # Detection from sample directory trees
    framework.test.ts        # Detection from mock config files
    database.test.ts         # Detection from mock config files
    structure.test.ts        # Monorepo detection, package type inference
    testing.test.ts          # Test runner detection
  cli/
    fix.test.ts              # Smart path resolution
    health.test.ts           # Health check validation
    init.test.ts             # End-to-end init on mock projects
  agents/
    generator.test.ts        # Agent generation, layers, models, patterns
```

### Testing approach
- Use `tmp` directories with minimal file structures
- No mocking file system — create real temp dirs
- Validate registry data integrity (no duplicates, all required fields)
- Snapshot tests for generated agents.json and CLAUDE.md

## Distribution

### npm package (`codebase-pilot`)
- `npx codebase-pilot init` works for any project
- Zero required cloud deps
- Tree-sitter stays optional
- Target: publish to npm after test suite passes

### Claude Code plugin (future wrapper)
- Registers `/pilot-init`, `/pilot-health`, `/pilot-scan` slash commands
- Delegates to npm CLI
- Separate package or monorepo workspace

## Implementation Order

1. **Registry refactor** — create `src/registry/`, move hardcoded data, add types
2. **Language expansion** — populate all 50+ languages across 3 tiers
3. **Scanner refactor** — wire scanners to read from registry
4. **Framework/ORM/test expansion** — add all Tier 1 detectors
5. **Fix command enhancement** — smart path resolution
6. **Package type fix** — improved inference rules
7. **Test suite** — comprehensive tests for all of the above
8. **npm publish prep** — package.json metadata, README, CI

## Success Criteria

- `codebase-pilot init` works on projects in any of the 50+ supported languages
- Self-test on own project: no "unknown" package type, no stale paths
- `fix` command resolves file↔directory mismatches automatically
- All tests pass, >80% coverage on scanner + registry
- Ready for `npm publish`

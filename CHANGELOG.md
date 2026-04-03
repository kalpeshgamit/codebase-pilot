# Changelog

## [0.1.0] — 2026-04-03

### Added

**Context engine (pack + tokens)**
- `codebase-pilot pack` — pack codebase into XML or Markdown for AI context
- `codebase-pilot tokens` — per-file token breakdown with savings estimates and weekly stats
- `--compress` flag — regex-based code compression, 60–90% token reduction
- `--agent <name>` flag — scope pack/tokens to a single agent's context paths
- `--copy` flag — write output to stdout for clipboard piping
- Usage logger — tracks each pack run, shows today/weekly savings in `tokens` output

**Security scanner**
- 152 patterns across 15 categories: cloud, VCS, payment, messaging, AI LLMs, AI infra, AI devtools, database, dev infra, auth, monitoring, social, crypto, crypto-key, generic
- Runs automatically on every `pack`, skips files with detected secrets
- `--no-security` flag to disable

**Language registry (56 languages)**
- Tier 1 (17 languages): full ecosystem detection — entry points, package files, skip dirs, framework/ORM/test runners
- Tier 2 (21 languages): package manager + test runner detection
- Tier 3 (18 languages): extension-only recognition for token counting and language percentage

**Framework detection**
- 58 detectors across 14 languages
- TypeScript/JS: Next.js, Nuxt, SvelteKit, Remix, Astro, Express, Fastify, Hono, NestJS, Koa, React, Vue, Angular, Svelte
- Python: Django, FastAPI, Flask, Starlette, Tornado, Sanic
- Go: Gin, Echo, Fiber, Chi, Gorilla
- Rust: Actix, Axum, Rocket, Warp, Tide
- Java: Spring Boot, Quarkus, Micronaut, Vert.x
- Ruby: Rails, Sinatra, Hanami
- PHP: Laravel, Symfony, Slim
- C#: ASP.NET Core, Blazor, MAUI
- Swift: Vapor, Hummingbird
- Dart: Flutter, Dart Frog, Serverpod
- Elixir: Phoenix, Plug
- Scala: Play, Akka HTTP, http4s, ZIO HTTP
- Kotlin: Ktor
- C++: Qt, Drogon

**Test runner detection (39 runners)**
Vitest, Jest, Mocha, pytest, unittest, Go test, Cargo test, JUnit, TestNG, Kotest, RSpec, Minitest, PHPUnit, Pest, xUnit, NUnit, MSTest, XCTest, Quick, flutter_test, ExUnit, ScalaTest, GoogleTest, Catch2, and more.

**ORM detection (32 detectors)**
Prisma, Drizzle, TypeORM, Sequelize, Mongoose, SQLAlchemy, Django ORM, GORM, Diesel, SeaORM, Hibernate, ActiveRecord, Eloquent, Entity Framework, Ecto, and more.

**CI / cross-platform**
- GitHub Actions CI matrix: ubuntu, macos, windows × Node 18, 20, 22
- Windows path normalization via `toPosix()` for config storage
- `path.join()` for all filesystem operations

**Core commands**
- `init` — scan project, generate CLAUDE.md, .claudeignore, agents.json, slash commands
- `scan` — re-detect and update configs
- `fix` — auto-repair stale agent context paths
- `health` — validate agent setup
- `eject` — export all generated files, remove dependency

[0.1.0]: https://github.com/nicgamit/codebase-pilot/releases/tag/v0.1.0

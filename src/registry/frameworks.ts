import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { FrameworkDetector } from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readFileSafe(path: string): string {
  try { return readFileSync(path, 'utf8'); } catch { return ''; }
}

function fileContains(path: string, text: string): boolean {
  if (!existsSync(path)) return false;
  return readFileSafe(path).includes(text);
}

function readPkgJson(root: string): Record<string, unknown> | null {
  const p = join(root, 'package.json');
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
}

function hasDepIn(root: string, dep: string): boolean {
  const pkg = readPkgJson(root);
  if (!pkg) return false;
  const deps = {
    ...(pkg.dependencies as Record<string, string> || {}),
    ...(pkg.devDependencies as Record<string, string> || {}),
  };
  return dep in deps;
}

function hasPythonDep(root: string, dep: string): boolean {
  for (const file of ['requirements.txt', 'Pipfile', 'pyproject.toml', 'setup.py']) {
    if (fileContains(join(root, file), dep)) return true;
  }
  return false;
}

function hasGoDep(root: string, dep: string): boolean {
  return fileContains(join(root, 'go.mod'), dep);
}

function hasRustDep(root: string, dep: string): boolean {
  return fileContains(join(root, 'Cargo.toml'), dep);
}

function hasRubyDep(root: string, dep: string): boolean {
  return fileContains(join(root, 'Gemfile'), dep);
}

function hasComposerDep(root: string, dep: string): boolean {
  const p = join(root, 'composer.json');
  if (!existsSync(p)) return false;
  try {
    const json = JSON.parse(readFileSync(p, 'utf8'));
    const deps = { ...(json.require || {}), ...(json['require-dev'] || {}) };
    return dep in deps;
  } catch { return false; }
}

function csprojContains(root: string, text: string): boolean {
  try {
    const entries = readdirSync(root).filter(f => f.endsWith('.csproj'));
    return entries.some(f => fileContains(join(root, f), text));
  } catch { return false; }
}

function hasJavaDep(root: string, artifact: string): boolean {
  if (fileContains(join(root, 'pom.xml'), artifact)) return true;
  if (fileContains(join(root, 'build.gradle'), artifact)) return true;
  if (fileContains(join(root, 'build.gradle.kts'), artifact)) return true;
  return false;
}

function hasSwiftDep(root: string, dep: string): boolean {
  return fileContains(join(root, 'Package.swift'), dep);
}

function hasPubDep(root: string, dep: string): boolean {
  return fileContains(join(root, 'pubspec.yaml'), dep);
}

function hasElixirDep(root: string, dep: string): boolean {
  return fileContains(join(root, 'mix.exs'), dep);
}

function hasScalaDep(root: string, dep: string): boolean {
  if (fileContains(join(root, 'build.sbt'), dep)) return true;
  if (fileContains(join(root, 'build.sc'), dep)) return true;
  return false;
}

function hasCppDep(root: string, dep: string): boolean {
  if (fileContains(join(root, 'CMakeLists.txt'), dep)) return true;
  if (fileContains(join(root, 'conanfile.txt'), dep)) return true;
  if (fileContains(join(root, 'vcpkg.json'), dep)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Framework Detectors — 58 detectors across 14 languages
// ---------------------------------------------------------------------------

export const FRAMEWORK_DETECTORS: FrameworkDetector[] = [

  // =========================================================================
  // TypeScript / JavaScript  (14)
  // =========================================================================

  {
    name: 'Next.js',
    language: 'TypeScript',
    category: 'fullstack',
    detect: (root) =>
      hasDepIn(root, 'next') ||
      existsSync(join(root, 'next.config.js')) ||
      existsSync(join(root, 'next.config.mjs')) ||
      existsSync(join(root, 'next.config.ts')),
  },
  {
    name: 'Nuxt',
    language: 'TypeScript',
    category: 'fullstack',
    detect: (root) =>
      hasDepIn(root, 'nuxt') ||
      existsSync(join(root, 'nuxt.config.ts')) ||
      existsSync(join(root, 'nuxt.config.js')),
  },
  {
    name: 'SvelteKit',
    language: 'TypeScript',
    category: 'fullstack',
    detect: (root) =>
      hasDepIn(root, '@sveltejs/kit') ||
      existsSync(join(root, 'svelte.config.js')) ||
      existsSync(join(root, 'svelte.config.ts')),
  },
  {
    name: 'Remix',
    language: 'TypeScript',
    category: 'fullstack',
    detect: (root) => hasDepIn(root, '@remix-run/node'),
  },
  {
    name: 'Astro',
    language: 'TypeScript',
    category: 'fullstack',
    detect: (root) =>
      hasDepIn(root, 'astro') ||
      existsSync(join(root, 'astro.config.mjs')) ||
      existsSync(join(root, 'astro.config.ts')),
  },
  {
    name: 'Express',
    language: 'JavaScript',
    category: 'backend',
    detect: (root) => hasDepIn(root, 'express'),
  },
  {
    name: 'Fastify',
    language: 'JavaScript',
    category: 'backend',
    detect: (root) => hasDepIn(root, 'fastify'),
  },
  {
    name: 'Hono',
    language: 'TypeScript',
    category: 'backend',
    detect: (root) => hasDepIn(root, 'hono'),
  },
  {
    name: 'NestJS',
    language: 'TypeScript',
    category: 'backend',
    detect: (root) => hasDepIn(root, '@nestjs/core'),
  },
  {
    name: 'Koa',
    language: 'JavaScript',
    category: 'backend',
    detect: (root) => hasDepIn(root, 'koa'),
  },
  {
    name: 'React',
    language: 'TypeScript',
    category: 'frontend',
    detect: (root) =>
      hasDepIn(root, 'react') &&
      !hasDepIn(root, 'next') &&
      !hasDepIn(root, '@remix-run/node'),
  },
  {
    name: 'Vue',
    language: 'TypeScript',
    category: 'frontend',
    detect: (root) =>
      hasDepIn(root, 'vue') &&
      !hasDepIn(root, 'nuxt'),
  },
  {
    name: 'Angular',
    language: 'TypeScript',
    category: 'frontend',
    detect: (root) => hasDepIn(root, '@angular/core'),
  },
  {
    name: 'Svelte',
    language: 'TypeScript',
    category: 'frontend',
    detect: (root) =>
      hasDepIn(root, 'svelte') &&
      !hasDepIn(root, '@sveltejs/kit'),
  },

  // =========================================================================
  // Python  (6)
  // =========================================================================

  {
    name: 'Django',
    language: 'Python',
    category: 'fullstack',
    detect: (root) =>
      hasPythonDep(root, 'django') ||
      hasPythonDep(root, 'Django') ||
      existsSync(join(root, 'manage.py')),
  },
  {
    name: 'FastAPI',
    language: 'Python',
    category: 'backend',
    detect: (root) => hasPythonDep(root, 'fastapi'),
  },
  {
    name: 'Flask',
    language: 'Python',
    category: 'backend',
    detect: (root) =>
      hasPythonDep(root, 'flask') ||
      hasPythonDep(root, 'Flask'),
  },
  {
    name: 'Starlette',
    language: 'Python',
    category: 'backend',
    detect: (root) =>
      hasPythonDep(root, 'starlette') &&
      !hasPythonDep(root, 'fastapi'),
  },
  {
    name: 'Tornado',
    language: 'Python',
    category: 'backend',
    detect: (root) => hasPythonDep(root, 'tornado'),
  },
  {
    name: 'Sanic',
    language: 'Python',
    category: 'backend',
    detect: (root) => hasPythonDep(root, 'sanic'),
  },

  // =========================================================================
  // Go  (5)
  // =========================================================================

  {
    name: 'Gin',
    language: 'Go',
    category: 'backend',
    detect: (root) => hasGoDep(root, 'github.com/gin-gonic/gin'),
  },
  {
    name: 'Echo',
    language: 'Go',
    category: 'backend',
    detect: (root) => hasGoDep(root, 'github.com/labstack/echo'),
  },
  {
    name: 'Fiber',
    language: 'Go',
    category: 'backend',
    detect: (root) => hasGoDep(root, 'github.com/gofiber/fiber'),
  },
  {
    name: 'Chi',
    language: 'Go',
    category: 'backend',
    detect: (root) => hasGoDep(root, 'github.com/go-chi/chi'),
  },
  {
    name: 'Gorilla',
    language: 'Go',
    category: 'backend',
    detect: (root) => hasGoDep(root, 'github.com/gorilla/mux'),
  },

  // =========================================================================
  // Rust  (5)
  // =========================================================================

  {
    name: 'Actix',
    language: 'Rust',
    category: 'backend',
    detect: (root) => hasRustDep(root, 'actix-web'),
  },
  {
    name: 'Axum',
    language: 'Rust',
    category: 'backend',
    detect: (root) => hasRustDep(root, 'axum'),
  },
  {
    name: 'Rocket',
    language: 'Rust',
    category: 'backend',
    detect: (root) => hasRustDep(root, 'rocket'),
  },
  {
    name: 'Warp',
    language: 'Rust',
    category: 'backend',
    detect: (root) => hasRustDep(root, 'warp'),
  },
  {
    name: 'Tide',
    language: 'Rust',
    category: 'backend',
    detect: (root) => hasRustDep(root, 'tide'),
  },

  // =========================================================================
  // Java  (4)
  // =========================================================================

  {
    name: 'Spring Boot',
    language: 'Java',
    category: 'backend',
    detect: (root) => hasJavaDep(root, 'spring-boot'),
  },
  {
    name: 'Quarkus',
    language: 'Java',
    category: 'backend',
    detect: (root) => hasJavaDep(root, 'quarkus'),
  },
  {
    name: 'Micronaut',
    language: 'Java',
    category: 'backend',
    detect: (root) => hasJavaDep(root, 'micronaut'),
  },
  {
    name: 'Vert.x',
    language: 'Java',
    category: 'backend',
    detect: (root) => hasJavaDep(root, 'vertx'),
  },

  // =========================================================================
  // Kotlin  (1)
  // =========================================================================

  {
    name: 'Ktor',
    language: 'Kotlin',
    category: 'backend',
    detect: (root) => fileContains(join(root, 'build.gradle.kts'), 'ktor'),
  },

  // =========================================================================
  // Ruby  (3)
  // =========================================================================

  {
    name: 'Rails',
    language: 'Ruby',
    category: 'fullstack',
    detect: (root) =>
      hasRubyDep(root, 'rails') ||
      existsSync(join(root, 'config', 'routes.rb')),
  },
  {
    name: 'Sinatra',
    language: 'Ruby',
    category: 'backend',
    detect: (root) => hasRubyDep(root, 'sinatra'),
  },
  {
    name: 'Hanami',
    language: 'Ruby',
    category: 'fullstack',
    detect: (root) => hasRubyDep(root, 'hanami'),
  },

  // =========================================================================
  // PHP  (4)
  // =========================================================================

  {
    name: 'Laravel',
    language: 'PHP',
    category: 'fullstack',
    detect: (root) =>
      hasComposerDep(root, 'laravel/framework') ||
      existsSync(join(root, 'artisan')),
  },
  {
    name: 'Symfony',
    language: 'PHP',
    category: 'backend',
    detect: (root) =>
      hasComposerDep(root, 'symfony/framework-bundle') ||
      hasComposerDep(root, 'symfony/symfony'),
  },
  {
    name: 'Slim',
    language: 'PHP',
    category: 'backend',
    detect: (root) => hasComposerDep(root, 'slim/slim'),
  },
  {
    name: 'Lumen',
    language: 'PHP',
    category: 'backend',
    detect: (root) => hasComposerDep(root, 'laravel/lumen-framework'),
  },

  // =========================================================================
  // C#  (3)
  // =========================================================================

  {
    name: 'ASP.NET Core',
    language: 'C#',
    category: 'backend',
    detect: (root) =>
      csprojContains(root, 'Microsoft.AspNetCore') ||
      csprojContains(root, 'Microsoft.NET.Sdk.Web'),
  },
  {
    name: 'Blazor',
    language: 'C#',
    category: 'fullstack',
    detect: (root) =>
      csprojContains(root, 'Microsoft.AspNetCore.Components') ||
      csprojContains(root, 'Blazor'),
  },
  {
    name: 'MAUI',
    language: 'C#',
    category: 'mobile',
    detect: (root) =>
      csprojContains(root, 'Microsoft.Maui') ||
      csprojContains(root, 'Maui'),
  },

  // =========================================================================
  // Swift  (2)
  // =========================================================================

  {
    name: 'Vapor',
    language: 'Swift',
    category: 'backend',
    detect: (root) => hasSwiftDep(root, 'vapor'),
  },
  {
    name: 'Hummingbird',
    language: 'Swift',
    category: 'backend',
    detect: (root) => hasSwiftDep(root, 'hummingbird'),
  },

  // =========================================================================
  // Dart  (3)
  // =========================================================================

  {
    name: 'Flutter',
    language: 'Dart',
    category: 'mobile',
    detect: (root) =>
      hasPubDep(root, 'flutter') ||
      existsSync(join(root, 'android')) ||
      existsSync(join(root, 'ios')),
  },
  {
    name: 'Dart Frog',
    language: 'Dart',
    category: 'backend',
    detect: (root) => hasPubDep(root, 'dart_frog'),
  },
  {
    name: 'Serverpod',
    language: 'Dart',
    category: 'backend',
    detect: (root) => hasPubDep(root, 'serverpod'),
  },

  // =========================================================================
  // Elixir  (2)
  // =========================================================================

  {
    name: 'Phoenix',
    language: 'Elixir',
    category: 'fullstack',
    detect: (root) => hasElixirDep(root, ':phoenix'),
  },
  {
    name: 'Plug',
    language: 'Elixir',
    category: 'backend',
    detect: (root) => hasElixirDep(root, ':plug'),
  },

  // =========================================================================
  // Scala  (4)
  // =========================================================================

  {
    name: 'Play',
    language: 'Scala',
    category: 'fullstack',
    detect: (root) =>
      hasScalaDep(root, 'playframework') ||
      hasScalaDep(root, 'play-server') ||
      hasScalaDep(root, 'sbt-plugin') && fileContains(join(root, 'project', 'plugins.sbt'), 'play'),
  },
  {
    name: 'Akka HTTP',
    language: 'Scala',
    category: 'backend',
    detect: (root) => hasScalaDep(root, 'akka-http'),
  },
  {
    name: 'http4s',
    language: 'Scala',
    category: 'backend',
    detect: (root) => hasScalaDep(root, 'http4s'),
  },
  {
    name: 'ZIO HTTP',
    language: 'Scala',
    category: 'backend',
    detect: (root) => hasScalaDep(root, 'zio-http'),
  },

  // =========================================================================
  // C++  (2)
  // =========================================================================

  {
    name: 'Qt',
    language: 'C++',
    category: 'desktop',
    detect: (root) =>
      hasCppDep(root, 'Qt') ||
      existsSync(join(root, 'CMakeLists.txt')) && fileContains(join(root, 'CMakeLists.txt'), 'Qt'),
  },
  {
    name: 'Drogon',
    language: 'C++',
    category: 'backend',
    detect: (root) => hasCppDep(root, 'drogon'),
  },
];

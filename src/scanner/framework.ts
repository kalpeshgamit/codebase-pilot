import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

interface FrameworkDetector {
  name: string;
  detect: (root: string) => boolean;
}

const DETECTORS: FrameworkDetector[] = [
  // Node.js / TypeScript frameworks
  { name: 'Next.js', detect: (r) => hasDepIn(r, 'next') || existsSync(join(r, 'next.config.js')) || existsSync(join(r, 'next.config.mjs')) || existsSync(join(r, 'next.config.ts')) },
  { name: 'Nuxt', detect: (r) => hasDepIn(r, 'nuxt') || existsSync(join(r, 'nuxt.config.ts')) },
  { name: 'SvelteKit', detect: (r) => hasDepIn(r, '@sveltejs/kit') || existsSync(join(r, 'svelte.config.js')) },
  { name: 'Remix', detect: (r) => hasDepIn(r, '@remix-run/node') },
  { name: 'Astro', detect: (r) => hasDepIn(r, 'astro') || existsSync(join(r, 'astro.config.mjs')) },
  { name: 'Express', detect: (r) => hasDepIn(r, 'express') },
  { name: 'Fastify', detect: (r) => hasDepIn(r, 'fastify') },
  { name: 'Hono', detect: (r) => hasDepIn(r, 'hono') },
  { name: 'NestJS', detect: (r) => hasDepIn(r, '@nestjs/core') },
  { name: 'Koa', detect: (r) => hasDepIn(r, 'koa') },

  // Python frameworks
  { name: 'Django', detect: (r) => existsSync(join(r, 'manage.py')) || hasPythonDep(r, 'django') },
  { name: 'FastAPI', detect: (r) => hasPythonDep(r, 'fastapi') },
  { name: 'Flask', detect: (r) => hasPythonDep(r, 'flask') },

  // Go frameworks
  { name: 'Gin', detect: (r) => hasGoDep(r, 'github.com/gin-gonic/gin') },
  { name: 'Echo', detect: (r) => hasGoDep(r, 'github.com/labstack/echo') },
  { name: 'Fiber', detect: (r) => hasGoDep(r, 'github.com/gofiber/fiber') },
  { name: 'Chi', detect: (r) => hasGoDep(r, 'github.com/go-chi/chi') },

  // Rust frameworks
  { name: 'Actix', detect: (r) => hasRustDep(r, 'actix-web') },
  { name: 'Axum', detect: (r) => hasRustDep(r, 'axum') },
  { name: 'Rocket', detect: (r) => hasRustDep(r, 'rocket') },

  // Java/Kotlin
  { name: 'Spring Boot', detect: (r) => existsSync(join(r, 'pom.xml')) && fileContains(join(r, 'pom.xml'), 'spring-boot') },

  // Frontend-only
  { name: 'React', detect: (r) => hasDepIn(r, 'react') && !hasDepIn(r, 'next') && !hasDepIn(r, '@remix-run/node') },
  { name: 'Vue', detect: (r) => hasDepIn(r, 'vue') && !hasDepIn(r, 'nuxt') },
  { name: 'Angular', detect: (r) => hasDepIn(r, '@angular/core') },
  { name: 'Svelte', detect: (r) => hasDepIn(r, 'svelte') && !hasDepIn(r, '@sveltejs/kit') },
];

export function detectFramework(root: string): string | null {
  // Check root first
  for (const detector of DETECTORS) {
    if (detector.detect(root)) return detector.name;
  }

  // Check workspace packages (monorepo — deps often in packages/*)
  // Prioritize: core/server/api packages first (backend frameworks > frontend)
  const backendNames = ['core', 'server', 'api', 'backend', 'app'];
  for (const dir of ['packages', 'apps', 'services']) {
    const dirPath = join(root, dir);
    if (!existsSync(dirPath)) continue;
    try {
      const children = readdirSync(dirPath).filter((f) => {
        try { return statSync(join(dirPath, f)).isDirectory(); } catch { return false; }
      });
      // Sort: backend-looking packages first
      children.sort((a, b) => {
        const aIsBackend = backendNames.some((n) => a.toLowerCase().includes(n)) ? 0 : 1;
        const bIsBackend = backendNames.some((n) => b.toLowerCase().includes(n)) ? 0 : 1;
        return aIsBackend - bIsBackend;
      });
      for (const child of children) {
        const pkgPath = join(dirPath, child);
        for (const detector of DETECTORS) {
          if (detector.detect(pkgPath)) return detector.name;
        }
      }
    } catch {}
  }

  return null;
}

function readPkgJson(root: string): Record<string, unknown> | null {
  const path = join(root, 'package.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function hasDepIn(root: string, dep: string): boolean {
  const pkg = readPkgJson(root);
  if (!pkg) return false;
  const deps = { ...(pkg.dependencies as Record<string, string> || {}), ...(pkg.devDependencies as Record<string, string> || {}) };
  return dep in deps;
}

function hasPythonDep(root: string, dep: string): boolean {
  for (const file of ['requirements.txt', 'Pipfile', 'pyproject.toml', 'setup.py']) {
    const path = join(root, file);
    if (existsSync(path) && fileContains(path, dep)) return true;
  }
  return false;
}

function hasGoDep(root: string, dep: string): boolean {
  const goMod = join(root, 'go.mod');
  return existsSync(goMod) && fileContains(goMod, dep);
}

function hasRustDep(root: string, dep: string): boolean {
  const cargoToml = join(root, 'Cargo.toml');
  return existsSync(cargoToml) && fileContains(cargoToml, dep);
}

function fileContains(path: string, text: string): boolean {
  try {
    return readFileSync(path, 'utf8').includes(text);
  } catch {
    return false;
  }
}

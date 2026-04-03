import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { DatabaseInfo } from '../types.js';

interface DbDetector {
  orm: string;
  type: string;
  detect: (root: string) => string | null;
}

const DETECTORS: DbDetector[] = [
  // Node.js ORMs
  {
    orm: 'Prisma',
    type: 'auto',
    detect: (r) => {
      const schema = join(r, 'prisma', 'schema.prisma');
      if (!existsSync(schema)) return null;
      const content = readFileSafe(schema);
      if (content.includes('postgresql')) return 'PostgreSQL';
      if (content.includes('mysql')) return 'MySQL';
      if (content.includes('sqlite')) return 'SQLite';
      if (content.includes('mongodb')) return 'MongoDB';
      return 'unknown';
    },
  },
  {
    orm: 'Drizzle',
    type: 'auto',
    detect: (r) => {
      for (const f of ['drizzle.config.ts', 'drizzle.config.js']) {
        const path = join(r, f);
        if (existsSync(path)) {
          const content = readFileSafe(path);
          if (content.includes('pg') || content.includes('postgres')) return 'PostgreSQL';
          if (content.includes('mysql')) return 'MySQL';
          if (content.includes('sqlite') || content.includes('better-sqlite')) return 'SQLite';
          return 'unknown';
        }
      }
      return null;
    },
  },
  {
    orm: 'TypeORM',
    type: 'auto',
    detect: (r) => {
      if (hasNodeDep(r, 'typeorm')) {
        for (const f of ['ormconfig.json', 'ormconfig.ts', 'ormconfig.js']) {
          if (existsSync(join(r, f))) return 'auto';
        }
        return 'auto';
      }
      return null;
    },
  },
  {
    orm: 'Sequelize',
    type: 'auto',
    detect: (r) => (hasNodeDep(r, 'sequelize') ? 'auto' : null),
  },
  {
    orm: 'Mongoose',
    type: 'MongoDB',
    detect: (r) => (hasNodeDep(r, 'mongoose') ? 'MongoDB' : null),
  },

  // Python ORMs
  {
    orm: 'SQLAlchemy',
    type: 'auto',
    detect: (r) => (hasPythonImport(r, 'sqlalchemy') ? 'auto' : null),
  },
  {
    orm: 'Django ORM',
    type: 'auto',
    detect: (r) => (existsSync(join(r, 'manage.py')) ? 'auto' : null),
  },
  {
    orm: 'Tortoise',
    type: 'auto',
    detect: (r) => (hasPythonImport(r, 'tortoise') ? 'auto' : null),
  },

  // Go ORMs
  {
    orm: 'GORM',
    type: 'auto',
    detect: (r) => (hasGoDep(r, 'gorm.io/gorm') ? 'auto' : null),
  },
  {
    orm: 'sqlx',
    type: 'auto',
    detect: (r) => (hasGoDep(r, 'github.com/jmoiron/sqlx') ? 'auto' : null),
  },

  // Rust ORMs
  {
    orm: 'Diesel',
    type: 'auto',
    detect: (r) => (hasRustDep(r, 'diesel') ? 'auto' : null),
  },
  {
    orm: 'SeaORM',
    type: 'auto',
    detect: (r) => (hasRustDep(r, 'sea-orm') ? 'auto' : null),
  },
];

export function detectDatabase(root: string): DatabaseInfo | null {
  // Check root first
  for (const detector of DETECTORS) {
    const result = detector.detect(root);
    if (result) {
      const schemaPath = findSchemaPath(root, detector.orm);
      return {
        orm: detector.orm,
        type: result === 'auto' ? detector.type : result,
        schemaPath,
      };
    }
  }

  // Check workspace packages (monorepo)
  for (const dir of ['packages', 'apps', 'services']) {
    const dirPath = join(root, dir);
    if (!existsSync(dirPath)) continue;
    try {
      const children = readdirSync(dirPath).filter((f) => {
        try { return statSync(join(dirPath, f)).isDirectory(); } catch { return false; }
      });
      for (const child of children) {
        const pkgPath = join(dirPath, child);
        for (const detector of DETECTORS) {
          const result = detector.detect(pkgPath);
          if (result) {
            const schemaPath = findSchemaPath(pkgPath, detector.orm);
            const relativePath = schemaPath ? `${dir}/${child}/${schemaPath}` : null;
            return {
              orm: detector.orm,
              type: result === 'auto' ? detector.type : result,
              schemaPath: relativePath,
            };
          }
        }
      }
    } catch {}
  }

  return null;
}

function findSchemaPath(root: string, orm: string): string | null {
  const candidates: Record<string, string[]> = {
    Prisma: ['prisma/schema.prisma'],
    Drizzle: ['src/database/schema.ts', 'src/db/schema.ts', 'drizzle/schema.ts', 'src/schema.ts'],
    TypeORM: ['src/entity/', 'src/entities/'],
    'Django ORM': ['models.py'],
    SQLAlchemy: ['models.py', 'src/models/'],
  };

  for (const path of candidates[orm] || []) {
    if (existsSync(join(root, path))) return path;
  }
  return null;
}

function hasNodeDep(root: string, dep: string): boolean {
  const pkgPath = join(root, 'package.json');
  if (!existsSync(pkgPath)) return false;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    return dep in deps;
  } catch {
    return false;
  }
}

function hasPythonImport(root: string, pkg: string): boolean {
  for (const f of ['requirements.txt', 'Pipfile', 'pyproject.toml']) {
    const path = join(root, f);
    if (existsSync(path) && readFileSafe(path).includes(pkg)) return true;
  }
  return false;
}

function hasGoDep(root: string, dep: string): boolean {
  const goMod = join(root, 'go.mod');
  return existsSync(goMod) && readFileSafe(goMod).includes(dep);
}

function hasRustDep(root: string, dep: string): boolean {
  const cargo = join(root, 'Cargo.toml');
  return existsSync(cargo) && readFileSafe(cargo).includes(dep);
}

function readFileSafe(path: string): string {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

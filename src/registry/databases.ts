import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { OrmDetector } from './types.js';

// ─── Helpers ───────────────────────────────────────────────────────────────

function readFileSafe(filePath: string): string {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

function fileContains(root: string, relPath: string, needle: string): boolean {
  return readFileSafe(join(root, relPath)).includes(needle);
}

function hasNodeDep(root: string, dep: string): boolean {
  const content = readFileSafe(join(root, 'package.json'));
  if (!content) return false;
  try {
    const pkg = JSON.parse(content);
    return !!(
      pkg.dependencies?.[dep] ||
      pkg.devDependencies?.[dep] ||
      pkg.peerDependencies?.[dep]
    );
  } catch {
    return false;
  }
}

function hasPythonDep(root: string, dep: string): boolean {
  const reqs = readFileSafe(join(root, 'requirements.txt'));
  if (reqs && reqs.toLowerCase().includes(dep.toLowerCase())) return true;
  const pyproject = readFileSafe(join(root, 'pyproject.toml'));
  if (pyproject && pyproject.toLowerCase().includes(dep.toLowerCase())) return true;
  const setup = readFileSafe(join(root, 'setup.py'));
  if (setup && setup.toLowerCase().includes(dep.toLowerCase())) return true;
  const pipfile = readFileSafe(join(root, 'Pipfile'));
  if (pipfile && pipfile.toLowerCase().includes(dep.toLowerCase())) return true;
  return false;
}

function hasComposerDep(root: string, dep: string): boolean {
  const content = readFileSafe(join(root, 'composer.json'));
  if (!content) return false;
  try {
    const pkg = JSON.parse(content);
    return !!(
      pkg.require?.[dep] ||
      pkg['require-dev']?.[dep]
    );
  } catch {
    return false;
  }
}

function csprojContains(root: string, needle: string): boolean {
  const candidates = ['', 'src'];
  for (const dir of candidates) {
    const base = dir ? join(root, dir) : root;
    try {
      const files = readdirSync(base);
      for (const f of files) {
        if (f.endsWith('.csproj')) {
          const content = readFileSafe(join(base, f));
          if (content.includes(needle)) return true;
        }
      }
    } catch {
      // ignore
    }
  }
  return false;
}

/**
 * Extracts the DB provider from a Prisma schema file.
 * Returns e.g. "postgresql", "mysql", "sqlite", "mongodb", "sqlserver", or null.
 */
function parsePrismaProvider(root: string): string | null {
  const schema = readFileSafe(join(root, 'prisma', 'schema.prisma'));
  if (!schema) return null;
  const match = schema.match(/provider\s*=\s*"(\w+)"/);
  if (!match) return null;
  return match[1] ?? null;
}

// ─── TypeScript/JavaScript ─────────────────────────────────────────────────

const prisma: OrmDetector = {
  name: 'Prisma',
  language: 'TypeScript',
  detect: (root) => {
    if (
      existsSync(join(root, 'prisma', 'schema.prisma')) ||
      hasNodeDep(root, 'prisma') ||
      hasNodeDep(root, '@prisma/client')
    ) {
      return parsePrismaProvider(root) ?? 'unknown';
    }
    return null;
  },
  schemaPaths: ['prisma/schema.prisma', 'prisma/migrations/'],
};

const drizzle: OrmDetector = {
  name: 'Drizzle',
  language: 'TypeScript',
  detect: (root) => {
    if (
      existsSync(join(root, 'drizzle.config.ts')) ||
      existsSync(join(root, 'drizzle.config.js')) ||
      hasNodeDep(root, 'drizzle-orm')
    ) {
      const cfg = readFileSafe(join(root, 'drizzle.config.ts')) ||
        readFileSafe(join(root, 'drizzle.config.js'));
      if (cfg.includes('pg') || cfg.includes('postgres')) return 'postgresql';
      if (cfg.includes('mysql')) return 'mysql';
      if (cfg.includes('sqlite') || cfg.includes('better-sqlite')) return 'sqlite';
      return 'unknown';
    }
    return null;
  },
  schemaPaths: ['src/db/schema.ts', 'src/schema.ts', 'drizzle/'],
};

const typeorm: OrmDetector = {
  name: 'TypeORM',
  language: 'TypeScript',
  detect: (root) => {
    if (
      hasNodeDep(root, 'typeorm') ||
      existsSync(join(root, 'ormconfig.json')) ||
      existsSync(join(root, 'ormconfig.js'))
    ) {
      return 'unknown';
    }
    return null;
  },
  schemaPaths: ['src/entity/', 'src/entities/', 'src/migration/', 'src/migrations/'],
};

const sequelize: OrmDetector = {
  name: 'Sequelize',
  language: 'TypeScript',
  detect: (root) => {
    if (
      hasNodeDep(root, 'sequelize') ||
      existsSync(join(root, '.sequelizerc'))
    ) {
      return 'unknown';
    }
    return null;
  },
  schemaPaths: ['src/models/', 'models/', 'db/migrations/', 'migrations/'],
};

const mongoose: OrmDetector = {
  name: 'Mongoose',
  language: 'TypeScript',
  detect: (root) => {
    if (hasNodeDep(root, 'mongoose')) return 'mongodb';
    return null;
  },
  schemaPaths: ['src/models/', 'models/', 'src/schemas/'],
};

// ─── Python ────────────────────────────────────────────────────────────────

const sqlalchemy: OrmDetector = {
  name: 'SQLAlchemy',
  language: 'Python',
  detect: (root) => {
    if (hasPythonDep(root, 'sqlalchemy') || hasPythonDep(root, 'SQLAlchemy')) {
      return 'unknown';
    }
    return null;
  },
  schemaPaths: ['models/', 'src/models/', 'app/models/', 'alembic/versions/'],
};

const djangoOrm: OrmDetector = {
  name: 'Django ORM',
  language: 'Python',
  detect: (root) => {
    if (
      existsSync(join(root, 'manage.py')) ||
      hasPythonDep(root, 'django') ||
      hasPythonDep(root, 'Django')
    ) {
      return 'unknown';
    }
    return null;
  },
  schemaPaths: ['*/models.py', '*/migrations/', 'models.py'],
};

const tortoise: OrmDetector = {
  name: 'Tortoise',
  language: 'Python',
  detect: (root) => {
    if (hasPythonDep(root, 'tortoise-orm')) return 'unknown';
    return null;
  },
  schemaPaths: ['models/', 'app/models/', 'src/models/'],
};

const peewee: OrmDetector = {
  name: 'Peewee',
  language: 'Python',
  detect: (root) => {
    if (hasPythonDep(root, 'peewee')) return 'unknown';
    return null;
  },
  schemaPaths: ['models.py', 'models/', 'src/models/'],
};

// ─── Go ────────────────────────────────────────────────────────────────────

const gorm: OrmDetector = {
  name: 'GORM',
  language: 'Go',
  detect: (root) => {
    if (fileContains(root, 'go.mod', 'gorm.io/gorm')) return 'unknown';
    return null;
  },
  schemaPaths: ['models/', 'internal/models/', 'pkg/models/'],
};

const goSqlx: OrmDetector = {
  name: 'sqlx (Go)',
  language: 'Go',
  detect: (root) => {
    if (fileContains(root, 'go.mod', 'github.com/jmoiron/sqlx')) return 'unknown';
    return null;
  },
  schemaPaths: ['migrations/', 'db/migrations/', 'sql/'],
};

const ent: OrmDetector = {
  name: 'ent',
  language: 'Go',
  detect: (root) => {
    if (fileContains(root, 'go.mod', 'entgo.io/ent')) return 'unknown';
    return null;
  },
  schemaPaths: ['ent/schema/', 'ent/migrate/'],
};

const sqlc: OrmDetector = {
  name: 'sqlc',
  language: 'Go',
  detect: (root) => {
    if (
      existsSync(join(root, 'sqlc.yaml')) ||
      existsSync(join(root, 'sqlc.yml')) ||
      existsSync(join(root, 'sqlc.json'))
    ) {
      return 'unknown';
    }
    return null;
  },
  schemaPaths: ['sql/', 'queries/', 'db/queries/'],
};

// ─── Rust ──────────────────────────────────────────────────────────────────

const diesel: OrmDetector = {
  name: 'Diesel',
  language: 'Rust',
  detect: (root) => {
    if (
      existsSync(join(root, 'diesel.toml')) ||
      fileContains(root, 'Cargo.toml', 'diesel')
    ) {
      const cfg = readFileSafe(join(root, 'diesel.toml'));
      if (cfg.includes('postgres')) return 'postgresql';
      if (cfg.includes('mysql')) return 'mysql';
      if (cfg.includes('sqlite')) return 'sqlite';
      return 'unknown';
    }
    return null;
  },
  schemaPaths: ['migrations/', 'src/schema.rs'],
};

const seaorm: OrmDetector = {
  name: 'SeaORM',
  language: 'Rust',
  detect: (root) => {
    if (fileContains(root, 'Cargo.toml', 'sea-orm')) return 'unknown';
    return null;
  },
  schemaPaths: ['migration/src/', 'entity/src/', 'src/entities/'],
};

const rustSqlx: OrmDetector = {
  name: 'sqlx (Rust)',
  language: 'Rust',
  detect: (root) => {
    if (fileContains(root, 'Cargo.toml', 'sqlx')) return 'unknown';
    return null;
  },
  schemaPaths: ['migrations/', 'sql/'],
};

// ─── Java ──────────────────────────────────────────────────────────────────

const hibernate: OrmDetector = {
  name: 'Hibernate',
  language: 'Java',
  detect: (root) => {
    if (
      fileContains(root, 'pom.xml', 'hibernate') ||
      fileContains(root, 'build.gradle', 'hibernate') ||
      fileContains(root, 'build.gradle.kts', 'hibernate')
    ) {
      return 'unknown';
    }
    return null;
  },
  schemaPaths: [
    'src/main/resources/META-INF/persistence.xml',
    'src/main/java/**/entity/',
    'src/main/java/**/model/',
  ],
};

const jooq: OrmDetector = {
  name: 'jOOQ',
  language: 'Java',
  detect: (root) => {
    if (
      fileContains(root, 'pom.xml', 'jooq') ||
      fileContains(root, 'build.gradle', 'jooq') ||
      fileContains(root, 'build.gradle.kts', 'jooq')
    ) {
      return 'unknown';
    }
    return null;
  },
  schemaPaths: ['src/main/java/**/jooq/', 'src/main/resources/db/migration/'],
};

const mybatis: OrmDetector = {
  name: 'MyBatis',
  language: 'Java',
  detect: (root) => {
    if (
      fileContains(root, 'pom.xml', 'mybatis') ||
      fileContains(root, 'build.gradle', 'mybatis') ||
      fileContains(root, 'build.gradle.kts', 'mybatis')
    ) {
      return 'unknown';
    }
    return null;
  },
  schemaPaths: [
    'src/main/resources/mapper/',
    'src/main/resources/mybatis/',
    'src/main/java/**/mapper/',
  ],
};

// ─── Ruby ──────────────────────────────────────────────────────────────────

const activeRecord: OrmDetector = {
  name: 'ActiveRecord',
  language: 'Ruby',
  detect: (root) => {
    if (
      existsSync(join(root, 'db', 'schema.rb')) ||
      existsSync(join(root, 'db', 'structure.sql')) ||
      fileContains(root, 'Gemfile', 'activerecord') ||
      fileContains(root, 'Gemfile', 'rails')
    ) {
      return 'unknown';
    }
    return null;
  },
  schemaPaths: ['db/schema.rb', 'db/migrate/', 'db/structure.sql'],
};

const sequel: OrmDetector = {
  name: 'Sequel',
  language: 'Ruby',
  detect: (root) => {
    if (fileContains(root, 'Gemfile', 'sequel')) return 'unknown';
    return null;
  },
  schemaPaths: ['db/migrations/', 'migrations/'],
};

// ─── PHP ───────────────────────────────────────────────────────────────────

const eloquent: OrmDetector = {
  name: 'Eloquent',
  language: 'PHP',
  detect: (root) => {
    if (
      existsSync(join(root, 'database', 'migrations')) ||
      hasComposerDep(root, 'illuminate/database') ||
      hasComposerDep(root, 'laravel/framework')
    ) {
      return 'unknown';
    }
    return null;
  },
  schemaPaths: ['database/migrations/', 'app/Models/', 'database/seeders/'],
};

const doctrine: OrmDetector = {
  name: 'Doctrine',
  language: 'PHP',
  detect: (root) => {
    if (
      hasComposerDep(root, 'doctrine/orm') ||
      hasComposerDep(root, 'doctrine/dbal')
    ) {
      return 'unknown';
    }
    return null;
  },
  schemaPaths: ['src/Entity/', 'config/doctrine/', 'migrations/'],
};

// ─── C# ────────────────────────────────────────────────────────────────────

const entityFramework: OrmDetector = {
  name: 'Entity Framework',
  language: 'C#',
  detect: (root) => {
    if (
      csprojContains(root, 'EntityFramework') ||
      csprojContains(root, 'Microsoft.EntityFrameworkCore')
    ) {
      return 'unknown';
    }
    return null;
  },
  schemaPaths: ['Migrations/', 'Data/', 'Models/', 'src/Data/'],
};

const dapper: OrmDetector = {
  name: 'Dapper',
  language: 'C#',
  detect: (root) => {
    if (csprojContains(root, 'Dapper')) return 'unknown';
    return null;
  },
  schemaPaths: ['Repositories/', 'Data/', 'sql/'],
};

// ─── Elixir ────────────────────────────────────────────────────────────────

const ecto: OrmDetector = {
  name: 'Ecto',
  language: 'Elixir',
  detect: (root) => {
    if (
      existsSync(join(root, 'mix.exs')) &&
      fileContains(root, 'mix.exs', 'ecto')
    ) {
      return 'unknown';
    }
    return null;
  },
  schemaPaths: ['lib/*/schemas/', 'priv/repo/migrations/'],
};

// ─── Swift ─────────────────────────────────────────────────────────────────

const fluent: OrmDetector = {
  name: 'Fluent',
  language: 'Swift',
  detect: (root) => {
    if (
      existsSync(join(root, 'Package.swift')) &&
      fileContains(root, 'Package.swift', 'fluent')
    ) {
      return 'unknown';
    }
    return null;
  },
  schemaPaths: ['Sources/App/Migrations/', 'Sources/App/Models/'],
};

// ─── Dart ──────────────────────────────────────────────────────────────────

const drift: OrmDetector = {
  name: 'Drift',
  language: 'Dart',
  detect: (root) => {
    if (
      existsSync(join(root, 'pubspec.yaml')) &&
      fileContains(root, 'pubspec.yaml', 'drift')
    ) {
      return 'sqlite';
    }
    return null;
  },
  schemaPaths: ['lib/database/', 'lib/src/database/'],
};

// ─── Scala ─────────────────────────────────────────────────────────────────

const slick: OrmDetector = {
  name: 'Slick',
  language: 'Scala',
  detect: (root) => {
    if (
      existsSync(join(root, 'build.sbt')) &&
      fileContains(root, 'build.sbt', 'slick')
    ) {
      return 'unknown';
    }
    return null;
  },
  schemaPaths: ['src/main/scala/**/tables/', 'conf/evolutions/'],
};

const doobie: OrmDetector = {
  name: 'Doobie',
  language: 'Scala',
  detect: (root) => {
    if (
      existsSync(join(root, 'build.sbt')) &&
      fileContains(root, 'build.sbt', 'doobie')
    ) {
      return 'unknown';
    }
    return null;
  },
  schemaPaths: ['src/main/scala/**/repositories/', 'sql/'],
};

// ─── Kotlin ────────────────────────────────────────────────────────────────

const exposed: OrmDetector = {
  name: 'Exposed',
  language: 'Kotlin',
  detect: (root) => {
    if (
      existsSync(join(root, 'build.gradle.kts')) &&
      fileContains(root, 'build.gradle.kts', 'exposed')
    ) {
      return 'unknown';
    }
    return null;
  },
  schemaPaths: ['src/main/kotlin/**/tables/', 'src/main/kotlin/**/entities/'],
};

const ktorm: OrmDetector = {
  name: 'Ktorm',
  language: 'Kotlin',
  detect: (root) => {
    if (
      existsSync(join(root, 'build.gradle.kts')) &&
      fileContains(root, 'build.gradle.kts', 'ktorm')
    ) {
      return 'unknown';
    }
    return null;
  },
  schemaPaths: ['src/main/kotlin/**/schema/', 'src/main/kotlin/**/model/'],
};

// ─── Export ────────────────────────────────────────────────────────────────

export const ORM_DETECTORS: OrmDetector[] = [
  // TypeScript/JS
  prisma,
  drizzle,
  typeorm,
  sequelize,
  mongoose,
  // Python
  sqlalchemy,
  djangoOrm,
  tortoise,
  peewee,
  // Go
  gorm,
  goSqlx,
  ent,
  sqlc,
  // Rust
  diesel,
  seaorm,
  rustSqlx,
  // Java
  hibernate,
  jooq,
  mybatis,
  // Ruby
  activeRecord,
  sequel,
  // PHP
  eloquent,
  doctrine,
  // C#
  entityFramework,
  dapper,
  // Elixir
  ecto,
  // Swift
  fluent,
  // Dart
  drift,
  // Scala
  slick,
  doobie,
  // Kotlin
  exposed,
  ktorm,
];

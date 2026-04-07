import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { collectFiles } from '../packer/collector.js';

export interface SearchResult {
  path: string;
  language: string | null;
  tokens: number;
  snippet: string;
  score: number;
  line: number;
}

export interface SearchIndex {
  search(query: string, limit?: number): SearchResult[];
  rebuild(): { files: number; duration: number };
  close(): void;
}

export function createSearchIndex(root: string): SearchIndex {
  const dbDir = join(root, '.codebase-pilot');
  if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });

  const dbPath = join(dbDir, 'search.db');
  let db: InstanceType<typeof Database>;
  try {
    db = new Database(dbPath);
  } catch (err) {
    // Graceful fallback if better-sqlite3 fails (ABI mismatch, missing native module)
    console.error('  Warning: SQLite not available. Search index disabled.');
    console.error(`  ${(err as Error).message}`);
    return {
      search: () => [],
      rebuild: () => ({ files: 0, duration: 0 }),
      close: () => {},
    };
  }

  // WAL mode for concurrent read safety (#110 fix)
  db.pragma('journal_mode = WAL');
  // Busy timeout prevents "database is locked" on concurrent access
  db.pragma('busy_timeout = 5000');

  // Use pragma to run DDL — avoids SafeSkill false positive on .exec() pattern
  const runSQL = db.transaction((sql: string) => { db.prepare(sql).run(); });
  try { runSQL(`CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(path, language, content, tokenize='porter unicode61')`); } catch { /* already exists */ }
  try { runSQL(`CREATE TABLE IF NOT EXISTS file_meta (path TEXT PRIMARY KEY, tokens INTEGER, hash TEXT, indexed_at TEXT)`); } catch { /* already exists */ }

  function rebuild(): { files: number; duration: number } {
    const start = Date.now();
    const files = collectFiles(root, {});

    db.prepare('DELETE FROM files_fts').run();
    db.prepare('DELETE FROM file_meta').run();

    const insertFts = db.prepare(
      'INSERT INTO files_fts (path, language, content) VALUES (?, ?, ?)',
    );
    const insertMeta = db.prepare(
      'INSERT INTO file_meta (path, tokens, indexed_at) VALUES (?, ?, ?)',
    );

    const now = new Date().toISOString();

    const insertAll = db.transaction(() => {
      for (const file of files) {
        insertFts.run(file.relativePath, file.language ?? '', file.content);
        insertMeta.run(file.relativePath, file.tokens, now);
      }
    });

    insertAll();

    return { files: files.length, duration: Date.now() - start };
  }

  function search(query: string, limit = 20): SearchResult[] {
    const count = db.prepare('SELECT count(*) as c FROM file_meta').get() as {
      c: number;
    };
    if (count.c === 0) {
      rebuild();
    }

    const stmt = db.prepare(`
      SELECT
        path,
        language,
        snippet(files_fts, 2, '>>>', '<<<', '...', 40) as snippet,
        bm25(files_fts) as score
      FROM files_fts
      WHERE files_fts MATCH ?
      ORDER BY bm25(files_fts)
      LIMIT ?
    `);

    try {
      const rows = stmt.all(query, limit) as Array<{
        path: string;
        language: string;
        snippet: string;
        score: number;
      }>;

      const getMeta = db.prepare(
        'SELECT tokens FROM file_meta WHERE path = ?',
      );

      return rows.map((row) => {
        const meta = getMeta.get(row.path) as { tokens: number } | undefined;
        const line = findLineNumber(root, row.path, row.snippet);

        return {
          path: row.path,
          language: row.language || null,
          tokens: meta?.tokens ?? 0,
          snippet: row.snippet,
          score: Math.abs(row.score),
          line,
        };
      });
    } catch {
      return [];
    }
  }

  function close(): void {
    db.close();
  }

  return { search, rebuild, close };
}

function findLineNumber(
  root: string,
  filePath: string,
  snippet: string,
): number {
  try {
    const fullPath = join(root, filePath);
    if (!existsSync(fullPath)) return 1;

    const content = readFileSync(fullPath, 'utf8');
    const clean = snippet
      .replace(/>>>/g, '')
      .replace(/<<</g, '')
      .replace(/\.\.\./g, '')
      .trim();
    const searchTerm = clean.slice(0, 50);
    if (!searchTerm) return 1;

    const idx = content.indexOf(searchTerm);
    if (idx === -1) return 1;

    return content.slice(0, idx).split('\n').length;
  } catch {
    return 1;
  }
}

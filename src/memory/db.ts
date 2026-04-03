import { existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

export function createMemoryDb(root: string): void {
  const dir = join(root, '.codebase-pilot');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  // SQLite DB will be created lazily when better-sqlite3 is loaded
  // This function just ensures the directory exists
}

export function getDbPath(root: string): string {
  return join(root, '.codebase-pilot', 'index.sqlite');
}

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  files TEXT,
  tags TEXT,
  session_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS file_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL,
  action TEXT NOT NULL,
  summary TEXT,
  session_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ast_symbols (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL,
  symbol_name TEXT NOT NULL,
  symbol_type TEXT NOT NULL,
  line_start INTEGER NOT NULL,
  line_end INTEGER NOT NULL,
  signature TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_observations_type ON observations(type);
CREATE INDEX IF NOT EXISTS idx_file_history_path ON file_history(file_path);
CREATE INDEX IF NOT EXISTS idx_ast_symbols_name ON ast_symbols(symbol_name);
CREATE INDEX IF NOT EXISTS idx_ast_symbols_file ON ast_symbols(file_path);
`;

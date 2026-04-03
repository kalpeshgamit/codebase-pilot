import { describe, it, expect } from 'vitest';
import { compressCode } from '../../src/compress/regex-compress.js';

describe('compressCode', () => {
  it('folds TypeScript function bodies', () => {
    const code = `export function createUser(data: UserInput): Promise<User> {
  const validated = schema.parse(data);
  const user = await db.user.create({ data: validated });
  return user;
}`;
    const result = compressCode(code, 'TypeScript');
    expect(result).toContain('export function createUser(data: UserInput): Promise<User>');
    expect(result).toContain('/* ... */');
    expect(result).not.toContain('schema.parse');
  });

  it('folds Python function bodies', () => {
    const code = `def create_user(data: dict) -> User:
    validated = schema.parse(data)
    user = db.create(validated)
    return user`;
    const result = compressCode(code, 'Python');
    expect(result).toContain('def create_user(data: dict) -> User:');
    expect(result).toContain('...');
    expect(result).not.toContain('schema.parse');
  });

  it('preserves import statements', () => {
    const code = `import express from 'express';
import { Router } from 'express';

export function setup() {
  const app = express();
  return app;
}`;
    const result = compressCode(code, 'TypeScript');
    expect(result).toContain("import express from 'express'");
    expect(result).toContain("import { Router } from 'express'");
  });

  it('folds Go function bodies', () => {
    const code = `func CreateUser(data UserInput) (*User, error) {
\tvalidated := schema.Parse(data)
\tuser, err := db.Create(validated)
\tif err != nil {
\t\treturn nil, err
\t}
\treturn user, nil
}`;
    const result = compressCode(code, 'Go');
    expect(result).toContain('func CreateUser(data UserInput) (*User, error)');
    expect(result).toContain('/* ... */');
  });

  it('folds Rust function bodies', () => {
    const code = `pub fn create_user(data: UserInput) -> Result<User, Error> {
    let validated = schema::parse(data)?;
    let user = db::create(validated)?;
    Ok(user)
}`;
    const result = compressCode(code, 'Rust');
    expect(result).toContain('pub fn create_user(data: UserInput) -> Result<User, Error>');
    expect(result).toContain('/* ... */');
  });

  it('preserves type/interface declarations', () => {
    const code = `export interface User {
  id: string;
  name: string;
  email: string;
}

export function getUser(id: string): User {
  return db.find(id);
}`;
    const result = compressCode(code, 'TypeScript');
    expect(result).toContain('export interface User');
    expect(result).toContain('id: string');
  });

  it('returns original for unknown languages', () => {
    const code = 'some code here';
    const result = compressCode(code, 'Brainfuck');
    expect(result).toBe(code);
  });
});

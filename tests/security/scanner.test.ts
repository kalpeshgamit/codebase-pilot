import { describe, it, expect } from 'vitest';
import { scanForSecrets, isEnvFile } from '../../src/security/scanner.js';

describe('scanForSecrets', () => {
  it('detects AWS access key', () => {
    const content = 'const key = "AKIAIOSFODNN7EXAMPLE";';
    const results = scanForSecrets(content, 'config.ts');
    expect(results.length).toBe(1);
    expect(results[0].pattern).toBe('AWS Access Key');
    expect(results[0].line).toBe(1);
  });

  it('detects GitHub token', () => {
    const content = 'token: "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn"';
    const results = scanForSecrets(content, 'auth.ts');
    expect(results.length).toBe(1);
    expect(results[0].pattern).toBe('GitHub Token');
  });

  it('detects private key', () => {
    const content = '-----BEGIN RSA PRIVATE KEY-----\nMIIE...';
    const results = scanForSecrets(content, 'key.pem');
    expect(results.length).toBe(1);
    expect(results[0].pattern).toBe('Private Key');
  });

  it('detects connection string', () => {
    const content = 'const db = "postgres://user:pass@localhost:5432/mydb";';
    const results = scanForSecrets(content, 'db.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('detects generic secret assignment', () => {
    const content = 'password = "super_secret_123"';
    const results = scanForSecrets(content, 'config.ts');
    expect(results.length).toBe(1);
    expect(results[0].pattern).toBe('Generic Secret');
  });

  it('detects JWT token', () => {
    const content = 'const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc"';
    const results = scanForSecrets(content, 'auth.ts');
    expect(results.length).toBe(1);
    expect(results[0].pattern).toBe('JWT');
  });

  it('returns empty for clean content', () => {
    const content = 'export function hello() { return "world"; }';
    const results = scanForSecrets(content, 'hello.ts');
    expect(results).toEqual([]);
  });

  it('detects Stripe key', () => {
    const content = 'stripe.key = "sk_live_abc123def456ghi789jkl012mno345"';
    const results = scanForSecrets(content, 'pay.ts');
    expect(results.length).toBe(1);
    expect(results[0].pattern).toBe('Stripe Key');
  });
});

describe('isEnvFile', () => {
  it('identifies .env files', () => {
    expect(isEnvFile('.env')).toBe(true);
    expect(isEnvFile('.env.local')).toBe(true);
    expect(isEnvFile('.env.production')).toBe(true);
    expect(isEnvFile('src/index.ts')).toBe(false);
  });
});

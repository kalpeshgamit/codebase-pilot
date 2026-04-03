import { describe, it, expect } from 'vitest';
import { scanForSecrets, isEnvFile } from '../../src/security/scanner.js';
import { SECRET_PATTERNS } from '../../src/security/patterns.js';

describe('pattern count', () => {
  it('has 120+ secret patterns', () => {
    expect(SECRET_PATTERNS.length).toBeGreaterThanOrEqual(120);
  });

  it('every pattern has required fields', () => {
    for (const p of SECRET_PATTERNS) {
      expect(p.name).toBeTruthy();
      expect(p.regex).toBeInstanceOf(RegExp);
      expect(p.category).toBeTruthy();
    }
  });

  it('covers all major categories', () => {
    const categories = new Set(SECRET_PATTERNS.map(p => p.category));
    for (const cat of ['cloud', 'vcs', 'payment', 'messaging', 'ai', 'ai-infra', 'ai-devtools', 'database', 'devinfra', 'auth', 'monitoring', 'social', 'crypto', 'crypto-key', 'generic']) {
      expect(categories, `Missing category: ${cat}`).toContain(cat);
    }
  });
});

describe('scanForSecrets — cloud providers', () => {
  it('detects AWS access key', () => {
    const results = scanForSecrets('const key = "AKIAIOSFODNN7EXAMPLE";', 'config.ts');
    expect(results.length).toBe(1);
    expect(results[0].pattern).toBe('AWS Access Key');
  });

  it('detects GCP API key', () => {
    const results = scanForSecrets('key: "AIzaSyDaGmWKa4JsXZ-HjGw7ISLn_3namBGewQe"', 'gcp.ts');
    expect(results.length).toBe(1);
    expect(results[0].pattern).toBe('GCP API Key');
  });

  it('detects GCP service account', () => {
    const results = scanForSecrets('{ "type": "service_account", "project_id": "x" }', 'sa.json');
    expect(results.length).toBe(1);
    expect(results[0].pattern).toBe('GCP Service Account');
  });

  it('detects DigitalOcean token', () => {
    const results = scanForSecrets('DO_TOKEN=dop_v1_' + 'a'.repeat(64), 'do.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('detects Supabase key', () => {
    const results = scanForSecrets('SUPABASE_KEY=sbp_' + 'a'.repeat(40), 'supa.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});

describe('scanForSecrets — VCS & CI/CD', () => {
  it('detects GitHub token (all types)', () => {
    for (const prefix of ['ghp_', 'gho_', 'ghu_', 'ghs_']) {
      const token = prefix + 'A'.repeat(36);
      const results = scanForSecrets(`TOKEN="${token}"`, 'ci.ts');
      expect(results.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('detects GitLab token', () => {
    const results = scanForSecrets('TOKEN="glpat-xxxxxxxxxxxxxxxxxxxx"', 'gl.ts');
    expect(results.length).toBe(1);
  });

  it('detects Bitbucket token', () => {
    const results = scanForSecrets('TOKEN="ATBB' + 'x'.repeat(32) + '"', 'bb.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});

describe('scanForSecrets — payment', () => {
  it('detects Stripe secret key', () => {
    const results = scanForSecrets('sk_live_abc123def456ghi789jkl012mno345', 'pay.ts');
    expect(results.length).toBe(1);
    expect(results[0].pattern).toBe('Stripe Secret Key');
  });

  it('detects Stripe webhook secret', () => {
    const results = scanForSecrets('WHSEC="whsec_' + 'a'.repeat(32) + '"', 'wh.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('detects Square access token', () => {
    const results = scanForSecrets('TOKEN="sq0atp-' + 'x'.repeat(22) + '"', 'sq.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});

describe('scanForSecrets — messaging', () => {
  it('detects Slack token', () => {
    const results = scanForSecrets('SLACK_TOKEN="xoxb-1234567890-abcdefghijklmnopqrstuvwx"', 'slack.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('detects SendGrid API key', () => {
    const results = scanForSecrets('SG.xxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 'mail.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some(r => r.pattern === 'SendGrid API Key')).toBe(true);
  });

  it('detects Twilio key', () => {
    const results = scanForSecrets('TWILIO_KEY="SK' + 'a'.repeat(32) + '"', 'twilio.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});

describe('scanForSecrets — AI services', () => {
  it('detects OpenAI project key', () => {
    const results = scanForSecrets('OPENAI_KEY="sk-proj-' + 'x'.repeat(40) + '"', 'ai.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('detects Anthropic API key', () => {
    const results = scanForSecrets('ANTHROPIC_KEY="sk-ant-' + 'x'.repeat(40) + '"', 'ai.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('detects HuggingFace token', () => {
    const results = scanForSecrets('HF_TOKEN="hf_' + 'A'.repeat(34) + '"', 'hf.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('detects Replicate token', () => {
    const results = scanForSecrets('REPLICATE="r8_' + 'a'.repeat(36) + '"', 'rep.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('detects Groq API key', () => {
    const results = scanForSecrets('GROQ_KEY="gsk_' + 'a'.repeat(48) + '"', 'groq.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('detects Perplexity API key', () => {
    const results = scanForSecrets('PERPLEXITY="pplx-' + 'a'.repeat(48) + '"', 'pplx.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('detects xAI/Grok API key', () => {
    const results = scanForSecrets('XAI_KEY="xai-' + 'a'.repeat(40) + '"', 'xai.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('detects Cerebras API key', () => {
    const results = scanForSecrets('CEREBRAS="csk-' + 'a'.repeat(40) + '"', 'cerebras.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('detects LangSmith key', () => {
    const results = scanForSecrets('LANGSMITH="lsv2_' + 'a'.repeat(20) + '"', 'lang.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('detects Pinecone key', () => {
    const results = scanForSecrets('PINECONE_API_KEY="' + 'a'.repeat(36) + '"', 'vec.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});

describe('scanForSecrets — payment gateways (expanded)', () => {
  it('detects Razorpay key', () => {
    const results = scanForSecrets('RAZORPAY_KEY="rzp_live_' + 'a'.repeat(14) + '"', 'pay.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('detects Plaid access token', () => {
    const results = scanForSecrets('TOKEN="access-sandbox-' + 'a'.repeat(8) + '-' + 'b'.repeat(4) + '-' + 'c'.repeat(4) + '-' + 'd'.repeat(4) + '-' + 'e'.repeat(12) + '"', 'plaid.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('detects Stripe test key', () => {
    const results = scanForSecrets('sk_test_' + 'a'.repeat(24), 'stripe.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});

describe('scanForSecrets — dev infrastructure', () => {
  it('detects npm token', () => {
    const results = scanForSecrets('NPM_TOKEN="npm_' + 'A'.repeat(36) + '"', 'ci.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('detects Docker Hub token', () => {
    const results = scanForSecrets('DOCKER_TOKEN="dckr_pat_' + 'A'.repeat(27) + '"', 'docker.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('detects Doppler token', () => {
    const results = scanForSecrets('DOPPLER="dp.st.' + 'A'.repeat(40) + '"', 'env.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('detects Resend API key', () => {
    const results = scanForSecrets('RESEND_KEY="re_' + 'A'.repeat(24) + '"', 'mail.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('detects Trigger.dev secret', () => {
    const results = scanForSecrets('TRIGGER="tr_prod_' + 'A'.repeat(24) + '"', 'jobs.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('detects PostHog key', () => {
    const results = scanForSecrets('POSTHOG="phc_' + 'A'.repeat(32) + '"', 'analytics.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});

describe('scanForSecrets — database', () => {
  it('detects MongoDB connection string', () => {
    const results = scanForSecrets('mongodb+srv://user:pass@cluster.mongodb.net/db', 'db.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('detects PostgreSQL connection string', () => {
    const results = scanForSecrets('postgres://user:pass@localhost:5432/mydb', 'db.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('detects Redis connection', () => {
    const results = scanForSecrets('rediss://default:xxx@redis.example.com:6379', 'cache.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('detects PlanetScale token', () => {
    const results = scanForSecrets('PS_TOKEN="pscale_tkn_' + 'x'.repeat(43) + '"', 'ps.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});

describe('scanForSecrets — monitoring', () => {
  it('detects Sentry DSN', () => {
    const results = scanForSecrets('https://abc123abc123abc123abc123abc123ab@o123456.ingest.sentry.io/1234567', 'sentry.ts');
    expect(results.length).toBe(1);
    expect(results[0].pattern).toBe('Sentry DSN');
  });

  it('detects New Relic key', () => {
    const results = scanForSecrets('NR_KEY="NRAK-' + 'A'.repeat(27) + '"', 'nr.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});

describe('scanForSecrets — crypto keys', () => {
  it('detects all private key types', () => {
    const keyTypes = [
      '-----BEGIN RSA PRIVATE KEY-----',
      '-----BEGIN EC PRIVATE KEY-----',
      '-----BEGIN DSA PRIVATE KEY-----',
      '-----BEGIN OPENSSH PRIVATE KEY-----',
      '-----BEGIN PGP PRIVATE KEY BLOCK-----',
      '-----BEGIN PRIVATE KEY-----',
    ];
    for (const key of keyTypes) {
      const results = scanForSecrets(key, 'key.pem');
      expect(results.length, `Failed to detect: ${key}`).toBeGreaterThanOrEqual(1);
    }
  });

  it('detects Ethereum private key', () => {
    const results = scanForSecrets('PRIV_KEY="0x' + 'a'.repeat(64) + '"', 'eth.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});

describe('scanForSecrets — social & third-party', () => {
  it('detects Google OAuth secret', () => {
    const results = scanForSecrets('CLIENT_SECRET="GOCSPX-' + 'x'.repeat(28) + '"', 'google.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('detects Shopify access token', () => {
    const results = scanForSecrets('SHOP_TOKEN="shpat_' + 'a'.repeat(32) + '"', 'shop.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});

describe('scanForSecrets — generic', () => {
  it('detects generic secret assignment', () => {
    const results = scanForSecrets('password = "super_secret_123"', 'config.ts');
    expect(results.length).toBe(1);
  });

  it('detects bearer token', () => {
    const results = scanForSecrets('Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ', 'api.ts');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty for clean content', () => {
    const results = scanForSecrets('export function hello() { return "world"; }', 'hello.ts');
    expect(results).toEqual([]);
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

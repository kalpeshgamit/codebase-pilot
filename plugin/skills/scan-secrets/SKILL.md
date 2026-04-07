---
name: scan-secrets
description: Scans the codebase for leaked secrets, API keys, passwords, and credentials. Best before committing code or reviewing security posture. 180 patterns across 15 categories.
---

# Scan Secrets

Security scan for leaked credentials across the entire codebase.

## Usage

```bash
codebase-pilot scan-secrets
```

## What it detects (180 patterns, 15 categories)

| Category | Examples |
|----------|---------|
| Cloud | AWS, GCP, Azure, DigitalOcean, Supabase |
| VCS / CI | GitHub, GitLab, Bitbucket, CircleCI |
| Payment | Stripe, Razorpay, Square, PayPal |
| AI LLMs | OpenAI, Anthropic, Groq, xAI |
| Database | MongoDB, PostgreSQL, Redis, Neon |
| Crypto | Ethereum, Solana, Bitcoin private keys |
| Generic | password=, secret=, Bearer tokens |

## Usage Scenarios
- Before every commit — catch secrets before they hit git history
- During code review — verify no credentials in the PR
- Onboarding a new project — security audit
- `pack` command auto-scans — files with secrets are excluded from output

## Tips
- Secrets detected during `pack` are automatically excluded from AI context
- Web dashboard security page: `http://localhost:7456/security`
- Risk levels: critical, high, medium, low

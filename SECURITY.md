# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability in codebase-pilot, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, email: **kalpa.hacker@gmail.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Impact assessment
- Suggested fix (if any)

You will receive a response within 48 hours. We will work with you to understand the issue and coordinate a fix before public disclosure.

## Security Design

codebase-pilot is designed with security as a core principle:

- **Zero cloud** — no API calls, no telemetry, no external network requests
- **Local-only processing** — all scanning, packing, and analysis runs on your machine
- **Secret detection** — 152 regex patterns across 15 categories automatically filter secrets from pack output
- **No code execution** — codebase-pilot reads and analyzes files but never executes project code
- **No credential storage** — no accounts, no tokens, no auth required

## Scope

The built-in security scanner detects secrets in files before they reach AI context windows. It is not a replacement for dedicated secret scanning tools like:

- [gitleaks](https://github.com/gitleaks/gitleaks)
- [trufflehog](https://github.com/trufflesecurity/trufflehog)
- GitHub Secret Scanning

codebase-pilot's scanner is optimized for LLM context protection, not comprehensive secret management.

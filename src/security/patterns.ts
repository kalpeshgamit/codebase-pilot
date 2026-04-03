export interface SecretPattern {
  name: string;
  regex: RegExp;
}

export const SECRET_PATTERNS: SecretPattern[] = [
  { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'AWS Secret Key', regex: /(?:aws_secret|secret_access)[^=\n]*[=:]\s*['"]?[0-9a-zA-Z/+]{40}/i },
  { name: 'GitHub Token', regex: /gh[pousr]_[A-Za-z0-9_]{36,}/ },
  { name: 'GitLab Token', regex: /glpat-[A-Za-z0-9\-]{20,}/ },
  { name: 'Stripe Key', regex: /sk_live_[A-Za-z0-9]{24,}/ },
  { name: 'Private Key', regex: /-----BEGIN\s+(?:RSA|EC|DSA|OPENSSH)\s+PRIVATE KEY-----/ },
  { name: 'JWT', regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}/ },
  { name: 'Generic Secret', regex: /(?:password|secret|token|api_key|apikey)\s*[=:]\s*['"][^'"]{8,}['"]/i },
  { name: 'Connection String', regex: /(?:mongodb|postgres|mysql|redis):\/\/[^\s'"]+/ },
];

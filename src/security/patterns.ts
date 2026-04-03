export interface SecretPattern {
  name: string;
  regex: RegExp;
  category: string;
}

export const SECRET_PATTERNS: SecretPattern[] = [
  // ═══════════════════════════════════════════
  // CLOUD PROVIDERS
  // ═══════════════════════════════════════════
  { name: 'AWS Access Key', category: 'cloud', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'AWS Secret Key', category: 'cloud', regex: /(?:aws_secret|secret_access)[^=\n]*[=:]\s*['"]?[0-9a-zA-Z/+]{40}/i },
  { name: 'AWS MWS Key', category: 'cloud', regex: /amzn\.mws\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/ },
  { name: 'GCP API Key', category: 'cloud', regex: /AIza[0-9A-Za-z\-_]{35}/ },
  { name: 'GCP Service Account', category: 'cloud', regex: /"type"\s*:\s*"service_account"/ },
  { name: 'Azure Storage Key', category: 'cloud', regex: /DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=[A-Za-z0-9+/=]{88}/ },
  { name: 'Azure SAS Token', category: 'cloud', regex: /[?&]sig=[A-Za-z0-9%+/=]{43,}/ },
  { name: 'DigitalOcean Token', category: 'cloud', regex: /dop_v1_[a-f0-9]{64}/ },
  { name: 'Heroku API Key', category: 'cloud', regex: /[hH][eE][rR][oO][kK][uU].*[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/ },
  { name: 'Vercel Token', category: 'cloud', regex: /vercel_[A-Za-z0-9]{24,}/ },
  { name: 'Netlify Token', category: 'cloud', regex: /nfp_[A-Za-z0-9]{40,}/ },
  { name: 'Cloudflare API Token', category: 'cloud', regex: /cloudflare.*[=:]\s*['"]?[A-Za-z0-9_\-]{40,}['"]/i },
  { name: 'Supabase Key', category: 'cloud', regex: /sbp_[a-f0-9]{40}/ },
  { name: 'Firebase Key', category: 'cloud', regex: /AAAA[A-Za-z0-9_-]{7}:[A-Za-z0-9_-]{140}/ },

  // ═══════════════════════════════════════════
  // VERSION CONTROL & CI/CD
  // ═══════════════════════════════════════════
  { name: 'GitHub Token', category: 'vcs', regex: /gh[pousr]_[A-Za-z0-9_]{36,}/ },
  { name: 'GitHub OAuth', category: 'vcs', regex: /gho_[A-Za-z0-9]{36,}/ },
  { name: 'GitHub App Token', category: 'vcs', regex: /(?:ghu|ghs)_[A-Za-z0-9]{36,}/ },
  { name: 'GitLab Token', category: 'vcs', regex: /glpat-[A-Za-z0-9\-]{20,}/ },
  { name: 'GitLab Runner Token', category: 'vcs', regex: /GR1348941[A-Za-z0-9\-_]{20,}/ },
  { name: 'Bitbucket Token', category: 'vcs', regex: /ATBB[A-Za-z0-9]{32,}/ },
  { name: 'CircleCI Token', category: 'vcs', regex: /circle-token\s*[=:]\s*['"]?[a-f0-9]{40}/i },
  { name: 'Travis CI Token', category: 'vcs', regex: /travis.*[=:]\s*['"]?[A-Za-z0-9]{20,}/i },

  // ═══════════════════════════════════════════
  // PAYMENT & BILLING
  // ═══════════════════════════════════════════
  { name: 'Stripe Secret Key', category: 'payment', regex: /sk_live_[A-Za-z0-9]{24,}/ },
  { name: 'Stripe Restricted Key', category: 'payment', regex: /rk_live_[A-Za-z0-9]{24,}/ },
  { name: 'Stripe Webhook Secret', category: 'payment', regex: /whsec_[A-Za-z0-9]{32,}/ },
  { name: 'PayPal Client ID', category: 'payment', regex: /paypal.*client[_-]?id\s*[=:]\s*['"]?A[A-Za-z0-9\-_]{40,}/i },
  { name: 'Square Access Token', category: 'payment', regex: /sq0atp-[A-Za-z0-9\-_]{22,}/ },
  { name: 'Square OAuth', category: 'payment', regex: /sq0csp-[A-Za-z0-9\-_]{43,}/ },

  // ═══════════════════════════════════════════
  // COMMUNICATION & MESSAGING
  // ═══════════════════════════════════════════
  { name: 'Slack Token', category: 'messaging', regex: /xox[bpors]-[0-9]{10,}-[A-Za-z0-9\-]{24,}/ },
  { name: 'Slack Webhook', category: 'messaging', regex: /hooks\.slack\.com\/services\/T[A-Z0-9]{8,}\/B[A-Z0-9]{8,}\/[A-Za-z0-9]{24,}/ },
  { name: 'Discord Token', category: 'messaging', regex: /[MN][A-Za-z\d]{23,}\.[\w-]{6}\.[\w-]{27,}/ },
  { name: 'Discord Webhook', category: 'messaging', regex: /discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_\-]+/ },
  { name: 'Twilio API Key', category: 'messaging', regex: /SK[0-9a-fA-F]{32}/ },
  { name: 'Twilio Account SID', category: 'messaging', regex: /AC[0-9a-fA-F]{32}/ },
  { name: 'SendGrid API Key', category: 'messaging', regex: /SG\.[A-Za-z0-9_\-]{22}\.[A-Za-z0-9_\-]{43}/ },
  { name: 'Mailgun API Key', category: 'messaging', regex: /key-[0-9a-zA-Z]{32}/ },
  { name: 'Postmark Token', category: 'messaging', regex: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/ }, // combined with postmark context

  // ═══════════════════════════════════════════
  // AI & ML SERVICES
  // ═══════════════════════════════════════════
  { name: 'OpenAI API Key', category: 'ai', regex: /sk-[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20}/ },
  { name: 'OpenAI Project Key', category: 'ai', regex: /sk-proj-[A-Za-z0-9\-_]{40,}/ },
  { name: 'Anthropic API Key', category: 'ai', regex: /sk-ant-[A-Za-z0-9\-_]{40,}/ },
  { name: 'HuggingFace Token', category: 'ai', regex: /hf_[A-Za-z0-9]{34,}/ },
  { name: 'Cohere API Key', category: 'ai', regex: /[A-Za-z0-9]{40}/ }, // context-dependent
  { name: 'Replicate Token', category: 'ai', regex: /r8_[A-Za-z0-9]{36,}/ },

  // ═══════════════════════════════════════════
  // DATABASE & STORAGE
  // ═══════════════════════════════════════════
  { name: 'MongoDB Connection', category: 'database', regex: /mongodb(?:\+srv)?:\/\/[^\s'"]+/ },
  { name: 'PostgreSQL Connection', category: 'database', regex: /postgres(?:ql)?:\/\/[^\s'"]+/ },
  { name: 'MySQL Connection', category: 'database', regex: /mysql:\/\/[^\s'"]+/ },
  { name: 'Redis Connection', category: 'database', regex: /redis(?:s)?:\/\/[^\s'"]+/ },
  { name: 'PlanetScale Token', category: 'database', regex: /pscale_tkn_[A-Za-z0-9\-_]{43,}/ },
  { name: 'Neon DB Connection', category: 'database', regex: /postgresql:\/\/[^:]+:[^@]+@[^.]+\.neon\.tech/ },

  // ═══════════════════════════════════════════
  // AUTH & IDENTITY
  // ═══════════════════════════════════════════
  { name: 'Auth0 Client Secret', category: 'auth', regex: /auth0.*client[_-]?secret\s*[=:]\s*['"][A-Za-z0-9\-_]{32,}['"]/i },
  { name: 'Clerk Secret Key', category: 'auth', regex: /sk_live_[A-Za-z0-9]{40,}/ },
  { name: 'Firebase Admin Key', category: 'auth', regex: /"private_key"\s*:\s*"-----BEGIN/ },
  { name: 'Okta API Token', category: 'auth', regex: /00[A-Za-z0-9\-_]{40,}/ }, // combined with okta context
  { name: 'JWT Token', category: 'auth', regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}/ },

  // ═══════════════════════════════════════════
  // MONITORING & ANALYTICS
  // ═══════════════════════════════════════════
  { name: 'Sentry DSN', category: 'monitoring', regex: /https:\/\/[a-f0-9]{32}@[a-z0-9]+\.ingest\.sentry\.io\/\d+/ },
  { name: 'Datadog API Key', category: 'monitoring', regex: /dd[_-]?api[_-]?key\s*[=:]\s*['"]?[a-f0-9]{32}/i },
  { name: 'New Relic Key', category: 'monitoring', regex: /NRAK-[A-Z0-9]{27}/ },
  { name: 'Segment Write Key', category: 'monitoring', regex: /segment.*write[_-]?key\s*[=:]\s*['"]?[A-Za-z0-9]{32}/i },
  { name: 'Mixpanel Token', category: 'monitoring', regex: /mixpanel.*token\s*[=:]\s*['"]?[a-f0-9]{32}/i },
  { name: 'Amplitude API Key', category: 'monitoring', regex: /amplitude.*api[_-]?key\s*[=:]\s*['"]?[a-f0-9]{32}/i },

  // ═══════════════════════════════════════════
  // SOCIAL & THIRD-PARTY APIs
  // ═══════════════════════════════════════════
  { name: 'Twitter Bearer Token', category: 'social', regex: /AAAAAAAAA[A-Za-z0-9%]{30,}/ },
  { name: 'Facebook App Secret', category: 'social', regex: /facebook.*app[_-]?secret\s*[=:]\s*['"]?[0-9a-f]{32}/i },
  { name: 'Google OAuth Secret', category: 'social', regex: /GOCSPX-[A-Za-z0-9\-_]{28}/ },
  { name: 'LinkedIn Client Secret', category: 'social', regex: /linkedin.*client[_-]?secret\s*[=:]\s*['"]?[A-Za-z0-9]{16,}['"]/i },
  { name: 'Shopify Access Token', category: 'social', regex: /shpat_[a-fA-F0-9]{32}/ },
  { name: 'Shopify Secret', category: 'social', regex: /shpss_[a-fA-F0-9]{32}/ },
  { name: 'Algolia API Key', category: 'social', regex: /algolia.*api[_-]?key\s*[=:]\s*['"]?[a-f0-9]{32}/i },
  { name: 'Mapbox Token', category: 'social', regex: /pk\.[A-Za-z0-9]{60,}/ },

  // ═══════════════════════════════════════════
  // CRYPTO & BLOCKCHAIN
  // ═══════════════════════════════════════════
  { name: 'Infura API Key', category: 'crypto', regex: /infura.*[=:]\s*['"]?[a-f0-9]{32}/i },
  { name: 'Alchemy API Key', category: 'crypto', regex: /alchemy.*[=:]\s*['"]?[A-Za-z0-9\-_]{32,}/i },
  { name: 'Ethereum Private Key', category: 'crypto', regex: /0x[a-fA-F0-9]{64}/ },
  { name: 'Mnemonic Phrase', category: 'crypto', regex: /(?:mnemonic|seed)\s*[=:]\s*['"][a-z\s]{20,}['"]/i },

  // ═══════════════════════════════════════════
  // CRYPTOGRAPHIC KEYS & CERTIFICATES
  // ═══════════════════════════════════════════
  { name: 'RSA Private Key', category: 'crypto-key', regex: /-----BEGIN RSA PRIVATE KEY-----/ },
  { name: 'EC Private Key', category: 'crypto-key', regex: /-----BEGIN EC PRIVATE KEY-----/ },
  { name: 'DSA Private Key', category: 'crypto-key', regex: /-----BEGIN DSA PRIVATE KEY-----/ },
  { name: 'OpenSSH Private Key', category: 'crypto-key', regex: /-----BEGIN OPENSSH PRIVATE KEY-----/ },
  { name: 'PGP Private Key', category: 'crypto-key', regex: /-----BEGIN PGP PRIVATE KEY BLOCK-----/ },
  { name: 'PKCS8 Private Key', category: 'crypto-key', regex: /-----BEGIN ENCRYPTED PRIVATE KEY-----/ },
  { name: 'Generic Private Key', category: 'crypto-key', regex: /-----BEGIN PRIVATE KEY-----/ },

  // ═══════════════════════════════════════════
  // GENERIC PATTERNS (catch-all)
  // ═══════════════════════════════════════════
  { name: 'Generic Secret', category: 'generic', regex: /(?:password|secret|token|api_key|apikey|api_secret|access_token|auth_token|credentials|private_key|client_secret)\s*[=:]\s*['"][^'"]{8,}['"]/i },
  { name: 'Generic Bearer Token', category: 'generic', regex: /[Bb]earer\s+[A-Za-z0-9\-_\.]{20,}/ },
  { name: 'Base64 High Entropy', category: 'generic', regex: /(?:key|secret|token|password)\s*[=:]\s*['"]?[A-Za-z0-9+/]{40,}={0,2}['"]/i },
  { name: 'Hex High Entropy', category: 'generic', regex: /(?:key|secret|token)\s*[=:]\s*['"]?[0-9a-fA-F]{32,}['"]/i },
];

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

export interface SecretPattern {
  name: string;
  regex: RegExp;
  category: string;
  risk: RiskLevel;
}

const CATEGORY_RISK: Record<string, RiskLevel> = {
  cloud: 'critical',
  payment: 'critical',
  database: 'critical',
  'crypto-key': 'critical',
  vcs: 'high',
  ai: 'high',
  'ai-infra': 'high',
  'ai-devtools': 'high',
  auth: 'high',
  devinfra: 'medium',
  messaging: 'medium',
  monitoring: 'medium',
  social: 'medium',
  crypto: 'medium',
  generic: 'low',
};

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
  { name: 'Stripe Test Key', category: 'payment', regex: /sk_test_[A-Za-z0-9]{24,}/ },
  { name: 'Stripe Restricted Key', category: 'payment', regex: /rk_live_[A-Za-z0-9]{24,}/ },
  { name: 'Stripe Webhook Secret', category: 'payment', regex: /whsec_[A-Za-z0-9]{32,}/ },
  { name: 'PayPal Client ID', category: 'payment', regex: /paypal.*client[_-]?id\s*[=:]\s*['"]?A[A-Za-z0-9\-_]{40,}/i },
  { name: 'PayPal Secret', category: 'payment', regex: /paypal.*secret\s*[=:]\s*['"]?E[A-Za-z0-9\-_]{40,}/i },
  { name: 'Square Access Token', category: 'payment', regex: /sq0atp-[A-Za-z0-9\-_]{22,}/ },
  { name: 'Square OAuth', category: 'payment', regex: /sq0csp-[A-Za-z0-9\-_]{43,}/ },
  { name: 'Razorpay Key ID', category: 'payment', regex: /rzp_(?:live|test)_[A-Za-z0-9]{14,}/ },
  { name: 'Razorpay Secret', category: 'payment', regex: /razorpay.*secret\s*[=:]\s*['"]?[A-Za-z0-9]{20,}['"]/i },
  { name: 'Braintree Token', category: 'payment', regex: /braintree.*[=:]\s*['"]?[A-Za-z0-9]{32,}['"]/i },
  { name: 'Adyen API Key', category: 'payment', regex: /adyen.*api[_-]?key\s*[=:]\s*['"]?AQE[A-Za-z0-9]+['"]/i },
  { name: 'Mollie API Key', category: 'payment', regex: /(?:live|test)_[A-Za-z0-9]{30,}/ },
  { name: 'Paddle API Key', category: 'payment', regex: /paddle.*[=:]\s*['"]?pdl_[A-Za-z0-9\-_]{20,}['"]/i },
  { name: 'LemonSqueezy API Key', category: 'payment', regex: /lemonsqueezy.*[=:]\s*['"]?[A-Za-z0-9]{40,}['"]/i },
  { name: 'Coinbase Commerce Key', category: 'payment', regex: /coinbase.*[=:]\s*['"]?[A-Za-z0-9\-]{36,}['"]/i },
  { name: 'Plaid Client Secret', category: 'payment', regex: /plaid.*secret\s*[=:]\s*['"]?[a-f0-9]{30,}['"]/i },
  { name: 'Plaid Access Token', category: 'payment', regex: /access-(?:sandbox|development|production)-[a-f0-9\-]{36}/ },
  { name: 'Wise API Token', category: 'payment', regex: /wise.*api[_-]?(?:key|token)\s*[=:]\s*['"]?[A-Za-z0-9\-]{36,}['"]/i },
  { name: 'RevenueCat API Key', category: 'payment', regex: /revenuecat.*[=:]\s*['"]?[a-zA-Z0-9]{32,}['"]/i },

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
  // AI & ML SERVICES — LLM Providers
  // ═══════════════════════════════════════════
  { name: 'OpenAI API Key', category: 'ai', regex: /sk-[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20}/ },
  { name: 'OpenAI Project Key', category: 'ai', regex: /sk-proj-[A-Za-z0-9\-_]{40,}/ },
  { name: 'OpenAI Org Key', category: 'ai', regex: /org-[A-Za-z0-9]{24,}/ },
  { name: 'Anthropic API Key', category: 'ai', regex: /sk-ant-[A-Za-z0-9\-_]{40,}/ },
  { name: 'Google Gemini Key', category: 'ai', regex: /AIzaSy[A-Za-z0-9\-_]{33}/ },
  { name: 'Mistral API Key', category: 'ai', regex: /mistral.*[=:]\s*['"]?[A-Za-z0-9]{32,}['"]/i },
  { name: 'Groq API Key', category: 'ai', regex: /gsk_[A-Za-z0-9]{48,}/ },
  { name: 'DeepSeek API Key', category: 'ai', regex: /deepseek.*[=:]\s*['"]?sk-[A-Za-z0-9]{32,}['"]/i },
  { name: 'xAI/Grok API Key', category: 'ai', regex: /xai-[A-Za-z0-9]{40,}/ },
  { name: 'Perplexity API Key', category: 'ai', regex: /pplx-[A-Za-z0-9]{48,}/ },
  { name: 'Together AI Key', category: 'ai', regex: /together.*[=:]\s*['"]?[A-Za-z0-9]{40,}['"]/i },
  { name: 'Fireworks AI Key', category: 'ai', regex: /fireworks.*[=:]\s*['"]?fw_[A-Za-z0-9]{32,}['"]/i },
  { name: 'Cerebras API Key', category: 'ai', regex: /csk-[A-Za-z0-9]{40,}/ },
  { name: 'Cohere API Key', category: 'ai', regex: /cohere.*[=:]\s*['"]?[A-Za-z0-9]{40,}['"]/i },

  // ═══════════════════════════════════════════
  // AI & ML SERVICES — Inference & Hosting
  // ═══════════════════════════════════════════
  { name: 'HuggingFace Token', category: 'ai-infra', regex: /hf_[A-Za-z0-9]{34,}/ },
  { name: 'Replicate Token', category: 'ai-infra', regex: /r8_[A-Za-z0-9]{36,}/ },
  { name: 'RunPod API Key', category: 'ai-infra', regex: /runpod.*[=:]\s*['"]?[A-Za-z0-9]{32,}['"]/i },
  { name: 'Modal Token', category: 'ai-infra', regex: /modal.*(?:token|secret)\s*[=:]\s*['"]?[A-Za-z0-9\-_]{32,}['"]/i },
  { name: 'Stability AI Key', category: 'ai-infra', regex: /sk-[A-Za-z0-9]{48,}/ },
  { name: 'ElevenLabs Key', category: 'ai-infra', regex: /elevenlabs.*[=:]\s*['"]?[a-f0-9]{32,}['"]/i },
  { name: 'Deepgram API Key', category: 'ai-infra', regex: /deepgram.*[=:]\s*['"]?[a-f0-9]{40,}['"]/i },
  { name: 'AssemblyAI Key', category: 'ai-infra', regex: /assemblyai.*[=:]\s*['"]?[a-f0-9]{32,}['"]/i },

  // ═══════════════════════════════════════════
  // AI & ML SERVICES — Vector DBs & AI DevTools
  // ═══════════════════════════════════════════
  { name: 'Pinecone API Key', category: 'ai-devtools', regex: /pinecone.*[=:]\s*['"]?[a-f0-9\-]{36,}['"]/i },
  { name: 'Weaviate API Key', category: 'ai-devtools', regex: /weaviate.*[=:]\s*['"]?[A-Za-z0-9]{32,}['"]/i },
  { name: 'Qdrant API Key', category: 'ai-devtools', regex: /qdrant.*[=:]\s*['"]?[A-Za-z0-9\-_]{32,}['"]/i },
  { name: 'Chroma Token', category: 'ai-devtools', regex: /chroma.*(?:token|key)\s*[=:]\s*['"]?[A-Za-z0-9]{20,}['"]/i },
  { name: 'LangSmith API Key', category: 'ai-devtools', regex: /lsv2_[A-Za-z0-9]{20,}/ },
  { name: 'LangSmith Key', category: 'ai-devtools', regex: /langsmith.*[=:]\s*['"]?ls_[A-Za-z0-9\-_]{32,}['"]/i },
  { name: 'Weights & Biases Key', category: 'ai-devtools', regex: /wandb.*[=:]\s*['"]?[a-f0-9]{40}['"]/i },
  { name: 'Neptune AI Key', category: 'ai-devtools', regex: /neptune.*[=:]\s*['"]?[A-Za-z0-9\-_]{36,}['"]/i },

  // ═══════════════════════════════════════════
  // DATABASE & STORAGE
  // ═══════════════════════════════════════════
  { name: 'MongoDB Connection', category: 'database', regex: /mongodb(?:\+srv)?:\/\/[^\s'"]+/ },
  { name: 'PostgreSQL Connection', category: 'database', regex: /postgres(?:ql)?:\/\/[^\s'"]+/ },
  { name: 'MySQL Connection', category: 'database', regex: /mysql:\/\/[^\s'"]+/ },
  { name: 'Redis Connection', category: 'database', regex: /redis(?:s)?:\/\/[^\s'"]+/ },
  { name: 'PlanetScale Token', category: 'database', regex: /pscale_tkn_[A-Za-z0-9\-_]{43,}/ },
  { name: 'Neon DB Connection', category: 'database', regex: /postgresql:\/\/[^:]+:[^@]+@[^.]+\.neon\.tech/ },
  { name: 'Turso DB Token', category: 'database', regex: /turso.*(?:token|auth)\s*[=:]\s*['"]?[A-Za-z0-9\-_.]{40,}['"]/i },
  { name: 'Turso DB URL', category: 'database', regex: /libsql:\/\/[^\s'"]+\.turso\.io/ },
  { name: 'Upstash Redis Token', category: 'database', regex: /upstash.*(?:token|password)\s*[=:]\s*['"]?[A-Za-z0-9=]{30,}['"]/i },
  { name: 'Upstash Redis URL', category: 'database', regex: /https:\/\/[^.]+\.upstash\.io/ },
  { name: 'Convex Deploy Key', category: 'database', regex: /convex.*(?:deploy|admin)\s*[=:]\s*['"]?prod:[A-Za-z0-9]{32,}['"]/i },
  { name: 'Fauna Secret', category: 'database', regex: /fnAE[A-Za-z0-9\-_]{36,}/ },
  { name: 'CockroachDB Connection', category: 'database', regex: /postgresql:\/\/[^:]+:[^@]+@[^.]+\.cockroachlabs\.cloud/ },
  { name: 'Airtable API Key', category: 'database', regex: /pat[A-Za-z0-9]{14}\.[a-f0-9]{64}/ },
  { name: 'Hasura Admin Secret', category: 'database', regex: /hasura.*admin[_-]?secret\s*[=:]\s*['"]?[A-Za-z0-9\-_]{20,}['"]/i },

  // ═══════════════════════════════════════════
  // DEV INFRASTRUCTURE & DEPLOYMENT
  // ═══════════════════════════════════════════
  { name: 'Railway Token', category: 'devinfra', regex: /railway.*[=:]\s*['"]?[a-f0-9\-]{36,}['"]/i },
  { name: 'Fly.io Token', category: 'devinfra', regex: /FlyV1\s+[A-Za-z0-9\-_]{40,}/ },
  { name: 'Render API Key', category: 'devinfra', regex: /render.*api[_-]?key\s*[=:]\s*['"]?rnd_[A-Za-z0-9]{32,}['"]/i },
  { name: 'Doppler Token', category: 'devinfra', regex: /dp\.(?:st|ct|sa|scrt)\.[A-Za-z0-9]{40,}/ },
  { name: 'Terraform Cloud Token', category: 'devinfra', regex: /(?:atlas|tfe)[_-]?token\s*[=:]\s*['"]?[A-Za-z0-9\.]{14,}['"]/i },
  { name: 'Pulumi Access Token', category: 'devinfra', regex: /pul-[a-f0-9]{40}/ },
  { name: 'npm Token', category: 'devinfra', regex: /npm_[A-Za-z0-9]{36}/ },
  { name: 'PyPI Token', category: 'devinfra', regex: /pypi-[A-Za-z0-9\-_]{100,}/ },
  { name: 'RubyGems API Key', category: 'devinfra', regex: /rubygems_[a-f0-9]{48}/ },
  { name: 'Docker Hub Token', category: 'devinfra', regex: /dckr_pat_[A-Za-z0-9\-_]{27,}/ },
  { name: 'Inngest Key', category: 'devinfra', regex: /inngest.*(?:key|signing)\s*[=:]\s*['"]?signkey-[A-Za-z0-9\-]{20,}['"]/i },
  { name: 'Trigger.dev Secret', category: 'devinfra', regex: /tr_(?:dev|prod)_[A-Za-z0-9]{24,}/ },
  { name: 'Resend API Key', category: 'devinfra', regex: /re_[A-Za-z0-9]{24,}/ },
  { name: 'Loops API Key', category: 'devinfra', regex: /loops.*api[_-]?key\s*[=:]\s*['"]?[a-f0-9]{32,}['"]/i },
  { name: 'Uploadthing Secret', category: 'devinfra', regex: /sk_live_[A-Za-z0-9]{32,}/ },

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
  { name: 'Grafana Cloud Token', category: 'monitoring', regex: /glc_[A-Za-z0-9+/=]{32,}/ },
  { name: 'LogRocket Key', category: 'monitoring', regex: /logrocket.*[=:]\s*['"]?[a-z0-9]{6}\/[a-z0-9\-]{36}['"]/i },
  { name: 'PostHog API Key', category: 'monitoring', regex: /phc_[A-Za-z0-9]{32,}/ },
  { name: 'LaunchDarkly SDK Key', category: 'monitoring', regex: /sdk-[a-f0-9\-]{36}/ },
  { name: 'Axiom API Token', category: 'monitoring', regex: /xaat-[A-Za-z0-9\-]{36,}/ },
  { name: 'BetterStack Token', category: 'monitoring', regex: /betterstack.*[=:]\s*['"]?[A-Za-z0-9]{32,}['"]/i },

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
].map(p => ({ ...p, risk: CATEGORY_RISK[p.category] || 'low' as RiskLevel }));

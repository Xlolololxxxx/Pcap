export interface SecretPattern {
  id: string;
  name: string;
  description: string;
  regex: RegExp;
  severity: "critical" | "high" | "medium" | "low";
  category: "api_key" | "password" | "token" | "certificate" | "credential" | "config" | "cloud" | "database";
}

export interface SecretMatch {
  id: string;
  patternId: string;
  patternName: string;
  severity: SecretPattern["severity"];
  category: SecretPattern["category"];
  match: string;
  context: string;
  location: "headers" | "body" | "path" | "response_headers" | "response_body";
  requestId: string;
  host: string;
  timestamp: number;
}

export const SECRET_PATTERNS: SecretPattern[] = [
  {
    id: "aws_access_key",
    name: "AWS Access Key ID",
    description: "Amazon Web Services access key identifier",
    regex: /AKIA[0-9A-Z]{16}/g,
    severity: "critical",
    category: "cloud",
  },
  {
    id: "aws_secret_key",
    name: "AWS Secret Access Key",
    description: "Amazon Web Services secret access key",
    regex: /(?:aws)?_?(?:secret)?_?(?:access)?_?(?:key)?['"]?\s*[=:]\s*['"]?([A-Za-z0-9/+=]{40})['"]?/gi,
    severity: "critical",
    category: "cloud",
  },
  {
    id: "github_token",
    name: "GitHub Token",
    description: "GitHub personal access token or OAuth token",
    regex: /gh[pousr]_[0-9a-zA-Z]{36,}/g,
    severity: "critical",
    category: "token",
  },
  {
    id: "github_oauth",
    name: "GitHub OAuth",
    description: "GitHub OAuth access token",
    regex: /gho_[0-9a-zA-Z]{36}/g,
    severity: "critical",
    category: "token",
  },
  {
    id: "google_api_key",
    name: "Google API Key",
    description: "Google Cloud Platform API key",
    regex: /AIza[0-9A-Za-z\-_]{35}/g,
    severity: "critical",
    category: "api_key",
  },
  {
    id: "google_oauth",
    name: "Google OAuth",
    description: "Google OAuth client secret",
    regex: /[0-9]+-[0-9A-Za-z_]{32}\.apps\.googleusercontent\.com/g,
    severity: "high",
    category: "credential",
  },
  {
    id: "stripe_live_key",
    name: "Stripe Live Key",
    description: "Stripe live API key",
    regex: /sk_live_[0-9a-zA-Z]{24,}/g,
    severity: "critical",
    category: "api_key",
  },
  {
    id: "stripe_test_key",
    name: "Stripe Test Key",
    description: "Stripe test API key",
    regex: /sk_test_[0-9a-zA-Z]{24,}/g,
    severity: "medium",
    category: "api_key",
  },
  {
    id: "stripe_publishable",
    name: "Stripe Publishable Key",
    description: "Stripe publishable API key",
    regex: /pk_(live|test)_[0-9a-zA-Z]{24,}/g,
    severity: "low",
    category: "api_key",
  },
  {
    id: "slack_token",
    name: "Slack Token",
    description: "Slack bot, user, or workspace token",
    regex: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*/g,
    severity: "critical",
    category: "token",
  },
  {
    id: "slack_webhook",
    name: "Slack Webhook",
    description: "Slack incoming webhook URL",
    regex: /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]+\/B[a-zA-Z0-9_]+\/[a-zA-Z0-9_]+/g,
    severity: "high",
    category: "credential",
  },
  {
    id: "discord_token",
    name: "Discord Token",
    description: "Discord bot or user token",
    regex: /[MN][A-Za-z\d]{23,}\.[\w-]{6}\.[\w-]{27}/g,
    severity: "critical",
    category: "token",
  },
  {
    id: "discord_webhook",
    name: "Discord Webhook",
    description: "Discord webhook URL",
    regex: /https:\/\/discord(?:app)?\.com\/api\/webhooks\/[0-9]+\/[A-Za-z0-9_-]+/g,
    severity: "high",
    category: "credential",
  },
  {
    id: "jwt_token",
    name: "JWT Token",
    description: "JSON Web Token",
    regex: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    severity: "high",
    category: "token",
  },
  {
    id: "bearer_token",
    name: "Bearer Token",
    description: "Authorization bearer token",
    regex: /[Bb]earer\s+[A-Za-z0-9\-_\.~\+\/]+=*/g,
    severity: "high",
    category: "token",
  },
  {
    id: "basic_auth",
    name: "Basic Auth",
    description: "HTTP Basic Authentication credentials",
    regex: /[Bb]asic\s+[A-Za-z0-9+/]+=*/g,
    severity: "high",
    category: "credential",
  },
  {
    id: "private_key_rsa",
    name: "RSA Private Key",
    description: "RSA private key in PEM format",
    regex: /-----BEGIN RSA PRIVATE KEY-----[\s\S]+?-----END RSA PRIVATE KEY-----/g,
    severity: "critical",
    category: "certificate",
  },
  {
    id: "private_key_openssh",
    name: "OpenSSH Private Key",
    description: "OpenSSH private key",
    regex: /-----BEGIN OPENSSH PRIVATE KEY-----[\s\S]+?-----END OPENSSH PRIVATE KEY-----/g,
    severity: "critical",
    category: "certificate",
  },
  {
    id: "private_key_dsa",
    name: "DSA Private Key",
    description: "DSA private key in PEM format",
    regex: /-----BEGIN DSA PRIVATE KEY-----[\s\S]+?-----END DSA PRIVATE KEY-----/g,
    severity: "critical",
    category: "certificate",
  },
  {
    id: "private_key_ec",
    name: "EC Private Key",
    description: "Elliptic Curve private key",
    regex: /-----BEGIN EC PRIVATE KEY-----[\s\S]+?-----END EC PRIVATE KEY-----/g,
    severity: "critical",
    category: "certificate",
  },
  {
    id: "private_key_generic",
    name: "Private Key",
    description: "Generic private key",
    regex: /-----BEGIN PRIVATE KEY-----[\s\S]+?-----END PRIVATE KEY-----/g,
    severity: "critical",
    category: "certificate",
  },
  {
    id: "firebase_api_key",
    name: "Firebase API Key",
    description: "Firebase configuration API key",
    regex: /AAAA[A-Za-z0-9_-]{7}:[A-Za-z0-9_-]{140}/g,
    severity: "high",
    category: "api_key",
  },
  {
    id: "twilio_api_key",
    name: "Twilio API Key",
    description: "Twilio API key or auth token",
    regex: /SK[a-fA-F0-9]{32}/g,
    severity: "critical",
    category: "api_key",
  },
  {
    id: "sendgrid_api_key",
    name: "SendGrid API Key",
    description: "SendGrid email API key",
    regex: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/g,
    severity: "critical",
    category: "api_key",
  },
  {
    id: "mailgun_api_key",
    name: "Mailgun API Key",
    description: "Mailgun email API key",
    regex: /key-[0-9a-zA-Z]{32}/g,
    severity: "critical",
    category: "api_key",
  },
  {
    id: "npm_token",
    name: "NPM Token",
    description: "NPM access token",
    regex: /npm_[A-Za-z0-9]{36}/g,
    severity: "critical",
    category: "token",
  },
  {
    id: "heroku_api_key",
    name: "Heroku API Key",
    description: "Heroku API key",
    regex: /[h|H]eroku.*[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}/gi,
    severity: "critical",
    category: "api_key",
  },
  {
    id: "azure_connection_string",
    name: "Azure Connection String",
    description: "Microsoft Azure storage connection string",
    regex: /DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=[A-Za-z0-9+/=]{88};/g,
    severity: "critical",
    category: "cloud",
  },
  {
    id: "azure_sas_token",
    name: "Azure SAS Token",
    description: "Azure Shared Access Signature token",
    regex: /[?&]sig=[A-Za-z0-9%]+/g,
    severity: "high",
    category: "cloud",
  },
  {
    id: "gcp_service_account",
    name: "GCP Service Account",
    description: "Google Cloud Platform service account key",
    regex: /"type"\s*:\s*"service_account"[\s\S]*"private_key"/g,
    severity: "critical",
    category: "cloud",
  },
  {
    id: "password_field",
    name: "Password Field",
    description: "Potential password in field value",
    regex: /(?:password|passwd|pwd|pass|secret|credential)['"]?\s*[=:]\s*['"]?[^\s'"]{6,}['"]?/gi,
    severity: "high",
    category: "password",
  },
  {
    id: "api_key_generic",
    name: "Generic API Key",
    description: "Generic API key pattern",
    regex: /(?:api[_-]?key|apikey)['"]?\s*[=:]\s*['"]?[A-Za-z0-9\-_]{20,}['"]?/gi,
    severity: "medium",
    category: "api_key",
  },
  {
    id: "auth_token_generic",
    name: "Generic Auth Token",
    description: "Generic authentication token",
    regex: /(?:auth[_-]?token|access[_-]?token|token)['"]?\s*[=:]\s*['"]?[A-Za-z0-9\-_.]{20,}['"]?/gi,
    severity: "medium",
    category: "token",
  },
  {
    id: "secret_generic",
    name: "Generic Secret",
    description: "Generic secret value",
    regex: /(?:secret|client[_-]?secret|app[_-]?secret)['"]?\s*[=:]\s*['"]?[A-Za-z0-9\-_]{16,}['"]?/gi,
    severity: "medium",
    category: "credential",
  },
  {
    id: "mongodb_uri",
    name: "MongoDB URI",
    description: "MongoDB connection string with credentials",
    regex: /mongodb(?:\+srv)?:\/\/[^:]+:[^@]+@[^/]+/g,
    severity: "critical",
    category: "database",
  },
  {
    id: "postgres_uri",
    name: "PostgreSQL URI",
    description: "PostgreSQL connection string with credentials",
    regex: /postgres(?:ql)?:\/\/[^:]+:[^@]+@[^/]+/g,
    severity: "critical",
    category: "database",
  },
  {
    id: "mysql_uri",
    name: "MySQL URI",
    description: "MySQL connection string with credentials",
    regex: /mysql:\/\/[^:]+:[^@]+@[^/]+/g,
    severity: "critical",
    category: "database",
  },
  {
    id: "redis_uri",
    name: "Redis URI",
    description: "Redis connection string with credentials",
    regex: /redis:\/\/[^:]+:[^@]+@[^/]+/g,
    severity: "critical",
    category: "database",
  },
  {
    id: "openai_api_key",
    name: "OpenAI API Key",
    description: "OpenAI API key",
    regex: /sk-[A-Za-z0-9]{48}/g,
    severity: "critical",
    category: "api_key",
  },
  {
    id: "anthropic_api_key",
    name: "Anthropic API Key",
    description: "Anthropic Claude API key",
    regex: /sk-ant-[A-Za-z0-9\-_]{40,}/g,
    severity: "critical",
    category: "api_key",
  },
  {
    id: "telegram_bot_token",
    name: "Telegram Bot Token",
    description: "Telegram Bot API token",
    regex: /[0-9]{8,10}:[A-Za-z0-9_-]{35}/g,
    severity: "critical",
    category: "token",
  },
  {
    id: "twitter_bearer",
    name: "Twitter Bearer Token",
    description: "Twitter API bearer token",
    regex: /AAAAAAAAAAAAAAAAAAAAAA[A-Za-z0-9%]+/g,
    severity: "critical",
    category: "token",
  },
  {
    id: "facebook_access_token",
    name: "Facebook Access Token",
    description: "Facebook Graph API access token",
    regex: /EAA[A-Za-z0-9]+/g,
    severity: "high",
    category: "token",
  },
  {
    id: "shopify_token",
    name: "Shopify Token",
    description: "Shopify API access token",
    regex: /shpat_[a-fA-F0-9]{32}/g,
    severity: "critical",
    category: "token",
  },
  {
    id: "paypal_token",
    name: "PayPal Token",
    description: "PayPal access token or client ID",
    regex: /access_token\$production\$[a-z0-9]{16}\$[a-f0-9]{32}/g,
    severity: "critical",
    category: "token",
  },
  {
    id: "square_token",
    name: "Square Token",
    description: "Square API access token",
    regex: /sq0atp-[A-Za-z0-9\-_]{22}/g,
    severity: "critical",
    category: "token",
  },
  {
    id: "datadog_api_key",
    name: "Datadog API Key",
    description: "Datadog API key",
    regex: /[a-f0-9]{32}/g,
    severity: "medium",
    category: "api_key",
  },
  {
    id: "ip_address",
    name: "Internal IP Address",
    description: "Private/internal IP address exposure",
    regex: /(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})/g,
    severity: "low",
    category: "config",
  },
  {
    id: "env_file_content",
    name: "Environment Variable",
    description: "Environment file content exposure",
    regex: /(?:^|\n)[A-Z_]+=['"]?[^'"=\n]+['"]?(?=\n|$)/g,
    severity: "medium",
    category: "config",
  },
];

export function scanForSecrets(
  content: string,
  location: SecretMatch["location"],
  requestId: string,
  host: string,
  timestamp: number
): SecretMatch[] {
  const matches: SecretMatch[] = [];
  
  if (!content || typeof content !== "string") {
    return matches;
  }

  SECRET_PATTERNS.forEach((pattern) => {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      const matchValue = match[0];
      const startIndex = Math.max(0, match.index - 30);
      const endIndex = Math.min(content.length, match.index + matchValue.length + 30);
      const context = content.slice(startIndex, endIndex);
      
      const existingMatch = matches.find(
        (m) => m.patternId === pattern.id && m.match === matchValue
      );
      
      if (!existingMatch) {
        matches.push({
          id: `${requestId}-${pattern.id}-${match.index}`,
          patternId: pattern.id,
          patternName: pattern.name,
          severity: pattern.severity,
          category: pattern.category,
          match: matchValue.length > 100 ? matchValue.slice(0, 97) + "..." : matchValue,
          context: context.replace(/\n/g, " ").trim(),
          location,
          requestId,
          host,
          timestamp,
        });
      }
    }
  });

  return matches;
}

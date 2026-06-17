const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "https://gestao-amesa.vercel.app"
];

function splitEnvList(value = "") {
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function numberFromEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const securityConfig = {
  allowedOrigins: [
    ...defaultAllowedOrigins,
    ...splitEnvList(process.env.CORS_ALLOWED_ORIGINS),
    process.env.FRONTEND_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
  ].filter(Boolean),
  allowedVercelPattern:
    process.env.CORS_ALLOW_VERCEL_PREVIEWS === "true" ? /^https:\/\/[a-z0-9-]+\.vercel\.app$/i : null,
  requestTimeoutMs: numberFromEnv("REQUEST_TIMEOUT_MS", 30000),
  jsonBodyLimit: process.env.JSON_BODY_LIMIT || "1mb",
  generalRateLimit: {
    windowMs: numberFromEnv("RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
    max: numberFromEnv("RATE_LIMIT_MAX", 500)
  },
  authRateLimit: {
    windowMs: numberFromEnv("AUTH_RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
    max: numberFromEnv("AUTH_RATE_LIMIT_MAX", 5)
  },
  uploadRateLimit: {
    windowMs: numberFromEnv("UPLOAD_RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
    max: numberFromEnv("UPLOAD_RATE_LIMIT_MAX", 30)
  },
  uploadLimits: {
    evidenceMaxBytes: numberFromEnv("EVIDENCE_MAX_MB", 8) * 1024 * 1024,
    logoMaxBytes: numberFromEnv("COMPANY_LOGO_MAX_MB", 3) * 1024 * 1024
  }
};

export function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (securityConfig.allowedOrigins.includes(origin)) return true;
  return securityConfig.allowedVercelPattern?.test(origin) || false;
}

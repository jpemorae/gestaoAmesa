import rateLimit from "express-rate-limit";
import { securityConfig } from "../config/security.js";
import { logSecurityEvent } from "../services/security/securityEvents.js";

function rateLimitHandler(action) {
  return (req, res) => {
    logSecurityEvent(req, {
      action,
      reason: "rate_limit_exceeded",
      status_code: 429
    });

    return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." });
  };
}

export const generalRateLimiter = rateLimit({
  windowMs: securityConfig.generalRateLimit.windowMs,
  max: securityConfig.generalRateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler("rate_limit_general")
});

export const authRateLimiter = rateLimit({
  windowMs: securityConfig.authRateLimit.windowMs,
  max: securityConfig.authRateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: rateLimitHandler("rate_limit_auth")
});

export const uploadRateLimiter = rateLimit({
  windowMs: securityConfig.uploadRateLimit.windowMs,
  max: securityConfig.uploadRateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler("rate_limit_upload")
});

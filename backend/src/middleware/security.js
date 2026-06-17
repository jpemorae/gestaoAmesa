import compression from "compression";
import cors from "cors";
import helmet from "helmet";
import hpp from "hpp";
import xss from "xss-clean";
import { isAllowedOrigin, securityConfig } from "../config/security.js";
import { logSecurityEvent } from "../services/security/securityEvents.js";
import { generalRateLimiter } from "./rateLimit.js";

export const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);

    const error = new Error("Origem nao permitida pelo CORS.");
    error.status = 403;
    error.statusCode = 403;
    return callback(error);
  },
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Company-Id"],
  maxAge: 86400
};

function requestTimeout(req, res, next) {
  req.setTimeout(securityConfig.requestTimeoutMs, () => {
    logSecurityEvent(req, {
      action: "request_timeout",
      reason: "request_timeout",
      status_code: 408
    });

    if (!res.headersSent) res.status(408).json({ error: "Tempo limite da requisicao excedido." });
  });

  next();
}

export function installSecurityMiddleware(app) {
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(requestTimeout);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    })
  );
  app.use(compression());
  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
  app.use(generalRateLimiter);
}

export function installInputSanitizers(app) {
  app.use(hpp());
  app.use(xss());
}

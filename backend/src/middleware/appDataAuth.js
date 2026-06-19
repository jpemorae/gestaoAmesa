import crypto from "crypto";

const SESSION_TTL_SECONDS = Number(process.env.APP_DATA_SESSION_TTL_SECONDS || 8 * 60 * 60);

function tokenSecret() {
  return process.env.APP_DATA_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signPayload(payload) {
  return crypto.createHmac("sha256", tokenSecret()).update(payload).digest("base64url");
}

export function createAppDataToken(user) {
  if (!tokenSecret()) {
    throw new Error("APP_DATA_SESSION_SECRET nao configurado.");
  }

  const payload = encode({
    id: user.id,
    email: user.email,
    profile: user.profile,
    userType: user.userType || user.user_type || "platform",
    companyId: user.companyId || user.company_id || null,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  });
  return `${payload}.${signPayload(payload)}`;
}

export function requireAppDataSession(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token || !token.includes(".")) return res.status(401).json({ error: "Sessao nao enviada." });
  if (!tokenSecret()) return res.status(503).json({ error: "Sessao da API nao configurada." });

  const [payload, signature] = token.split(".");
  const expected = signPayload(payload);
  const signatureBuffer = Buffer.from(signature || "");
  const expectedBuffer = Buffer.from(expected);
  const valid = signatureBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  if (!valid) return res.status(401).json({ error: "Sessao invalida." });

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({ error: "Sessao expirada." });
    }
    req.appDataUser = data;
    return next();
  } catch {
    return res.status(401).json({ error: "Sessao invalida." });
  }
}

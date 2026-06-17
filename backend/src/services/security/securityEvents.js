import { supabaseAdmin } from "../../config/supabase.js";

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) return String(forwardedFor).split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || null;
}

function securityEventFromRequest(req, overrides = {}) {
  return {
    user_id: req.profile?.id || req.authUser?.id || null,
    company_id: req.companyId || req.profile?.company_id || null,
    action: overrides.action || "security_event",
    route: req.originalUrl || req.path || null,
    method: req.method || null,
    reason: overrides.reason || null,
    ip: getClientIp(req),
    user_agent: req.headers["user-agent"] || null,
    status_code: overrides.status_code || null
  };
}

export async function logSecurityEvent(req, overrides = {}) {
  try {
    const event = securityEventFromRequest(req, overrides);
    await supabaseAdmin.from("security_audit_logs").insert(event);
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("Falha ao registrar auditoria de seguranca:", error.message);
    }
  }
}

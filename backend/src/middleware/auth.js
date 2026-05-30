import { supabaseAnon, supabaseAdmin } from "../config/supabase.js";

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) return res.status(401).json({ error: "Token não enviado." });

  const { data, error } = await supabaseAnon.auth.getUser(token);

  if (error || !data?.user) return res.status(401).json({ error: "Token inválido." });

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users_profile")
    .select("*")
    .eq("auth_user_id", data.user.id)
    .single();

  if (profileError || !profile) return res.status(403).json({ error: "Perfil não encontrado." });

  req.authUser = data.user;
  req.profile = profile;
  req.companyId = profile.company_id;

  return next();
}

export function requireProfile(allowedProfiles = []) {
  return (req, res, next) => {
    if (!allowedProfiles.includes(req.profile.profile)) {
      return res.status(403).json({ error: "Acesso negado." });
    }
    next();
  };
}

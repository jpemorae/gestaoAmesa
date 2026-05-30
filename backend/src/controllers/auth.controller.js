import { supabaseAnon, supabaseAdmin } from "../config/supabase.js";

export async function login(req, res) {
  const { email, password } = req.body;
  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: "Login inválido." });

  const { data: profile } = await supabaseAdmin
    .from("users_profile")
    .select("*")
    .eq("auth_user_id", data.user.id)
    .single();

  return res.json({ session: data.session, user: data.user, profile });
}

export async function me(req, res) {
  return res.json({ user: req.authUser, profile: req.profile });
}

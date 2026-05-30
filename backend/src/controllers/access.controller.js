import { supabaseAdmin } from "../config/supabase.js";

export async function listDepartments(req, res) {
  let query = supabaseAdmin.from("departments").select("*").order("name");
  if (req.profile.profile !== "Super Admin") query = query.eq("company_id", req.companyId);
  const { data, error } = await query;
  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
}

export async function createDepartment(req, res) {
  const payload = { ...req.body, company_id: req.profile.profile === "Super Admin" ? req.body.company_id : req.companyId };
  const { data, error } = await supabaseAdmin.from("departments").insert(payload).select().single();
  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json(data);
}

export async function listUsers(req, res) {
  let query = supabaseAdmin.from("users_profile").select("*, departments(*)").order("created_at", { ascending: false });
  if (req.profile.profile !== "Super Admin") query = query.eq("company_id", req.companyId);
  const { data, error } = await query;
  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
}

export async function createUser(req, res) {
  const { email, password, name, profile, department_id, role, phone } = req.body;
  const company_id = req.profile.profile === "Super Admin" ? req.body.company_id : req.companyId;

  const { data: auth, error: authError } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true });
  if (authError) return res.status(400).json({ error: authError.message });

  const { data, error } = await supabaseAdmin.from("users_profile").insert({
    auth_user_id: auth.user.id, company_id, email, name, profile, department_id, role, phone
  }).select().single();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json(data);
}

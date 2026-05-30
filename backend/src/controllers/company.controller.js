import { supabaseAdmin } from "../config/supabase.js";

export async function listCompanies(req, res) {
  const { data, error } = await supabaseAdmin.from("companies").select("*").order("created_at", { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
}

export async function createCompany(req, res) {
  const { data, error } = await supabaseAdmin.from("companies").insert(req.body).select().single();
  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json(data);
}

export async function updateCompany(req, res) {
  const { data, error } = await supabaseAdmin.from("companies").update(req.body).eq("id", req.params.id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
}

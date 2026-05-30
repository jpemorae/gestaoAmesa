import { supabaseAdmin } from "../config/supabase.js";

export async function listActivities(req, res) {
  let query = supabaseAdmin.from("activities").select("*, departments(*)").eq("company_id", req.companyId).eq("status", "Ativo").order("start_time");
  if (req.profile.profile === "Operação" && req.profile.department_id) query = query.eq("department_id", req.profile.department_id);
  const { data, error } = await query;
  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
}

export async function createActivity(req, res) {
  const { data, error } = await supabaseAdmin.from("activities").insert({ ...req.body, company_id: req.companyId }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json(data);
}

export async function listExecutions(req, res) {
  let query = supabaseAdmin.from("checklist_executions").select("*, activities(*), users_profile(*)").eq("company_id", req.companyId).order("created_at", { ascending: false });
  if (req.profile.profile === "Operação") query = query.eq("user_id", req.profile.id);
  const { data, error } = await query;
  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
}

export async function startExecution(req, res) {
  const { data, error } = await supabaseAdmin.from("checklist_executions").insert({
    company_id: req.companyId, activity_id: req.params.activityId, user_id: req.profile.id,
    status: "Executando", started_at: new Date().toISOString()
  }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json(data);
}

export async function markPending(req, res) {
  const { data, error } = await supabaseAdmin.from("checklist_executions").update({
    status: "Pendência", pending_reason: req.body.pending_reason
  }).eq("id", req.params.executionId).eq("company_id", req.companyId).select().single();
  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
}

export async function finishExecution(req, res) {
  if (!req.body.evidence_photo_url) return res.status(400).json({ error: "Foto de evidência obrigatória." });
  const { data, error } = await supabaseAdmin.from("checklist_executions").update({
    status: "Concluído", finished_at: new Date().toISOString(), evidence_photo_url: req.body.evidence_photo_url
  }).eq("id", req.params.executionId).eq("company_id", req.companyId).select().single();
  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
}

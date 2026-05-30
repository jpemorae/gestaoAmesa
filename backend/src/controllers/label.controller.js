import { supabaseAdmin } from "../config/supabase.js";

export async function listLabels(req, res) {
  const { data, error } = await supabaseAdmin.from("labels").select("*, products(*)").eq("company_id", req.companyId).order("created_at", { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
}

export async function createLabels(req, res) {
  const { product_id, quantity, unit, count, expiry_date } = req.body;
  const rows = Array.from({ length: Number(count || 1) }, (_, index) => ({
    company_id: req.companyId, product_id, code: `ETQ-${Date.now()}-${index + 1}`,
    quantity, unit, expiry_date, status: "Disponível"
  }));
  const { data, error } = await supabaseAdmin.from("labels").insert(rows).select();
  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json(data);
}

async function decrementStock(req, label, movementType, reason) {
  let remaining = Number(label.quantity);
  const { data: lots, error } = await supabaseAdmin
    .from("stock_lots")
    .select("*")
    .eq("company_id", req.companyId)
    .eq("product_id", label.product_id)
    .gt("quantity", 0)
    .order("expiry_date", { ascending: true });

  if (error) throw error;

  for (const lot of lots) {
    if (remaining <= 0) break;
    const used = Math.min(Number(lot.quantity), remaining);
    remaining -= used;
    await supabaseAdmin.from("stock_lots").update({ quantity: Number(lot.quantity) - used }).eq("id", lot.id);
    await supabaseAdmin.from("stock_movements").insert({
      company_id: req.companyId, product_id: label.product_id, lot_id: lot.id,
      movement_type: movementType, quantity: used, unit: label.unit, reason, created_by: req.profile.id
    });
  }
  if (remaining > 0) throw new Error("Estoque insuficiente.");
}

export async function consumeLabel(req, res) {
  const { code } = req.params;
  const { area_id } = req.body;
  const { data: label, error } = await supabaseAdmin.from("labels").select("*").eq("company_id", req.companyId).eq("code", code).single();
  if (error || !label) return res.status(404).json({ error: "Etiqueta não encontrada." });
  if (label.status !== "Disponível") return res.status(400).json({ error: "Etiqueta não disponível." });

  try {
    await decrementStock(req, label, "consumo", "Produção para mesa");
    const { data } = await supabaseAdmin.from("labels").update({
      status: "Consumido", consumed_at: new Date().toISOString(), consumed_by: req.profile.id,
      consumed_area_id: area_id, consumption_type: "Produção para mesa"
    }).eq("id", label.id).select().single();
    return res.json(data);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

export async function discardLabel(req, res) {
  const { code } = req.params;
  const { area_id, reason } = req.body;
  const { data: label, error } = await supabaseAdmin.from("labels").select("*").eq("company_id", req.companyId).eq("code", code).single();
  if (error || !label) return res.status(404).json({ error: "Etiqueta não encontrada." });
  if (label.status !== "Disponível") return res.status(400).json({ error: "Etiqueta não disponível." });

  try {
    await decrementStock(req, label, "descarte", reason || "Descarte");
    const { data } = await supabaseAdmin.from("labels").update({
      status: "Descartado", consumed_at: new Date().toISOString(), consumed_by: req.profile.id,
      consumed_area_id: area_id, consumption_type: "Descarte", discard_reason: reason
    }).eq("id", label.id).select().single();
    return res.json(data);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

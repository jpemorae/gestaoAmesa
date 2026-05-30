import { supabaseAdmin } from "../config/supabase.js";

export async function listProducts(req, res) {
  const { data, error } = await supabaseAdmin.from("products").select("*, product_categories(*)").eq("company_id", req.companyId).order("name");
  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
}

export async function createProduct(req, res) {
  const { data, error } = await supabaseAdmin.from("products").insert({ ...req.body, company_id: req.companyId }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json(data);
}

export async function listStockLots(req, res) {
  const { data, error } = await supabaseAdmin.from("stock_lots").select("*, products(*)").eq("company_id", req.companyId).order("created_at", { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
}

export async function createStockEntry(req, res) {
  const payload = { ...req.body, company_id: req.companyId, initial_quantity: req.body.quantity, created_by: req.profile.id };
  const { data, error } = await supabaseAdmin.from("stock_lots").insert(payload).select().single();
  if (error) return res.status(400).json({ error: error.message });

  await supabaseAdmin.from("stock_movements").insert({
    company_id: req.companyId, product_id: req.body.product_id, lot_id: data.id,
    movement_type: "entrada", quantity: req.body.quantity, unit: req.body.unit,
    reason: req.body.origin || "Entrada de estoque", created_by: req.profile.id
  });

  return res.status(201).json(data);
}

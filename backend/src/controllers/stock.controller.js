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

function profileId(req) {
  return req.profile?.id || req.authUser?.id || null;
}

async function findOrCreateByName(table, companyId, name) {
  const cleanName = String(name || "").trim();
  if (!cleanName) return null;

  const { data: existing, error: selectError } = await supabaseAdmin
    .from(table)
    .select("id, name")
    .eq("company_id", companyId)
    .ilike("name", cleanName)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing;

  const { data, error } = await supabaseAdmin
    .from(table)
    .insert({ company_id: companyId, name: cleanName })
    .select("id, name")
    .single();

  if (error) throw error;
  return data;
}

export async function listInventoryProducts(req, res) {
  const { data, error } = await supabaseAdmin
    .from("inventory_products")
    .select("*, inventory_categories(*)")
    .eq("company_id", req.companyId)
    .order("name");

  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
}

export async function createInventoryProduct(req, res) {
  const payload = {
    ...req.body,
    company_id: req.companyId,
    created_by: profileId(req)
  };

  const { data, error } = await supabaseAdmin.from("inventory_products").insert(payload).select().single();
  if (error) return res.status(400).json({ error: error.message });

  await supabaseAdmin.from("inventory_movements").insert({
    company_id: req.companyId,
    product_id: data.id,
    movement_type: "ajuste",
    quantity: 0,
    unit: data.unit,
    reason: "Produto cadastrado",
    created_by: profileId(req)
  });

  return res.status(201).json(data);
}

export async function updateInventoryProduct(req, res) {
  const { data, error } = await supabaseAdmin
    .from("inventory_products")
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq("company_id", req.companyId)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
}

export async function inactivateInventoryProduct(req, res) {
  const { data, error } = await supabaseAdmin
    .from("inventory_products")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("company_id", req.companyId)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  await supabaseAdmin.from("inventory_movements").insert({
    company_id: req.companyId,
    product_id: req.params.id,
    movement_type: "ajuste",
    quantity: 0,
    unit: data.unit,
    reason: "Produto inativado",
    created_by: profileId(req)
  });

  return res.json(data);
}

export async function listInventoryLots(req, res) {
  const { data, error } = await supabaseAdmin
    .from("inventory_batches")
    .select("*, inventory_products(*), suppliers(*), inventory_locations(*)")
    .eq("company_id", req.companyId)
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
}

export async function listInventoryMovements(req, res) {
  const { data, error } = await supabaseAdmin
    .from("inventory_movements")
    .select("*, inventory_products(*)")
    .eq("company_id", req.companyId)
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
}

export async function listInventoryLosses(req, res) {
  const { data, error } = await supabaseAdmin
    .from("inventory_losses")
    .select("*, inventory_products(*)")
    .eq("company_id", req.companyId)
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
}

export async function inventoryDashboard(req, res) {
  const { data: products, error: productError } = await supabaseAdmin
    .from("inventory_products")
    .select("*")
    .eq("company_id", req.companyId)
    .eq("active", true);
  if (productError) return res.status(400).json({ error: productError.message });

  const { data: batches, error: batchError } = await supabaseAdmin
    .from("inventory_batches")
    .select("*")
    .eq("company_id", req.companyId);
  if (batchError) return res.status(400).json({ error: batchError.message });

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const { data: losses, error: lossError } = await supabaseAdmin
    .from("inventory_losses")
    .select("*")
    .eq("company_id", req.companyId)
    .gte("created_at", startOfMonth.toISOString());
  if (lossError) return res.status(400).json({ error: lossError.message });

  const totalsByProduct = new Map();
  for (const batch of batches || []) {
    const current = totalsByProduct.get(batch.product_id) || { quantity: 0, value: 0, expired: false, expiring: false };
    const quantity = Number(batch.quantity || 0);
    const expiryDays = batch.expiry_date ? Math.ceil((new Date(batch.expiry_date) - new Date()) / 86400000) : 9999;
    current.quantity += quantity;
    current.value += quantity * Number(batch.unit_cost || 0);
    current.expired = current.expired || expiryDays < 0;
    current.expiring = current.expiring || (expiryDays >= 0 && expiryDays <= Number(req.query.alertDays || 2));
    totalsByProduct.set(batch.product_id, current);
  }

  return res.json({
    totalValue: [...totalsByProduct.values()].reduce((sum, item) => sum + item.value, 0),
    lowStock: (products || []).filter((product) => (totalsByProduct.get(product.id)?.quantity || 0) <= Number(product.min_stock || 0)).length,
    expiring: [...totalsByProduct.values()].filter((item) => item.expiring).length,
    expired: [...totalsByProduct.values()].filter((item) => item.expired).length,
    lossMonth: (losses || []).reduce((sum, loss) => sum + Number(loss.total_value || 0), 0)
  });
}

export async function registerInventoryEntry(req, res) {
  try {
    const supplier = await findOrCreateByName("suppliers", req.companyId, req.body.supplier_name);
    const location = await findOrCreateByName("inventory_locations", req.companyId, req.body.location_name);
    const payload = {
      company_id: req.companyId,
      product_id: req.body.product_id,
      supplier_id: supplier?.id || req.body.supplier_id || null,
      location_id: location?.id || req.body.location_id || null,
      batch_code: req.body.batch_code,
      quantity: req.body.quantity,
      initial_quantity: req.body.quantity,
      unit: req.body.unit,
      expiry_date: req.body.expiry_date || null,
      unit_cost: req.body.unit_cost || 0,
      invoice_url: req.body.invoice_url || null,
      note: req.body.note || null,
      created_by: profileId(req)
    };

    const { data: batch, error } = await supabaseAdmin.from("inventory_batches").insert(payload).select().single();
    if (error) return res.status(400).json({ error: error.message });

    await supabaseAdmin.from("inventory_movements").insert({
      company_id: req.companyId,
      product_id: req.body.product_id,
      batch_id: batch.id,
      movement_type: "entrada",
      quantity: req.body.quantity,
      unit: req.body.unit,
      to_location_id: payload.location_id,
      reason: "Entrada de estoque",
      note: req.body.note || null,
      created_by: profileId(req)
    });

    return res.status(201).json(batch);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function consumeBatches(req, { productId, quantity, unit, locationId, reason, note, movementType }) {
  let remaining = Number(quantity);
  const query = supabaseAdmin
    .from("inventory_batches")
    .select("*")
    .eq("company_id", req.companyId)
    .eq("product_id", productId)
    .gt("quantity", 0)
    .order("expiry_date", { ascending: true, nullsFirst: false });

  if (locationId) query.eq("location_id", locationId);

  const { data: batches, error } = await query;
  if (error) throw error;

  const available = (batches || []).reduce((sum, batch) => sum + Number(batch.quantity || 0), 0);
  if (available < remaining) {
    const err = new Error("Saldo insuficiente para a movimentacao.");
    err.status = 409;
    throw err;
  }

  const consumed = [];
  for (const batch of batches || []) {
    if (remaining <= 0) break;
    const used = Math.min(Number(batch.quantity || 0), remaining);
    remaining -= used;
    consumed.push({ batch, used });
    const { error: updateError } = await supabaseAdmin
      .from("inventory_batches")
      .update({ quantity: Number(batch.quantity || 0) - used, updated_at: new Date().toISOString() })
      .eq("id", batch.id);
    if (updateError) throw updateError;
  }

  const { data: movement, error: movementError } = await supabaseAdmin
    .from("inventory_movements")
    .insert({
      company_id: req.companyId,
      product_id: productId,
      movement_type: movementType,
      quantity,
      unit,
      from_location_id: locationId || null,
      reason,
      note,
      metadata: { consumed_batches: consumed.map((item) => ({ batch_id: item.batch.id, quantity: item.used })) },
      created_by: profileId(req)
    })
    .select()
    .single();
  if (movementError) throw movementError;

  return { movement, consumed };
}

export async function registerInventoryExit(req, res) {
  try {
    const result = await consumeBatches(req, {
      productId: req.body.product_id,
      quantity: req.body.quantity,
      unit: req.body.unit,
      locationId: req.body.location_id || null,
      reason: req.body.reason || "Saida",
      note: req.body.note || null,
      movementType: req.body.reason === "Descarte" ? "descarte" : "saida"
    });
    return res.status(201).json(result.movement);
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

export async function registerInventoryTransfer(req, res) {
  try {
    const result = await consumeBatches(req, {
      productId: req.body.product_id,
      quantity: req.body.quantity,
      unit: req.body.unit,
      locationId: req.body.from_location_id,
      reason: "Transferencia entre locais",
      note: req.body.note || null,
      movementType: "transferencia"
    });

    for (const item of result.consumed) {
      await supabaseAdmin.from("inventory_batches").insert({
        company_id: req.companyId,
        product_id: req.body.product_id,
        supplier_id: item.batch.supplier_id,
        location_id: req.body.to_location_id,
        batch_code: item.batch.batch_code,
        quantity: item.used,
        initial_quantity: item.used,
        unit: item.batch.unit,
        expiry_date: item.batch.expiry_date,
        unit_cost: item.batch.unit_cost,
        note: req.body.note || null,
        created_by: profileId(req)
      });
    }

    await supabaseAdmin.from("inventory_movements").update({ to_location_id: req.body.to_location_id }).eq("id", result.movement.id);
    return res.status(201).json(result.movement);
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

export async function registerInventoryAdjustment(req, res) {
  try {
    const productId = req.body.product_id;
    const locationId = req.body.location_id || null;
    const countedQuantity = Number(req.body.counted_quantity || 0);

    const batchQuery = supabaseAdmin
      .from("inventory_batches")
      .select("*")
      .eq("company_id", req.companyId)
      .eq("product_id", productId);
    if (locationId) batchQuery.eq("location_id", locationId);

    const { data: batches, error } = await batchQuery;
    if (error) throw error;

    const expectedQuantity = (batches || []).reduce((sum, batch) => sum + Number(batch.quantity || 0), 0);
    const difference = countedQuantity - expectedQuantity;

    if (difference > 0) {
      await supabaseAdmin.from("inventory_batches").insert({
        company_id: req.companyId,
        product_id: productId,
        location_id: locationId,
        batch_code: `INV-${Date.now()}`,
        quantity: difference,
        initial_quantity: difference,
        unit: req.body.unit,
        unit_cost: req.body.unit_cost || 0,
        note: req.body.note || null,
        created_by: profileId(req)
      });
    } else if (difference < 0) {
      await consumeBatches(req, {
        productId,
        quantity: Math.abs(difference),
        unit: req.body.unit,
        locationId,
        reason: req.body.reason || "Inventario",
        note: req.body.note || null,
        movementType: "inventario"
      });
    }

    const { data: movement, error: movementError } = await supabaseAdmin.from("inventory_movements").insert({
      company_id: req.companyId,
      product_id: productId,
      movement_type: "inventario",
      quantity: difference,
      unit: req.body.unit,
      from_location_id: locationId,
      to_location_id: locationId,
      reason: req.body.reason || "Inventario",
      note: req.body.note || null,
      metadata: { expected_quantity: expectedQuantity, counted_quantity: countedQuantity },
      created_by: profileId(req)
    }).select().single();
    if (movementError) throw movementError;

    return res.status(201).json(movement);
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

export async function registerInventoryLoss(req, res) {
  try {
    const result = await consumeBatches(req, {
      productId: req.body.product_id,
      quantity: req.body.quantity,
      unit: req.body.unit,
      locationId: req.body.location_id || null,
      reason: req.body.reason || "Descarte",
      note: req.body.note || null,
      movementType: "descarte"
    });
    const totalValue = result.consumed.reduce((sum, item) => sum + Number(item.used) * Number(item.batch.unit_cost || 0), 0);
    const { data, error } = await supabaseAdmin.from("inventory_losses").insert({
      company_id: req.companyId,
      product_id: req.body.product_id,
      movement_id: result.movement.id,
      quantity: req.body.quantity,
      unit: req.body.unit,
      total_value: totalValue,
      reason: req.body.reason,
      responsible_name: req.body.responsible_name,
      location_id: req.body.location_id || null,
      photo_url: req.body.photo_url || null,
      note: req.body.note || null,
      created_by: profileId(req)
    }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json(data);
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

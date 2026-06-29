import { supabaseAdmin } from "../config/supabase.js";

function profileId(req) {
  return req.profile?.id || req.authUser?.id || null;
}

export async function listBillingCustomers(req, res) {
  const { data, error } = await supabaseAdmin
    .from("billing_customers")
    .select("*")
    .eq("company_id", req.companyId)
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
}

export async function upsertBillingCustomer(req, res) {
  const payload = {
    ...req.body,
    company_id: req.companyId,
    created_by: req.body.id ? undefined : profileId(req),
    updated_at: new Date().toISOString()
  };

  const query = req.body.id
    ? supabaseAdmin.from("billing_customers").update(payload).eq("company_id", req.companyId).eq("id", req.body.id)
    : supabaseAdmin.from("billing_customers").insert(payload);

  const { data, error } = await query.select().single();
  if (error) return res.status(400).json({ error: error.message });
  return res.status(req.body.id ? 200 : 201).json(data);
}

export async function listBillingCharges(req, res) {
  const { data, error } = await supabaseAdmin
    .from("billing_charges")
    .select("*, billing_customers(*)")
    .eq("company_id", req.companyId)
    .order("due_date", { ascending: true });

  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
}

export async function createBillingCharges(req, res) {
  const charges = Array.isArray(req.body.charges) ? req.body.charges : [req.body];
  const rows = charges.map((charge) => ({
    ...charge,
    company_id: req.companyId,
    created_by: profileId(req)
  }));

  const { data, error } = await supabaseAdmin.from("billing_charges").insert(rows).select();
  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json(data);
}

export async function updateBillingCharge(req, res) {
  const { data, error } = await supabaseAdmin
    .from("billing_charges")
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq("company_id", req.companyId)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
}

export async function registerBillingPayment(req, res) {
  const amount = Number(req.body.amount || 0);
  if (amount <= 0) return res.status(400).json({ error: "Valor de pagamento invalido." });

  const { data: charge, error: chargeError } = await supabaseAdmin
    .from("billing_charges")
    .select("*")
    .eq("company_id", req.companyId)
    .eq("id", req.params.id)
    .single();
  if (chargeError) return res.status(400).json({ error: chargeError.message });

  const { data: payment, error: paymentError } = await supabaseAdmin.from("billing_payments").insert({
    company_id: req.companyId,
    charge_id: charge.id,
    customer_id: charge.customer_id,
    amount,
    payment_method: req.body.payment_method || charge.payment_method,
    paid_at: req.body.paid_at || new Date().toISOString().slice(0, 10),
    notes: req.body.notes || null,
    created_by: profileId(req)
  }).select().single();
  if (paymentError) return res.status(400).json({ error: paymentError.message });

  const paidAmount = Math.min(Number(charge.amount || 0), Number(charge.paid_amount || 0) + amount);
  const status = paidAmount >= Number(charge.amount || 0) ? "Pago" : charge.status;
  const history = [...(Array.isArray(charge.history) ? charge.history : []), {
    date: new Date().toLocaleString("pt-BR"),
    action: paidAmount >= Number(charge.amount || 0) ? "Pagamento integral" : "Pagamento parcial",
    note: String(amount)
  }];

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("billing_charges")
    .update({ paid_amount: paidAmount, status, paid_at: status === "Pago" ? payment.paid_at : charge.paid_at, history, updated_at: new Date().toISOString() })
    .eq("company_id", req.companyId)
    .eq("id", charge.id)
    .select()
    .single();

  if (updateError) return res.status(400).json({ error: updateError.message });
  return res.status(201).json({ payment, charge: updated });
}

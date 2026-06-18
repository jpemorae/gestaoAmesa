import crypto from "crypto";
import { supabaseAdmin } from "../config/supabase.js";

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password || ""), salt, 64).toString("hex");
  return { hash, salt };
}

function verifyPassword(password, user) {
  const { hash } = hashPassword(password, user.password_salt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(user.password_hash, "hex"));
}

function clientFromRow(row) {
  return {
    ...(row.payload || {}),
    id: row.id,
    companyName: row.company_name,
    fantasyName: row.fantasy_name,
    email: row.email || row.payload?.email || "",
    status: row.status,
    createdAt: row.payload?.createdAt || new Date(row.created_at).toLocaleDateString("pt-BR")
  };
}

function userFromRow(row) {
  return {
    ...(row.payload || {}),
    id: row.id,
    name: row.name,
    email: row.email,
    profile: row.profile,
    status: row.status,
    userType: row.user_type,
    companyId: row.company_id,
    createdAt: row.payload?.createdAt || new Date(row.created_at).toLocaleDateString("pt-BR")
  };
}

function clientPayload(body) {
  const id = body.id || crypto.randomUUID();
  const companyName = body.companyName || body.company_name || "";
  const fantasyName = body.fantasyName || body.fantasy_name || companyName;
  const status = body.status || "Ativo";

  return {
    id,
    company_name: companyName,
    fantasy_name: fantasyName,
    email: body.email || null,
    status,
    payload: { ...body, id, companyName, fantasyName, status },
    updated_at: new Date().toISOString()
  };
}

function userPayload(body, existing = null) {
  const id = body.id || existing?.id || crypto.randomUUID();
  const status = body.status || "Ativo";
  const userType = body.userType || body.user_type || "platform";
  const payload = { ...body, id, status, userType, companyId: body.companyId || body.company_id || null };
  const row = {
    id,
    name: body.name,
    email: String(body.email || "").trim().toLowerCase(),
    profile: body.profile || "Administrador",
    status,
    user_type: userType,
    company_id: body.companyId || body.company_id || null,
    payload,
    updated_at: new Date().toISOString()
  };

  if (body.password) {
    const { hash, salt } = hashPassword(body.password);
    row.password_hash = hash;
    row.password_salt = salt;
  }

  return row;
}

function isMissingAppDataTable(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("app_clients") || message.includes("app_users") || message.includes("does not exist");
}

function appDataSetupResponse(message, error = null, extra = {}) {
  return {
    clients: [],
    users: [],
    setupRequired: true,
    message,
    diagnostics: error
      ? {
          code: error.code || null,
          message: error.message || String(error),
          details: error.details || null,
          hint: error.hint || null
        }
      : null,
    ...extra
  };
}

export async function listAppData(req, res) {
  const { data: clients, error: clientsError } = await supabaseAdmin
    .from("app_clients")
    .select("*")
    .order("created_at", { ascending: false });
  if (clientsError) {
    return res.json(appDataSetupResponse(
      isMissingAppDataTable(clientsError)
        ? "Tabelas app_clients/app_users ainda nao existem no banco conectado a API."
        : "Nao foi possivel consultar app_clients no banco conectado a API.",
      clientsError
    ));
  }

  const { data: users, error: usersError } = await supabaseAdmin
    .from("app_users")
    .select("*")
    .order("created_at", { ascending: false });
  if (usersError) {
    return res.json(appDataSetupResponse(
      isMissingAppDataTable(usersError)
        ? "Tabela app_users ainda nao existe no banco conectado a API."
        : "Nao foi possivel consultar app_users no banco conectado a API.",
      usersError,
      { clients: (clients || []).map(clientFromRow) }
    ));
  }

  return res.json({
    clients: (clients || []).map(clientFromRow),
    users: (users || []).map(userFromRow)
  });
}

export async function appLogin(req, res) {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = req.body.password || "";
  const { data: user, error } = await supabaseAdmin
    .from("app_users")
    .select("*")
    .eq("email", email)
    .eq("status", "Ativo")
    .maybeSingle();

  if (error) {
    return res.status(503).json({
      error: isMissingAppDataTable(error)
        ? "Tabelas app_clients/app_users ainda nao existem no banco conectado a API."
        : "Nao foi possivel consultar app_users no banco conectado a API.",
      setupRequired: true,
      diagnostics: {
        code: error.code || null,
        message: error.message || String(error),
        details: error.details || null,
        hint: error.hint || null
      }
    });
  }
  if (!user || !verifyPassword(password, user)) {
    return res.status(401).json({ error: "Usuário ou senha inválidos." });
  }

  if (user.user_type === "client") {
    const { data: client } = await supabaseAdmin
      .from("app_clients")
      .select("*")
      .eq("id", user.company_id)
      .eq("status", "Ativo")
      .maybeSingle();
    if (!client) return res.status(401).json({ error: "Cliente inativo ou não encontrado." });
  }

  return res.json({ user: userFromRow(user) });
}

export async function appDataDiagnostics(req, res) {
  const checks = {};

  const { data: clients, error: clientsError } = await supabaseAdmin
    .from("app_clients")
    .select("id")
    .limit(1);
  checks.app_clients = clientsError
    ? { ok: false, code: clientsError.code || null, message: clientsError.message, details: clientsError.details || null, hint: clientsError.hint || null }
    : { ok: true, sampleCount: clients?.length || 0 };

  const { data: users, error: usersError } = await supabaseAdmin
    .from("app_users")
    .select("id")
    .limit(1);
  checks.app_users = usersError
    ? { ok: false, code: usersError.code || null, message: usersError.message, details: usersError.details || null, hint: usersError.hint || null }
    : { ok: true, sampleCount: users?.length || 0 };

  return res.json({
    ok: Object.values(checks).every((check) => check.ok),
    checks
  });
}

export async function upsertAppClient(req, res) {
  const payload = clientPayload(req.body);
  const { data, error } = await supabaseAdmin
    .from("app_clients")
    .upsert(payload)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json(clientFromRow(data));
}

export async function updateAppClient(req, res) {
  const payload = clientPayload({ ...req.body, id: req.params.id });
  const { data, error } = await supabaseAdmin
    .from("app_clients")
    .upsert(payload)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.json(clientFromRow(data));
}

export async function upsertAppUser(req, res) {
  const { data: existing } = await supabaseAdmin
    .from("app_users")
    .select("*")
    .eq("email", String(req.body.email || "").trim().toLowerCase())
    .maybeSingle();

  const payload = userPayload(req.body, existing);
  if (!payload.password_hash && existing) {
    payload.password_hash = existing.password_hash;
    payload.password_salt = existing.password_salt;
  }

  if (!payload.password_hash) {
    return res.status(400).json({ error: "Senha obrigatória para novo usuário." });
  }

  const { data, error } = await supabaseAdmin
    .from("app_users")
    .upsert(payload)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json(userFromRow(data));
}

export async function updateAppUser(req, res) {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("app_users")
    .select("*")
    .eq("id", req.params.id)
    .maybeSingle();
  if (existingError) return res.status(400).json({ error: existingError.message });

  const payload = userPayload({ ...req.body, id: req.params.id }, existing);
  if (!payload.password_hash) {
    if (!existing) return res.status(400).json({ error: "Senha obrigatória para novo usuário." });
    payload.password_hash = existing.password_hash;
    payload.password_salt = existing.password_salt;
  }

  const { data, error } = await supabaseAdmin
    .from("app_users")
    .upsert(payload)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.json(userFromRow(data));
}

export async function deleteAppUser(req, res) {
  const { error } = await supabaseAdmin.from("app_users").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  return res.status(204).send();
}

export async function deleteAppClient(req, res) {
  const { error } = await supabaseAdmin.from("app_clients").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  return res.status(204).send();
}

export async function getClientStockCatalog(req, res) {
  const { data, error } = await supabaseAdmin
    .from("app_clients")
    .select("payload")
    .eq("id", req.params.id)
    .maybeSingle();

  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Cliente não encontrado." });

  const catalog = data.payload?.stockCatalog || {};
  return res.json({
    categories: Array.isArray(catalog.categories) ? catalog.categories : [],
    items: Array.isArray(catalog.items) ? catalog.items : [],
    updatedAt: catalog.updatedAt || null
  });
}

export async function updateClientStockCatalog(req, res) {
  const { data: current, error: currentError } = await supabaseAdmin
    .from("app_clients")
    .select("payload")
    .eq("id", req.params.id)
    .maybeSingle();

  if (currentError) return res.status(400).json({ error: currentError.message });
  if (!current) return res.status(404).json({ error: "Cliente não encontrado." });

  const stockCatalog = {
    categories: Array.isArray(req.body.categories) ? req.body.categories : [],
    items: Array.isArray(req.body.items) ? req.body.items : [],
    updatedAt: new Date().toISOString()
  };

  const payload = {
    ...(current.payload || {}),
    stockCatalog
  };

  const { data, error } = await supabaseAdmin
    .from("app_clients")
    .update({ payload, updated_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .select("payload")
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.json(data.payload.stockCatalog);
}

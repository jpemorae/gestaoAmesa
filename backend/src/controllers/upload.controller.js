import { supabaseAdmin } from "../config/supabase.js";

export async function uploadEvidence(req, res) {
  if (!req.file) return res.status(400).json({ error: "Arquivo não enviado." });
  const path = `${req.companyId}/${Date.now()}-${req.file.originalname}`;

  const { error } = await supabaseAdmin.storage.from("evidencias").upload(path, req.file.buffer, {
    contentType: req.file.mimetype,
    upsert: false
  });
  if (error) return res.status(400).json({ error: error.message });

  const { data } = supabaseAdmin.storage.from("evidencias").getPublicUrl(path);
  return res.status(201).json({ path, url: data.publicUrl });
}

export async function uploadLogo(req, res) {
  if (!req.file) return res.status(400).json({ error: "Arquivo não enviado." });
  const path = `${req.companyId || "platform"}/${Date.now()}-${req.file.originalname}`;

  const { error } = await supabaseAdmin.storage.from("logos").upload(path, req.file.buffer, {
    contentType: req.file.mimetype,
    upsert: true
  });
  if (error) return res.status(400).json({ error: error.message });

  const { data } = supabaseAdmin.storage.from("logos").getPublicUrl(path);
  return res.status(201).json({ path, url: data.publicUrl });
}

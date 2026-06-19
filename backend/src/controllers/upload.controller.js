import { supabaseAdmin } from "../config/supabase.js";
import { assertValidUploadSignature, safeStoragePath } from "../utils/uploadSecurity.js";

export async function uploadEvidence(req, res) {
  if (!req.file) return res.status(400).json({ error: "Arquivo nao enviado." });

  const validSignature = await assertValidUploadSignature(req, req.file, "upload_evidence_blocked");
  if (!validSignature) return res.status(400).json({ error: "Arquivo de imagem invalido." });

  const path = safeStoragePath(req.companyId, req.file.originalname);
  const { error } = await supabaseAdmin.storage.from("evidencias").upload(path, req.file.buffer, {
    contentType: req.file.mimetype,
    upsert: false
  });
  if (error) return res.status(400).json({ error: error.message });

  const { data } = supabaseAdmin.storage.from("evidencias").getPublicUrl(path);
  return res.status(201).json({ path, url: data.publicUrl });
}

export async function uploadLogo(req, res) {
  if (!req.file) return res.status(400).json({ error: "Arquivo nao enviado." });

  const validSignature = await assertValidUploadSignature(req, req.file, "upload_logo_blocked");
  if (!validSignature) return res.status(400).json({ error: "Arquivo de imagem invalido." });

  const path = safeStoragePath(req.companyId || "platform", req.file.originalname);
  const { error } = await supabaseAdmin.storage.from("logos").upload(path, req.file.buffer, {
    contentType: req.file.mimetype,
    upsert: true
  });
  if (error) return res.status(400).json({ error: error.message });

  const { data } = supabaseAdmin.storage.from("logos").getPublicUrl(path);
  return res.status(201).json({ path, url: data.publicUrl });
}

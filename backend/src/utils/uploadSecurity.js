import path from "path";
import multer from "multer";
import { randomUUID } from "crypto";
import { securityConfig } from "../config/security.js";
import { logSecurityEvent } from "../services/security/securityEvents.js";

const allowedImageExtensions = new Set([".png", ".jpg", ".jpeg"]);
const allowedImageMimeTypes = new Set(["image/png", "image/jpeg"]);
const blockedExtensions = new Set([".exe", ".bat", ".cmd", ".sh", ".js", ".msi", ".vbs", ".ps1", ".scr", ".com", ".svg"]);

export function safeOriginalName(name = "arquivo") {
  return path.basename(String(name)).replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_").slice(0, 180) || "arquivo";
}

export function safeStoragePath(companyId, originalName) {
  const ext = path.extname(safeOriginalName(originalName)).toLowerCase();
  const tenant = safeOriginalName(companyId || "platform");
  return `${tenant}/${Date.now()}-${randomUUID()}${ext}`;
}

function validateUploadFile(req, file, cb, action) {
  const rawOriginalName = String(file.originalname || "");
  const originalName = safeOriginalName(rawOriginalName);
  const ext = path.extname(originalName).toLowerCase();
  const mimetype = String(file.mimetype || "").toLowerCase();
  const blocked =
    !ext ||
    rawOriginalName !== path.basename(rawOriginalName) ||
    blockedExtensions.has(ext) ||
    !allowedImageExtensions.has(ext) ||
    !allowedImageMimeTypes.has(mimetype);

  if (blocked) {
    logSecurityEvent(req, {
      action,
      reason: `upload_blocked:${ext || "no_extension"}:${mimetype || "no_mimetype"}`,
      status_code: 400
    });

    return cb(new Error("Tipo de arquivo nao permitido."));
  }

  return cb(null, true);
}

function createImageUpload(maxBytes, action) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes },
    fileFilter: (req, file, cb) => validateUploadFile(req, file, cb, action)
  });
}

export const evidenceUpload = createImageUpload(
  securityConfig.uploadLimits.evidenceMaxBytes,
  "upload_evidence_blocked"
);

export const logoUpload = createImageUpload(securityConfig.uploadLimits.logoMaxBytes, "upload_logo_blocked");

export function hasValidImageSignature(file) {
  const buffer = file?.buffer;
  const mimetype = String(file?.mimetype || "").toLowerCase();

  if (!Buffer.isBuffer(buffer)) return false;

  if (mimetype === "image/png") {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  if (mimetype === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  return false;
}

export async function assertValidUploadSignature(req, file, action) {
  if (hasValidImageSignature(file)) return true;

  await logSecurityEvent(req, {
    action,
    reason: "upload_blocked:invalid_file_signature",
    status_code: 400
  });

  return false;
}

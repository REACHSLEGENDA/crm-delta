import { supabase } from "@/lib/supabase";
import type { FileAttachment } from "@/types";

const ATTACHMENTS_BUCKET = import.meta.env.VITE_ATTACHMENTS_BUCKET || "attachments";
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "text/plain",
]);

const sanitizeFileName = (fileName: string) =>
  fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);

export const validateAttachment = (file: File) => {
  if (file.size > MAX_ATTACHMENT_SIZE) {
    return "El archivo supera el límite de 10 MB.";
  }
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    return "Formato no permitido. Usa imágenes, PDF, Word, Excel, CSV o texto.";
  }
  return null;
};

export const uploadAttachment = async (
  file: File,
  userId: string,
  scope: string,
): Promise<FileAttachment> => {
  const validationError = validateAttachment(file);
  if (validationError) throw new Error(validationError);

  const safeName = sanitizeFileName(file.name) || "archivo";
  const path = `${userId}/${scope}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw error;

  return { name: file.name, path, type: file.type, size: file.size };
};

export const openAttachment = async (attachment: FileAttachment) => {
  if (attachment.url) {
    window.open(attachment.url, "_blank", "noopener,noreferrer");
    return;
  }
  const signedUrl = await getAttachmentUrl(attachment);
  window.open(signedUrl, "_blank", "noopener,noreferrer");
};

export const getAttachmentUrl = async (attachment: FileAttachment) => {
  if (attachment.url) return attachment.url;
  const { data, error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(attachment.path, 60);
  if (error) throw error;
  return data.signedUrl;
};

export const removeAttachment = async (attachment: FileAttachment) => {
  const { error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .remove([attachment.path]);
  if (error) throw error;
};

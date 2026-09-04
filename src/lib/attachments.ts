import { supabase } from "@/lib/supabase";
import type { FileAttachment } from "@/types";

const ATTACHMENTS_BUCKET = import.meta.env.VITE_ATTACHMENTS_BUCKET || "attachments";
const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;
const VIEW_URL_TTL_SECONDS = 60 * 60;

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/rtf",
  "application/zip",
  "image/avif",
  "image/bmp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/webp",
  "text/csv",
  "text/plain",
]);

/**
 * Browsers and phones report inconsistent MIME types -- an .xlsx often arrives as
 * application/octet-stream, and a photo shared from a phone can arrive with an
 * empty type. Judging by extension as well keeps those files from being rejected,
 * while executables and scripts still have no way in.
 */
const ALLOWED_EXTENSIONS = new Set([
  "avif", "bmp", "csv", "doc", "docx", "gif", "heic", "heif", "jpeg", "jpg",
  "odp", "ods", "odt", "pdf", "png", "ppt", "pptx", "rtf", "tif", "tiff",
  "txt", "webp", "xls", "xlsm", "xlsx", "zip",
]);

const EXTENSION_TYPES: Record<string, string> = {
  avif: "image/avif",
  bmp: "image/bmp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  pdf: "application/pdf",
  png: "image/png",
  tif: "image/tiff",
  tiff: "image/tiff",
  webp: "image/webp",
};

/** Extensions the browser cannot paint in an <img>; they show as a file card. */
const UNRENDERABLE_IMAGE_EXTENSIONS = new Set(["heic", "heif", "tif", "tiff"]);

const extensionOf = (fileName: string) => {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
};

const sanitizeFileName = (fileName: string) =>
  fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);

/** True when the attachment can actually be painted inline by the browser. */
export const isRenderableImage = (attachment: FileAttachment) => {
  const extension = extensionOf(attachment.name);
  if (UNRENDERABLE_IMAGE_EXTENSIONS.has(extension)) return false;
  if (attachment.type?.startsWith("image/")) return true;
  return Boolean(EXTENSION_TYPES[extension]?.startsWith("image/"));
};

export const validateAttachment = (file: File): string | null => {
  if (file.size > MAX_ATTACHMENT_SIZE) {
    const megabytes = (file.size / (1024 * 1024)).toFixed(1);
    return `"${file.name}" pesa ${megabytes} MB y el límite es 25 MB.`;
  }
  const extension = extensionOf(file.name);
  if (ALLOWED_TYPES.has(file.type) || ALLOWED_EXTENSIONS.has(extension)) return null;
  return `"${file.name}" no es un formato permitido. Usa imágenes, PDF, Word, Excel, PowerPoint, CSV, texto o ZIP.`;
};

export const uploadAttachment = async (
  file: File,
  userId: string,
  scope: string,
): Promise<FileAttachment> => {
  const validationError = validateAttachment(file);
  if (validationError) throw new Error(validationError);

  const extension = extensionOf(file.name);
  // A missing or generic type would otherwise be stored as octet-stream, which
  // stops the file from ever previewing or opening in the right app.
  const contentType =
    file.type && file.type !== "application/octet-stream"
      ? file.type
      : (EXTENSION_TYPES[extension] ?? "application/octet-stream");

  const safeName = sanitizeFileName(file.name) || "archivo";
  const path = `${userId}/${scope}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(path, file, { contentType, upsert: false });
  if (error) {
    throw new Error(`No se pudo subir "${file.name}": ${error.message}`);
  }

  return { name: file.name, path, type: contentType, size: file.size };
};

export const getAttachmentUrl = async (attachment: FileAttachment) => {
  if (attachment.url) return attachment.url;
  const { data, error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(attachment.path, VIEW_URL_TTL_SECONDS);
  if (error) throw new Error(`No se pudo abrir "${attachment.name}": ${error.message}`);
  return data.signedUrl;
};

export const openAttachment = async (attachment: FileAttachment) => {
  if (attachment.url) {
    window.open(attachment.url, "_blank", "noopener,noreferrer");
    return;
  }
  const signedUrl = await getAttachmentUrl(attachment);
  window.open(signedUrl, "_blank", "noopener,noreferrer");
};

export const removeAttachment = async (attachment: FileAttachment) => {
  const { error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .remove([attachment.path]);
  if (error) throw error;
};

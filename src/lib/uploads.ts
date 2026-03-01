import * as fs from "node:fs";
import * as path from "node:path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function validateUpload(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Invalid file type. Please upload a JPEG, PNG, or WebP image.";
  }
  if (file.size > MAX_SIZE) {
    return "File too large. Maximum size is 2MB.";
  }
  return null;
}

export async function saveUpload(
  file: File,
  prefix: string
): Promise<string> {
  const ext = EXTENSIONS[file.type] || "jpg";
  const filename = `${prefix}-${Date.now()}.${ext}`;

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);

  return filename;
}

export function deleteUpload(filename: string): void {
  const filepath = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
}

export function getUploadPath(filename: string): string {
  return path.join(UPLOAD_DIR, filename);
}

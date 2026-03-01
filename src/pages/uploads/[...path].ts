import type { APIRoute } from "astro";
import { getUploadPath } from "../../lib/uploads";
import * as fs from "node:fs";

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export const GET: APIRoute = async ({ params }) => {
  const filePath = params.path;
  if (!filePath) {
    return new Response("Not found", { status: 404 });
  }

  // Prevent path traversal
  if (filePath.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  const fullPath = getUploadPath(filePath);
  if (!fs.existsSync(fullPath)) {
    return new Response("Not found", { status: 404 });
  }

  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  const buffer = fs.readFileSync(fullPath);
  return new Response(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};

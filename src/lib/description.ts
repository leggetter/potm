import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "b",
  "i",
  "s",
  "ul",
  "ol",
  "li",
  "a",
  "h2",
  "h3",
  "code",
  "pre",
];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Renders fixture description to safe HTML.
 * Uses WhatsApp-style: *bold*, _italic_, ~strikethrough~. Renders newlines ourselves so double newlines are preserved.
 */
export function renderDescription(markdown: string | null | undefined): string {
  if (!markdown || !markdown.trim()) return "";
  const trimmed = markdown.trim();

  // Escape HTML first so we can safely add tags
  let out = escapeHtml(trimmed);

  // Links: [text](url) -> <a href="url">text</a> (before other replacements so brackets are still there)
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>');

  // WhatsApp formatting: *bold*, _italic_, ~strikethrough~ (non-greedy, so *a* and *b* work)
  out = out.replace(/\*([^*]+)\*/g, "<strong>$1</strong>");
  out = out.replace(/_([^_]+)_/g, "<em>$1</em>");
  out = out.replace(/~([^~]+)~/g, "<s>$1</s>");

  // Newlines: double (or more) first -> <br><br>, then single -> <br> (order matters)
  out = out.replace(/\n\n+/g, "<br><br>");
  out = out.replace(/\n/g, "<br>");

  return sanitizeHtml(out, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ["href"] },
    allowedSchemes: ["http", "https", "mailto"],
  });
}

/**
 * Returns the description as plain text in WhatsApp format (no conversion).
 * Use for copying to clipboard to paste into WhatsApp.
 */
export function descriptionForWhatsApp(description: string | null | undefined): string {
  return description?.trim() ?? "";
}

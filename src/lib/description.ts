import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "b",
  "i",
  "ul",
  "ol",
  "li",
  "a",
  "h2",
  "h3",
];

/**
 * Renders fixture description (markdown) to safe HTML.
 */
export function renderDescription(markdown: string | null | undefined): string {
  if (!markdown || !markdown.trim()) return "";
  const raw = marked.parse(markdown.trim(), {
    async: false,
    gfm: true,
    breaks: true,
  }) as string;
  return sanitizeHtml(raw, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ["href"] },
    allowedSchemes: ["http", "https", "mailto"],
  });
}

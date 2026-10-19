import DOMPurify from "dompurify";

// Helpers for the HTML produced by <RichTextEditor />. Older records were saved
// from plain <textarea>s, so every reader must accept both plain text and HTML.

const HTML_TAG_RE = /<\/?[a-z][a-z0-9]*\b[^>]*>/i;

export const looksLikeHtml = (value?: string | null): boolean => !!value && HTML_TAG_RE.test(value);

export const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const plainTextToHtml = (text: string): string => escapeHtml(text).replace(/\r?\n/g, "<br>");

let hooksInstalled = false;
const installHooks = () => {
  if (hooksInstalled) return;
  hooksInstalled = true;
  // Links opened in a new tab must not get a handle on the CRM window.
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
};

const BASE_CONFIG = {
  ADD_ATTR: ["target"],
  FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "form", "input", "button", "textarea", "select", "meta", "link"],
  FORBID_ATTR: ["id"],
};

/** Strips scripts/handlers from user HTML while keeping formatting (styles, tables, data-* checklist state, data: images). */
export const sanitizeRichHtml = (html: string, { forPaste = false }: { forPaste?: boolean } = {}): string => {
  installHooks();
  return DOMPurify.sanitize(html, {
    ...BASE_CONFIG,
    FORBID_ATTR: forPaste ? [...BASE_CONFIG.FORBID_ATTR, "class"] : BASE_CONFIG.FORBID_ATTR,
  }) as string;
};

/** Value from the API (plain text or HTML) -> safe HTML for display/editing. */
export const toRichHtml = (value?: string | null): string => {
  if (!value) return "";
  return looksLikeHtml(value) ? sanitizeRichHtml(value) : plainTextToHtml(value);
};

const BLOCK_SELECTOR = "p,div,li,h1,h2,h3,h4,h5,h6,blockquote,pre,tr,table,ul,ol,hr";

/** Value (plain text or HTML) -> readable plain text, for table cells, exports, PDFs and previews. */
export const htmlToPlainText = (value?: string | null): string => {
  if (!value) return "";
  if (!looksLikeHtml(value)) return value;
  if (typeof DOMParser === "undefined") return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  const doc = new DOMParser().parseFromString(sanitizeRichHtml(value), "text/html");
  doc.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  doc.querySelectorAll('ul[data-type="checklist"] > li').forEach((li) => {
    li.prepend(li.getAttribute("data-checked") === "true" ? "[x] " : "[ ] ");
  });
  doc.querySelectorAll("ul:not([data-type]) > li").forEach((li) => li.prepend("• "));
  doc.querySelectorAll("ol").forEach((ol) => {
    Array.from(ol.children).forEach((li, i) => li.prepend(`${i + 1}. `));
  });
  doc.querySelectorAll("td,th").forEach((cell) => cell.append("\t"));
  doc.querySelectorAll(BLOCK_SELECTOR).forEach((el) => el.append("\n"));

  return (doc.body.textContent || "")
    .replace(/ /g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

/** True when the value has no visible content (empty editor output like "<div><br></div>"). */
export const isRichTextEmpty = (value?: string | null): boolean => {
  if (!value) return true;
  if (/<(img|table|hr)\b/i.test(value)) return false;
  return htmlToPlainText(value).replace(/​/g, "").trim() === "";
};

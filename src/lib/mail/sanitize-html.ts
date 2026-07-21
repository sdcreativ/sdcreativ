import DOMPurify from "isomorphic-dompurify";

const MAIL_ALLOWED_TAGS = [
  "a",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "br",
  "p",
  "div",
  "span",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "img",
  "hr",
  "center",
  "font",
];

const MAIL_ALLOWED_ATTR = [
  "href",
  "target",
  "rel",
  "src",
  "alt",
  "title",
  "width",
  "height",
  "style",
  "class",
  "align",
  "valign",
  "bgcolor",
  "color",
  "border",
  "cellpadding",
  "cellspacing",
  "colspan",
  "rowspan",
  "role",
];

let hooksRegistered = false;

function ensureMailSanitizeHooks() {
  if (hooksRegistered) return;
  hooksRegistered = true;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (!("tagName" in node) || typeof node.getAttribute !== "function") return;
    const el = node as Element;
    if (el.tagName === "A") {
      const href = el.getAttribute("href")?.trim() ?? "";
      if (href && !/^(https?:|mailto:)/i.test(href)) {
        el.removeAttribute("href");
      } else if (href) {
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      }
    }
    if (el.tagName === "IMG") {
      const src = el.getAttribute("src")?.trim() ?? "";
      if (src && !/^(https?:|data:image\/)/i.test(src)) {
        el.removeAttribute("src");
      }
    }
  });
}

/**
 * HTML email entrant → HTML sûr pour affichage CRM (liens / boutons CTA conservés).
 */
export function sanitizeMailHtml(html: string): string {
  ensureMailSanitizeHooks();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: MAIL_ALLOWED_TAGS,
    ALLOWED_ATTR: MAIL_ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "button"],
    FORBID_ATTR: ["onerror", "onclick", "onload", "onmouseover"],
    ADD_ATTR: ["target", "rel"],
  });
}

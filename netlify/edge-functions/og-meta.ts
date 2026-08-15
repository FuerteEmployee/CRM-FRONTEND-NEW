// Rewrites og:title/og:description/og:image (and their twitter: equivalents)
// in the served HTML — but ONLY for known social-media crawlers.
//
// Why this exists: Facebook/Slack/WhatsApp/Twitter/etc. fetch the raw HTML of
// a shared link and never execute JavaScript, so SettingsContext.tsx's live
// DOM update (which correctly reflects Setup > Settings' OG Image for real
// browser visitors) is invisible to them — they only ever see index.html's
// static fallback tag. This edge function is the only way to make the actual
// shared-link preview reflect what an admin uploaded.
//
// Scoped to bots only (not every request) to avoid adding a backend round
// trip to every real page load — everyday visitors are passed straight
// through untouched.
const BOT_UA_PATTERN = /facebookexternalhit|Facebot|Twitterbot|Slackbot|WhatsApp|LinkedInBot|TelegramBot|Discordbot|Googlebot|bingbot|Pinterest|redditbot|Skype|vkShare/i;

const BACKEND_ORIGIN = (Deno.env.get("VITE_API_URL") || "https://crm-backend.beontimeofficial.com/api").replace(/\/api\/?$/, "");

// Mirrors Frontend/src/lib/resolveImageUrl.ts's rules, but always returns an
// ABSOLUTE url (siteOrigin-qualified) since og:image/twitter:image tags are
// only valid as fully-qualified URLs, unlike a plain <img src>.
// Returns null when no image is set — callers should omit the tag entirely
// rather than falling back to logo-icon.png (mislabeled Trinetra asset).
function resolveOgImageUrl(val, siteOrigin) {
  const trimmed = (val || "").trim();
  if (!trimmed) return null;
  if (/^(data:|https?:|blob:)/.test(trimmed)) return trimmed;
  if (/^\/(trinetra-|favicon\.ico|icons\/)/.test(trimmed)) return `${siteOrigin}${trimmed}`;

  const parts = trimmed.split(/[/\\]/);
  const uploadsIndex = parts.findIndex((p) => p.toLowerCase() === "uploads");
  if (uploadsIndex !== -1) return `${BACKEND_ORIGIN}/${parts.slice(uploadsIndex).join("/")}`;
  if (trimmed.startsWith("/")) return `${BACKEND_ORIGIN}${trimmed}`;
  return `${BACKEND_ORIGIN}/uploads/logos/${trimmed}`;
}

function escapeHtmlAttr(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function replaceMetaContent(html, matchAttr, matchValue, newContent) {
  const pattern = new RegExp(`(<meta ${matchAttr}="${matchValue}" content=")[^"]*("\\s*/?>)`, "i");
  const safe = escapeHtmlAttr(newContent);
  return pattern.test(html) ? html.replace(pattern, `$1${safe}$2`) : html;
}

export default async (request, context) => {
  const userAgent = request.headers.get("user-agent") || "";
  if (!BOT_UA_PATTERN.test(userAgent)) {
    return; // not a bot — serve the normal SPA untouched
  }

  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  let html = await response.text();
  const siteOrigin = new URL(request.url).origin;

  try {
    const settingsRes = await fetch(`${BACKEND_ORIGIN}/api/settings`);
    if (settingsRes.ok) {
      const list = await settingsRes.json();
      const byName: Record<string, any> = {};
      for (const s of Array.isArray(list) ? list : []) byName[s.name] = s.value;

      // Falls back to the company logo when no dedicated OG image was set.
      // If nothing is set at all, ogImageUrl will be null and we skip the
      // image tags entirely — better than emitting the mislabeled logo-icon.png.
      const ogImageSource = byName.ogImage || byName.compLogoDark || byName.compLogoLight;
      const ogImageUrl = resolveOgImageUrl(ogImageSource, siteOrigin);
      const title = byName.companyName ? `${byName.companyName} — CRM Dashboard` : undefined;
      const description = byName.companyName
        ? `${byName.companyName}'s CRM — manage leads, customers, and your team in one place.`
        : undefined;

      if (ogImageUrl) {
        html = replaceMetaContent(html, "property", "og:image", ogImageUrl);
        html = replaceMetaContent(html, "name", "twitter:image", ogImageUrl);
      }
      if (title) {
        html = replaceMetaContent(html, "property", "og:title", title);
        html = replaceMetaContent(html, "name", "twitter:title", title);
      }
      if (description) {
        html = replaceMetaContent(html, "property", "og:description", description);
        html = replaceMetaContent(html, "name", "twitter:description", description);
      }
    }
  } catch (_err) {
    // Backend unreachable — fall through and serve index.html's static
    // defaults rather than failing the request for a crawler.
  }

  return new Response(html, { status: response.status, headers: response.headers });
};

/** Unicode words stay readable; invisible separators and punctuation become hyphens. */
export function normalizeTrackSlug(value: string) {
  return value.normalize("NFKC").toLowerCase()
    .replace(/[يى]/g, "ی").replace(/ك/g, "ک")
    .replace(/[\u064b-\u0652\u0670]/g, "")
    .replace(/[۰-۹٠-٩]/g, digit => String(digit.charCodeAt(0) & 15))
    .replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
}

export function trackSlugBase(title: string) {
  let base = normalizeTrackSlug(title).slice(0, 150).replace(/[\uD800-\uDBFF]$/, "").replace(/-+$/, "") || "beat";
  // Reserve bare ObjectIds for old links, including titles that happen to look like one.
  if (/^[a-f\d]{24}$/i.test(base)) base += "-beat";
  return base;
}

export function trackHref(track: { id: string; slug?: string | null }) {
  return `/tracks/${encodeURIComponent(track.slug || track.id)}`;
}

/** This Next version can supply an encoded route segment; decode once at the boundary. */
export function parseTrackReference(value: string) {
  if (!value || value.length > 1800) return null;
  let decoded = value;
  try { if (value.includes("%")) decoded = decodeURIComponent(value); } catch { return null; }
  if (decoded.length > 200 || !/^[\p{L}\p{M}\p{N}\u200c\u200d-]+$/u.test(decoded)) return null;
  return decoded;
}

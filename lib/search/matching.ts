export function normalizeSearch(value: string) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/[۰-۹٠-٩]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".includes(digit) ? "۰۱۲۳۴۵۶۷۸۹".indexOf(digit) : "٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ").slice(0, 100);
}
const aliases: Record<string, string> = { "ترپ": "trap", "دریل": "drill", "هیپ هاپ": "hip hop", "هیپهاپ": "hip hop", "پیانو": "piano", "گیتار": "guitar", "آرام": "chill", "ارام": "chill", "تاریک": "dark", "پاپ": "pop", "لوفای": "lo fi", "لو فای": "lo fi", "افرو": "afro", "hiphop": "hip hop", "rnb": "r b" };
export function searchTerms(value: string) {
  const normalized = normalizeSearch(value), words = (aliases[normalized] || normalized).split(" ").filter(Boolean).slice(0, 8);
  const meaningful = words.filter(word => !["a", "an", "the", "of", "for", "with", "type", "beat", "beats", "music", "instrumental"].includes(word));
  return meaningful.length ? meaningful : words;
}
export function searchGrams(value: string) {
  const groups = normalizeSearch(value).split(" ").slice(0, 32).map(word => {
    const grams: string[] = [];
    for (const size of [2, 3]) for (let index = 0; index <= word.length - size; index++) grams.push(word.slice(index, index + size));
    return grams;
  });
  const result = new Set<string>();
  for (let offset = 0; offset < 100 && result.size < 64; offset++) for (const grams of groups) { if (grams[offset]) result.add(grams[offset]); if (result.size >= 64) break; }
  return [...result];
}
export type SearchIndex = { tokens: string[]; grams: string[] };
export function buildSearchIndex(values: string[]): SearchIndex {
  const tokens = [...new Set(values.flatMap(value => normalizeSearch(value).split(" ")))].filter(Boolean).map(word => word.slice(0, 32)).slice(0, 40);
  return { tokens, grams: searchGrams(tokens.slice(0, 18).join(" ")) };
}
/** Bounded Damerau-Levenshtein distance also recognizes adjacent swapped letters. */
function distance(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const matrix = Array.from({ length: a.length + 1 }, (_, index) => [index, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
  }
  return matrix[a.length][b.length];
}
export function relevance(query: string, label: string, extras: string[] = []) {
  const needle = searchTerms(query), words = buildSearchIndex([label, ...extras]).tokens;
  if (!needle.length) return 0;
  const scores = needle.map(term => Math.max(0, ...words.map(word => {
    if (term === word) return 1;
    if (word.startsWith(term)) return .94;
    if (Math.max(term.length, word.length) > 40 || Math.min(term.length, word.length) < 3) return 0;
    const delta = distance(term, word), allowed = Math.max(term.length, word.length) >= 6 ? 2 : 1;
    return delta <= allowed ? 1 - delta / Math.max(term.length, word.length) : 0;
  })));
  if (scores.some(score => score < .6)) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length + (normalizeSearch(label) === needle.join(" ") ? .2 : 0);
}

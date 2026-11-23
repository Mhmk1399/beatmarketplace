import { conditionRows } from "./conditions";
import type { licenseSnapshot } from "./server";
export type AgreementSnapshot = {
  schemaVersion: 1; buyer: { id: string; name: string; email: string };
  seller: { id: string; name: string }; licenseId: string; trackId: string; trackTitle: string;
  price: number; currency: "IRT"; acceptedAt: string;
  license: ReturnType<typeof licenseSnapshot>;
};
const escape = (value: unknown) => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function licenseExpiry(start: Date, months: number) {
  const result = new Date(start), day = result.getUTCDate();
  result.setUTCDate(1); result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay)); return result;
}

export function agreementHtml(snapshot: AgreementSnapshot, orderId: string, index: number, paidAt: Date) {
  const license = snapshot.license;
  const rows = [
    ["Agreement ID", `${orderId}-${index + 1}`], ["Order", orderId],
    ["Buyer", `${snapshot.buyer.name} (${snapshot.buyer.email})`], ["Buyer account", snapshot.buyer.id],
    ["Producer", snapshot.seller.name], ["Producer account", snapshot.seller.id],
    ["Beat", snapshot.trackTitle], ["Beat ID", snapshot.trackId],
    ["License template ID", snapshot.licenseId], ["License", `${license.title} — version ${license.version}`], ["License type", license.licenseType],
    ["Paid amount", `${snapshot.price.toLocaleString("en-US")} toman (IRT)`],
    ["Terms accepted", snapshot.acceptedAt], ["Payment verified / license begins", paidAt.toISOString()],
    ...(license.conditions.termMonths === null ? [] : [["License ends", licenseExpiry(paidAt, license.conditions.termMonths).toISOString()]]),
    ...conditionRows(license.conditions), ["Files included", license.files.map(file=>`${file.format}: ${file.label}`).join("; ")],
  ];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Music license ${escape(orderId)}-${index + 1}</title><style>body{font:16px/1.6 system-ui,sans-serif;max-width:850px;margin:40px auto;padding:0 24px;color:#17202a}h1{font-size:28px}dt{font-weight:650}dd{margin:0 0 14px;white-space:pre-wrap;overflow-wrap:anywhere}p{white-space:pre-wrap;overflow-wrap:anywhere}footer{margin-top:40px;font-size:12px}@media print{body{margin:0;max-width:none}dt{break-after:avoid}dd,p{orphans:3;widows:3}}</style></head><body><h1>Purchased music license agreement</h1><p>This agreement records the producer's conditions accepted for this purchase. The grant becomes effective after verified payment. A non-exclusive license permits use within the conditions below; it does not transfer ownership of the underlying beat, and the producer may license it to other buyers.</p><dl>${rows.map(([key,value])=>`<dt>${escape(key)}</dt><dd>${escape(value)}</dd>`).join("")}</dl><h2>License description</h2><p>${escape(license.description || "None.")}</p><h2>Additional producer terms</h2><p>${escape(license.customTerms || "None.")}</p><footer>Recorded by BeatMarketplace from the terms accepted for this order. Later catalog or account edits do not update this saved agreement. Account details identify the parties recorded at checkout; no handwritten or digital signature is represented. You can print this document or save it as PDF using your browser.</footer></body></html>`;
}

import type { MarketplaceLicense } from "@/lib/marketplace/types";
import { conditionRows, licenseConditions } from "@/lib/licensing/conditions";

export function LicenseConditions({ license }: { license: MarketplaceLicense }) {
  const conditions = license.conditions ?? licenseConditions(license);
  return <div className="space-y-4 text-sm">
    {license.description && <p className="whitespace-pre-wrap leading-6 text-muted">{license.description}</p>}
    <p className="font-semibold">{license.licenseType === "NON_EXCLUSIVE" ? "Non-exclusive license — the producer can license this beat to other buyers." : "Exclusive/custom terms — online purchase is unavailable."}</p>
    <dl className="space-y-3">{conditionRows(conditions).map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-x-5 gap-y-1 border-b border-divider pb-2"><dt className="text-muted">{label}</dt><dd className="max-w-full whitespace-pre-wrap break-words font-medium">{value}</dd></div>)}</dl>
    <p><strong>Files included:</strong> {license.formats.join(" + ")}</p>
    <div><h4 className="font-semibold">Additional producer terms</h4><p className="mt-2 whitespace-pre-wrap break-words leading-6 text-muted">{license.customTerms || "None."}</p></div>
  </div>;
}

import { DashboardPageIntro } from "@/components/dashboard/DashboardPageIntro";
import type { NavigationItem } from "@/lib/dashboard/navigation";

const details: Record<string, { purpose: string; prerequisites: string[] }> = {
  tracklists: { purpose: "Sequence beats into shareable listening flows without changing ownership or license terms.", prerequisites: ["Saved ordering and track availability rules", "Private/public sharing controls", "Preview-only playback enforcement"] },
  "sound-kits": { purpose: "Package producer-created sound libraries as a separate product type.", prerequisites: ["A dedicated product and entitlement model", "Secure archive delivery", "Sound-kit licensing and checkout support"] },
  services: { purpose: "Offer clearly scoped producer services beyond beat licensing.", prerequisites: ["Service fulfillment and revision tracking", "Buyer-producer messaging", "Service-specific payment and dispute rules"] },
  videos: { purpose: "Manage videos connected to your public producer presence.", prerequisites: ["Video storage and streaming delivery", "Moderation and publishing controls", "Video-specific upload limits"] },
  publishing: { purpose: "Track publishing rights and composition information for released work.", prerequisites: ["Verified songwriter and composition records", "Rights-split acceptance", "Territory and society integrations"] },
  "beat-id": { purpose: "Help identify uses of your beats across supported media services.", prerequisites: ["Audio fingerprint provider integration", "Match review and dispute workflows", "Verified ownership records"] },
  cra: { purpose: "Prepare rights administration records for eligible catalog works.", prerequisites: ["Verified legal identities", "Composition ownership records", "Rights-administration partner integration"] },
  integrations: { purpose: "Connect approved external services to your producer workspace.", prerequisites: ["Provider-specific OAuth connections", "Revocable access scopes", "Connection health and audit history"] },
  "promote-credits": { purpose: "Manage promotion credit grants and usage once campaign purchasing exists.", prerequisites: ["Campaign checkout", "A credit ledger with immutable transactions", "Refund and expiration rules"] },
};

export function StudioComingSoon({ slug, item }: { slug: string; item: NavigationItem }) {
  const content = details[slug];
  if (!content) return null;
  return <div className="space-y-6"><DashboardPageIntro eyebrow="Producer roadmap" title={`${item.label} is coming soon.`} description={content.purpose} /><section className="workspace-coming-soon"><span className="workspace-status">PLANNED</span><h2>What must be ready first</h2><ul>{content.prerequisites.map(value => <li key={value}>{value}</li>)}</ul><p className="mt-5 text-sm leading-7 text-muted">This page is intentionally read-only. There are no placeholder purchases, credits, or settings until the supporting workflows are implemented securely.</p></section></div>;
}

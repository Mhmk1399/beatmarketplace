import type { Metadata } from "next";
import { PublicShell } from "@/components/public/PublicShell";
import { ContactHero } from "@/components/contact/ContactHero";
import { ContactSocials } from "@/components/contact/ContactSocials";
import { ContactMessageSection } from "@/components/contact/ContactMessageSection";
import "@/components/contact/contact.css";
import { publicContactSettings } from "@/lib/contact/public-settings";
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Contact us", description: "Get in touch with BeatMarketplace for questions, support, licensing, or collaboration." };
export default async function ContactPage({ searchParams }: { searchParams: Promise<{ subject?: string; message?: string }> }) {
  const settings = await publicContactSettings();
  const query = await searchParams; const subject = ["general","licensing","payments","technical","collaboration"].includes(query.subject ?? "") ? query.subject : ""; const message = (query.message ?? "").slice(0, 5000);
  return <PublicShell><div className="contact-page"><ContactHero settings={settings} /><ContactSocials settings={settings} /><ContactMessageSection initialSubject={subject} initialMessage={message} /></div></PublicShell>;
}

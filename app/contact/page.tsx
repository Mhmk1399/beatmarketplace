import type { Metadata } from "next";
import { PublicShell } from "@/components/public/PublicShell";
import { ContactHero } from "@/components/contact/ContactHero";
import { ContactSocials } from "@/components/contact/ContactSocials";
import { ContactMessageSection } from "@/components/contact/ContactMessageSection";
import "@/components/contact/contact.css";
import { publicContactSettings } from "@/lib/contact/public-settings";
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Contact us", description: "Get in touch with BeatMarketplace for questions, support, licensing, or collaboration." };
export default async function ContactPage() {
  const settings = await publicContactSettings();
  return <PublicShell><div className="contact-page"><ContactHero settings={settings} /><ContactSocials settings={settings} /><ContactMessageSection /></div></PublicShell>;
}

import { contactSettings, socialHref } from "@/lib/contact/settings";
import { ContactArrowIcon, ContactSocialIcon } from "./ContactIcons";

const socials = [
  { key: "instagram", name: "Instagram" }, { key: "youtube", name: "YouTube" },
  { key: "tiktok", name: "TikTok" }, { key: "x", name: "X (Twitter)" }, { key: "soundcloud", name: "SoundCloud" },
] as const;
export function ContactSocials({ settings = contactSettings }: { settings?: typeof contactSettings }) {
  return <section className="contact-container contact-socials" aria-labelledby="contact-social-title">
    <div className="contact-social-intro">
      <p className="contact-eyebrow"><span aria-hidden="true" />Follow us</p>
      <h2 id="contact-social-title"><span className="contact-desktop-only">Stay <em>Connected.</em></span><span className="contact-mobile-only">Connect on <em>social media.</em></span></h2>
      <p>Follow us for new beats, artist drops, updates, and behind-the-scenes content.</p>
    </div>
    <div className="contact-social-grid">{socials.map(({ key, name }) => {
      const href = socialHref(settings.socials[key]);
      const content = <><span className="contact-social-icon"><ContactSocialIcon kind={key} /></span><strong>{key === "x" ? <><span className="contact-desktop-only">{name}</span><span className="contact-mobile-only">X</span></> : name}</strong><ContactArrowIcon /></>;
      return href ? <a href={href} key={key} className="contact-social-card" target="_blank" rel="noopener noreferrer">{content}</a> : <button key={key} type="button" className="contact-social-card" disabled aria-label={`${name} — link not available yet`}>{content}</button>;
    })}</div>
  </section>;
}

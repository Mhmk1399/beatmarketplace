import Image from "next/image";
import { contactSettings } from "@/lib/contact/settings";
import { ContactArrowIcon, ContactMailIcon, ContactPhoneIcon, ContactSupportIcon } from "./ContactIcons";
import { ContactRibbon } from "./ContactRibbon";

export function ContactHero({ settings = contactSettings }: { settings?: typeof contactSettings }) {
  const channels = [
    { title: "Email Us", text: settings.email, href: settings.email ? `mailto:${settings.email}` : null, Icon: ContactMailIcon },
    { title: "Call Us", text: settings.phone, href: settings.phone ? `tel:${settings.phone.replace(/[^+\d]/g, "")}` : null, Icon: ContactPhoneIcon },
    { title: "Support Center", text: "Get help & find answers", href: "#contact-form", Icon: ContactSupportIcon },
  ];
  return <section className="contact-hero" aria-labelledby="contact-hero-title">
    <div className="contact-container">
      <div className="contact-hero-grid">
        <div className="contact-hero-copy">
          <p className="contact-eyebrow"><span aria-hidden="true" />Contact us</p>
          <h1 id="contact-hero-title">Get in Touch<br /><span>with Us.</span></h1>
          <p>Questions, support, or collaboration? We&apos;re here to help. Reach out anytime — our team will get back to you soon.</p>
        </div>
        <div className="contact-hero-art" aria-hidden="true">
          <svg className="contact-art-orbit" viewBox="0 0 600 400" fill="none"><path d="M124 316Q88 350 149 352L512 350Q550 349 527 305L366 31Q341-12 317 26Z" /></svg>
          <svg className="contact-frequency" viewBox="0 0 600 180" fill="none">{Array.from({ length: 64 }, (_, i) => { const x = i * 9.2 + 10, height = 7 + Math.pow(Math.sin(i * .23), 6) * 78 + Math.abs(Math.sin(i * 1.91)) * 27; return <path key={i} d={`M${x} ${90 - height / 2}v${height}`} />; })}</svg>
          <Image src="/assets/about/headphones.webp" alt="" fill sizes="(max-width:699px) 58vw, (max-width:1099px) 45vw, 560px" preload className="contact-headphones" />
        </div>
      </div>
      <div className="contact-channels">{channels.map(({ title, text, href, Icon }, index) => {
        const content = <><span className="contact-channel-icon"><Icon /></span><span className="contact-channel-copy"><strong>{title}</strong><span>{text || "\u00a0"}</span></span><ContactArrowIcon /></>;
        const className = `contact-channel ${index === 2 ? "contact-support-channel" : ""}`;
        return href ? <a key={title} href={href} className={className}>{content}</a> : <button key={title} type="button" className={className} disabled aria-label={`${title} — contact details not available yet`}>{content}</button>;
      })}</div>
    </div>
    <ContactRibbon className="contact-hero-ribbon" />
  </section>;
}

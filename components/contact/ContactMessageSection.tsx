import Image from "next/image";
import { AboutWaveIcon } from "@/components/about/AboutIcons";
import { ContactSendIcon } from "./ContactIcons";
import { ContactRibbon } from "./ContactRibbon";
import { ContactForm } from "./ContactForm";

export function ContactMessageSection() {
  return <section id="contact-form" className="contact-container contact-message-section" aria-labelledby="contact-form-title">
    <div className="contact-message-panel">
      <div className="contact-message-art">
        <Image src="/assets/contact/studio.webp" alt="" fill sizes="(max-width:699px) 1px, (max-width:1099px) 38vw, 520px" />
        <div className="contact-message-copy">
          <AboutWaveIcon className="contact-desktop-only" />
          <p className="contact-eyebrow contact-mobile-only"><ContactSendIcon />Send us a message</p>
          <h2 id="contact-form-title"><span className="contact-desktop-only">Send Us<br /><em>a Message.</em></span><span className="contact-mobile-only">Contact form.</span></h2>
          <p><span className="contact-desktop-only">Have a question, feedback, or a business inquiry? Fill out the form and we&apos;ll get back to you as soon as possible.</span><span className="contact-mobile-only">Fill out the form and we&apos;ll get back to you soon.</span></p>
        </div>
        <ContactRibbon className="contact-form-ribbon" />
      </div>
      <ContactForm />
    </div>
  </section>;
}

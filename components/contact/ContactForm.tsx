"use client";

import { DynamicSelect } from "@/components/ui/dynamic/DynamicSelect";
import { notifyTableMutation } from "@/lib/workspace/table-cache";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CONTACT_SUBJECTS } from "@/lib/contact/types";
import { contactSchema } from "@/lib/contact/validation";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { CheckIcon, ChevronDownIcon, TagIcon, UserIcon } from "@/components/ui/icons";
import { ContactMailIcon, ContactMessageIcon, ContactSendIcon } from "./ContactIcons";

function submissionId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // getRandomValues also works for a phone opening the local dev server over HTTP.
  const bytes = crypto.getRandomValues(new Uint8Array(16)); bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function ContactForm() {
  const [saving, setSaving] = useState(false), [error, setError] = useState("");
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [receipt, setReceipt] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null), successRef = useRef<HTMLDivElement>(null);
  const requestId = useRef<string | null>(null), pending = useRef(false), controller = useRef<AbortController | null>(null);
  useEffect(() => () => { controller.current?.abort(); }, []);
  useEffect(() => { if (receipt) successRef.current?.focus(); }, [receipt]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending.current) return;
    const form = event.currentTarget;
    requestId.current ??= submissionId();
    const parsed = contactSchema.safeParse({ ...Object.fromEntries(new FormData(form)), requestId: requestId.current });
    setError(""); setIssues({});
    if (!parsed.success) {
      const fields = Object.fromEntries(parsed.error.issues.map(issue => [String(issue.path[0]), issue.message]));
      setIssues(fields); (form.elements.namedItem(Object.keys(fields)[0]) as HTMLElement | null)?.focus(); return;
    }
    pending.current = true; setSaving(true); controller.current = new AbortController();
    const timeout = setTimeout(() => controller.current?.abort(), 20_000);
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data), signal: controller.current.signal });
      const data = await response.json();
      if (!response.ok) {
        const fields = Object.fromEntries((data.issues ?? []).map((issue: { field: string; message: string }) => [issue.field, issue.message]));
        setIssues(fields); setError(data.error || "We couldn't save your message. Please try again.");
        if (response.status === 409) requestId.current = null;
        (form.elements.namedItem(Object.keys(fields)[0]) as HTMLElement | null)?.focus(); return;
      }
      if (typeof data.receipt !== "string" || !data.receivedAt) throw new Error("Invalid receipt");
      setReceipt(data.receipt);
      void notifyTableMutation("/api/contact");
    } catch { if (form.isConnected) setError("Connection lost. Please try again. Your message is still here."); }
    finally { clearTimeout(timeout); pending.current = false; if (form.isConnected) setSaving(false); }
  }

  if (receipt) return <div ref={successRef} className="contact-success" role="status" tabIndex={-1}>
    <span className="contact-success-icon"><CheckIcon /></span><h3>Message received.</h3>
    <p>Thanks for reaching out. Your message has been saved for our team.</p>
    <p className="contact-receipt">Reference <strong>BM-{receipt.slice(0, 8).toUpperCase()}</strong></p>
    <NeumorphicButton variant="accent" onClick={() => { requestId.current = null; setReceipt(null); setSaving(false); setError(""); setIssues({}); requestAnimationFrame(() => formRef.current?.querySelector("input")?.focus()); }}>Send another message</NeumorphicButton>
  </div>;

  return <form ref={formRef} className="contact-form" onSubmit={submit} noValidate aria-label="Send us a message" aria-busy={saving} onChange={() => { if (!pending.current) requestId.current = null; }}>
    <fieldset disabled={saving}><legend className="sr-only">Your contact information and message</legend>
      <div className="contact-form-row">
        <div className="contact-field"><label htmlFor="contact-name">Your Name <span aria-hidden="true">*</span></label><div className={`neo-input-wrap contact-input ${issues.name ? "neo-input-error" : ""}`}><UserIcon /><input id="contact-name" name="name" required minLength={2} maxLength={100} autoComplete="name" placeholder="Enter your name" aria-invalid={Boolean(issues.name)} aria-describedby={issues.name ? "contact-name-error" : undefined} /></div>{issues.name && <p id="contact-name-error" className="contact-field-error" role="alert">{issues.name}</p>}</div>
        <div className="contact-field"><label htmlFor="contact-email">Your Email <span aria-hidden="true">*</span></label><div className={`neo-input-wrap contact-input ${issues.email ? "neo-input-error" : ""}`}><ContactMailIcon /><input id="contact-email" name="email" type="email" required maxLength={254} autoComplete="email" placeholder="Enter your email" aria-invalid={Boolean(issues.email)} aria-describedby={issues.email ? "contact-email-error" : undefined} /></div>{issues.email && <p id="contact-email-error" className="contact-field-error" role="alert">{issues.email}</p>}</div>
      </div>
      <div className="contact-field"><label htmlFor="contact-subject">Subject <span aria-hidden="true">*</span></label><div className={`neo-input-wrap contact-input ${issues.subject ? "neo-input-error" : ""}`}><TagIcon /><DynamicSelect id="contact-subject" name="subject" required defaultValue="" aria-invalid={Boolean(issues.subject)} aria-describedby={issues.subject ? "contact-subject-error" : undefined}><option value="" disabled>Select a subject</option>{CONTACT_SUBJECTS.map(subject => <option key={subject.value} value={subject.value}>{subject.label}</option>)}</DynamicSelect><ChevronDownIcon className="contact-select-arrow" /></div>{issues.subject && <p id="contact-subject-error" className="contact-field-error" role="alert">{issues.subject}</p>}</div>
      <div className="contact-field"><label htmlFor="contact-message">Message <span aria-hidden="true">*</span></label><div className={`neo-input-wrap contact-input contact-textarea ${issues.message ? "neo-input-error" : ""}`}><ContactMessageIcon /><textarea id="contact-message" name="message" required minLength={10} maxLength={5000} rows={4} placeholder="Write your message here…" aria-invalid={Boolean(issues.message)} aria-describedby={issues.message ? "contact-message-error" : undefined} /></div>{issues.message && <p id="contact-message-error" className="contact-field-error" role="alert">{issues.message}</p>}</div>
      <div className="contact-website" aria-hidden="true"><label htmlFor="contact-website">Website</label><input id="contact-website" name="website" tabIndex={-1} autoComplete="off" /></div>
      {error && <p className="contact-submit-error" role="alert">{error}</p>}
      <NeumorphicButton type="submit" variant="accent" className="contact-submit" disabled={saving}><ContactSendIcon />{saving ? "Sending…" : "Send Message"}</NeumorphicButton>
    </fieldset>
  </form>;
}

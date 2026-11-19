import type { SVGProps } from "react";
type Props = SVGProps<SVGSVGElement>;
const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
export function ContactMailIcon(props: Props) { return <svg {...base} {...props}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></svg>; }
export function ContactPhoneIcon(props: Props) { return <svg {...base} {...props}><path d="m7.5 3 3 5-2.2 2.3a16 16 0 0 0 5.4 5.4l2.3-2.2 5 3-.8 3.4c-.2 1-1.2 1.7-2.3 1.5C9.7 20 4 14.3 2.6 6.1c-.2-1.1.5-2.1 1.5-2.3L7.5 3Z" /></svg>; }
export function ContactSupportIcon(props: Props) { return <svg {...base} {...props}><path d="M4 13v-2a8 8 0 0 1 16 0v5c0 3-2 5-5 5h-2" /><rect x="3" y="11" width="4" height="7" rx="2" /><rect x="17" y="11" width="4" height="7" rx="2" /></svg>; }
export function ContactMessageIcon(props: Props) { return <svg {...base} {...props}><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 3v-3a2 2 0 0 1-2-2V7a3 3 0 0 1 3-3Z" /><path d="M7 10h.01M12 10h.01M17 10h.01" /></svg>; }
export function ContactSendIcon(props: Props) { return <svg {...base} {...props}><path d="m22 2-7 20-4-9L2 9 22 2ZM11 13 22 2" /></svg>; }
export function ContactArrowIcon(props: Props) { return <svg {...base} {...props}><path d="M6 18 18 6M6 6h12v12" /></svg>; }
export function ContactSocialIcon({ kind, ...props }: Props & { kind: "instagram" | "youtube" | "tiktok" | "x" | "soundcloud" }) {
  if (kind === "instagram") return <svg {...base} {...props}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5h.01" /></svg>;
  if (kind === "youtube") return <svg {...base} {...props}><rect x="2" y="5" width="20" height="14" rx="4" /><path d="m10 9 6 3-6 3V9Z" fill="currentColor" stroke="none" /></svg>;
  if (kind === "tiktok") return <svg {...base} {...props}><path d="M14 3v12a4 4 0 1 1-4-4M14 3c1 4 3 5 6 5M14 7c2 2 4 3 6 3" strokeWidth="2.8" /></svg>;
  if (kind === "x") return <svg {...base} {...props}><path d="m4 3 13 18h4L8 3H4ZM20 3 4 21" /></svg>;
  return <svg {...base} {...props}><path d="M3 13v5M6 10v10M9 7v13M12 6v14M15 9v11M18 12v8M21 15v4" strokeWidth="2.6" /></svg>;
}

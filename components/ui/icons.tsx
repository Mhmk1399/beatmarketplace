import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function HeartIcon({ filled = false, ...props }: IconProps & { filled?: boolean }) {
  return <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} aria-hidden="true" {...props}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function PlayIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><path d="M8.6 6.2v11.6L18 12 8.6 6.2Z" fill="currentColor" /></svg>;
}

export function SkipBackIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><path d="M7 6v12M18 7.2v9.6L10.4 12 18 7.2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function SkipForwardIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><path d="M17 6v12M6 7.2v9.6l7.6-4.8L6 7.2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function EyeIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><path d="M2.8 12s3.3-5.2 9.2-5.2S21.2 12 21.2 12s-3.3 5.2-9.2 5.2S2.8 12 2.8 12Z" stroke="currentColor" strokeWidth="1.7" /><circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.7" /></svg>;
}

export function EyeOffIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><path d="m4 4 16 16M9.7 7c.7-.1 1.5-.2 2.3-.2 5.9 0 9.2 5.2 9.2 5.2a16 16 0 0 1-2.1 2.6M6.3 8.5A16 16 0 0 0 2.8 12s3.3 5.2 9.2 5.2c1.5 0 2.8-.3 3.9-.8M10.3 10.3a2.5 2.5 0 0 0 3.4 3.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

export function ArrowRightIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function MusicNoteIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><path d="M9 18V6.8l9-2V16M9 18c0 1.1-1.3 2-3 2s-3-.9-3-2 1.3-2 3-2 3 .9 3 2Zm9-2c0 1.1-1.3 2-3 2s-3-.9-3-2 1.3-2 3-2 3 .9 3 2Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function PlusIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

export function GridIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><rect x="4" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><rect x="14" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><rect x="4" y="14" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><rect x="14" y="14" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" /></svg>;
}

export function UserIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.7" /><path d="M5 20c.5-4 2.8-6 7-6s6.5 2 7 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

export function UsersIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" /><path d="M3.8 19c.4-3.6 2.1-5.4 5.2-5.4s4.8 1.8 5.2 5.4M15.2 5.5a3 3 0 0 1 0 5.2M16.2 13.8c2.4.4 3.7 2.1 4 5.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

export function SettingsIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" /><path d="M19 13.5v-3l-2.2-.7-.7-1.6 1.1-2-2.1-2.1-2 1.1-1.6-.7L10.5 2h-3l-.7 2.2-1.6.7-2-1.1-2.1 2.1 1.1 2-.7 1.6L0 10.5v3l2.2.7.7 1.6-1.1 2 2.1 2.1 2-1.1 1.6.7.7 2.2h3l.7-2.2 1.6-.7 2 1.1 2.1-2.1-1.1-2 .7-1.6 1.9-.7Z" transform="translate(2 -0.1) scale(.83)" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
}

export function DiscIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" /><circle cx="12" cy="12" r="2.3" stroke="currentColor" strokeWidth="1.7" /><path d="M8.2 5.1A8 8 0 0 1 12 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

export function FileTextIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><path d="M6 3.5h8l4 4V20H6V3.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M14 3.5V8h4M9 12h6M9 15.5h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

export function StoreIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><path d="m4 9 1.4-5h13.2L20 9M5 10v10h14V10" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M3.5 9a2.5 2.5 0 0 0 4.5 1.5A2.5 2.5 0 0 0 12 10a2.5 2.5 0 0 0 4 .5A2.5 2.5 0 0 0 20.5 9M9.5 20v-5h5v5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>;
}

export function TagIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><path d="m4 12 8-8h7v7l-8 8-7-7Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><circle cx="16" cy="7" r="1.2" fill="currentColor" /></svg>;
}

export function MoodIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" /><path d="M8.5 10h.01M15.5 10h.01M8.5 14.5c1.8 1.8 5.2 1.8 7 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}

export function PianoIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" /><path d="M8 5v9M12 5v9M16 5v9M6 14v5M10 14v5M14 14v5M18 14v5" stroke="currentColor" strokeWidth="1.5" /></svg>;
}

export function ChevronDownIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><path d="m7 9.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function MenuIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

export function CloseIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

export function LogOutIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function ShieldIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><path d="M12 3.5 19 6v5.2c0 4.3-2.4 7.4-7 9.3-4.6-1.9-7-5-7-9.3V6l7-2.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function CheckIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><path d="m5 12.5 4.2 4L19 7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

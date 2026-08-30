import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

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

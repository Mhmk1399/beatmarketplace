import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;
const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };

export function AboutWaveIcon(props: Props) {
  return <svg {...base} {...props}><path d="M3 10v4M7.5 6v12M12 3v18M16.5 7v10M21 10v4" /></svg>;
}
export function AboutLayersIcon(props: Props) {
  return <svg {...base} {...props}><path d="m3 7 9-4 9 4-9 5-9-5Zm0 5 9 5 9-5M3 17l9 5 9-5" /></svg>;
}
export function AboutHeadphonesIcon(props: Props) {
  return <svg {...base} {...props}><path d="M4 14v-3a8 8 0 0 1 16 0v3" /><rect x="3" y="12" width="4" height="8" rx="2" /><rect x="17" y="12" width="4" height="8" rx="2" /></svg>;
}

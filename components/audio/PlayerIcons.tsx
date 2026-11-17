import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;
const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };

export function PlayerPlayIcon(props: Props) { return <svg {...base} {...props}><path d="m9 5 11 7-11 7Z" fill="currentColor" stroke="none" /></svg>; }
export function PlayerPauseIcon(props: Props) { return <svg {...base} {...props}><path d="M8 5v14M16 5v14" strokeWidth="4" /></svg>; }
export function PlayerPreviousIcon(props: Props) { return <svg {...base} {...props}><path d="M5 5v14" /><path d="M19 5 8 12l11 7Z" fill="currentColor" stroke="none" /></svg>; }
export function PlayerNextIcon(props: Props) { return <svg {...base} {...props}><path d="M19 5v14" /><path d="M5 5 16 12 5 19Z" fill="currentColor" stroke="none" /></svg>; }
export function PlayerSkipIcon({ forward = false, ...props }: Props & { forward?: boolean }) { return <svg {...base} {...props}><g transform={forward ? "translate(24 0) scale(-1 1)" : undefined}><path d="M5 7h7a7 7 0 1 1-6.7 9M5 7l4-4M5 7l4 4" /></g><text x="12" y="15.6" textAnchor="middle" fontSize="7.7" fontFamily="inherit" fontWeight="800" stroke="none" fill="currentColor">10</text></svg>; }
export function PlayerVolumeIcon({ muted = false, ...props }: Props & { muted?: boolean }) { return <svg {...base} {...props}><path d="m11 4-5 4H3v8h3l5 4Z" />{muted ? <path d="m16 9 5 6m0-6-5 6" /> : <><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" /></>}</svg>; }
export function PlayerShuffleIcon(props: Props) { return <svg {...base} {...props}><path d="M3 6h3c5 0 7 12 12 12h3M17 14l4 4-4 4M3 18h3c5 0 7-12 12-12h3M17 2l4 4-4 4" /></svg>; }
export function PlayerRepeatIcon({ one = false, ...props }: Props & { one?: boolean }) { return <svg {...base} {...props}><path d="m16 2 4 4-4 4M20 6H7a4 4 0 0 0-4 4M8 22l-4-4 4-4M4 18h13a4 4 0 0 0 4-4" />{one && <path d="m10 11 2-1v5" />}</svg>; }
export function PlayerQueueIcon(props: Props) { return <svg {...base} {...props}><path d="M3 5h17M3 10h11M3 15h7M17 13v7M13.5 16.5h7" /></svg>; }
export function PlayerExpandIcon(props: Props) { return <svg {...base} {...props}><path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7" /></svg>; }
export function PlayerCollapseIcon(props: Props) { return <svg {...base} {...props}><path d="M5 12h14" /></svg>; }
export function PlayerCloseIcon(props: Props) { return <svg {...base} {...props}><path d="m6 6 12 12M18 6 6 18" /></svg>; }
export function PlayerMusicIcon(props: Props) { return <svg {...base} {...props}><path d="M10 17V5l10-2v12M10 9l10-2" /><ellipse cx="6.5" cy="18" rx="3.5" ry="3" /><ellipse cx="16.5" cy="16" rx="3.5" ry="3" /></svg>; }
export function PlayerLoaderIcon(props: Props) { return <svg {...base} {...props}><path d="M20 12a8 8 0 1 1-8-8" /></svg>; }

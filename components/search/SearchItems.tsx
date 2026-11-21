import { CoverImage } from "@/components/ui/CoverImage";
import Link from "next/link";
import { ArrowRightIcon, MusicNoteIcon } from "@/components/ui/icons";
import type { SearchBeat, SearchCategory, SearchKind } from "@/lib/search/types";
import styles from "./search.module.css";
export const searchLabels: Record<SearchKind, string> = { genres: "Categories", moods: "Moods", instruments: "Instruments" };
export function CategoryResult({ item, onNavigate }: { item: SearchCategory; onNavigate?: () => void }) {
  return <Link prefetch={false} href={item.href} onClick={onNavigate} className={styles.category}>
    <span className={styles.thumbnail}>{item.image ? <CoverImage src={item.image} alt="" sizes="52px" /> : <MusicNoteIcon />}</span>
    <span className={styles.resultText}><strong>{item.name}</strong><small>{searchLabels[item.kind]}</small></span><ArrowRightIcon />
  </Link>;
}
export function BeatResult({ item, onNavigate }: { item: SearchBeat; onNavigate?: () => void }) {
  return <Link prefetch={false} href={item.href} onClick={onNavigate} className={styles.beat}>
    <span className={styles.beatArt}>{item.image ? <CoverImage src={item.image} alt="" sizes="(max-width:639px) 44vw, 240px" /> : <MusicNoteIcon />}<span className={styles.beatShade} /><span className={styles.beatLabel}>BEAT</span></span>
    <span className={styles.beatText}><strong>{item.title}</strong><small>{item.bpm} BPM <span aria-hidden="true">·</span> {item.musicalKey || "Original instrumental"}</small><span>Listen and view licenses <ArrowRightIcon /></span></span>
  </Link>;
}

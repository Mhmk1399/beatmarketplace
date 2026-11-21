"use client";

import Image, { type ImageProps } from "next/image";
import { useState, type CSSProperties } from "react";
import { MusicNoteIcon } from "@/components/ui/icons";
import styles from "./CoverImage.module.css";

type CoverImageProps = Omit<ImageProps, "fill" | "width" | "height" | "style" | "objectFit" | "objectPosition" | "onError"> & {
  position?: CSSProperties["objectPosition"];
};

/** The parent owns the responsive frame; every cover fills it without distortion. */
export function CoverImage({ src, alt, position = "center", unoptimized = true, draggable = false, ...props }: CoverImageProps) {
  const [failedSource, setFailedSource] = useState<ImageProps["src"] | null>(null);
  if (!src || failedSource === src) return <span className={`${styles.fallback} artwork-nocturne`} role={alt ? "img" : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}><MusicNoteIcon /></span>;
  return <Image {...props} src={src} alt={alt} fill unoptimized={unoptimized} draggable={draggable} style={{ objectFit: "cover", objectPosition: position }} onError={() => setFailedSource(src)} />;
}

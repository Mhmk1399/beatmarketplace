"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import type { HeroSlotElements, HeroSlotPosition } from "./useHeroCarouselMotion";

export function HeroCarouselSlot({ id, position, onRegister, children }: { id: string; position: HeroSlotPosition; onRegister: (id: string, elements: HeroSlotElements | null) => void; children: ReactNode }) {
  const layout = useRef<HTMLDivElement>(null);
  const motion = useRef<HTMLDivElement>(null);
  const resize = useRef<HTMLDivElement>(null);
  const scale = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!layout.current || !motion.current || !resize.current || !scale.current) return;
    onRegister(id, { layout: layout.current, motion: motion.current, resize: resize.current, scale: scale.current });
    return () => onRegister(id, null);
  }, [id, onRegister]);
  return <div ref={layout} className="hero-featured-slot" data-hero-id={id} data-position={position} inert={position !== 0} aria-hidden={position !== 0} tabIndex={position === 0 ? -1 : undefined}>
    <div ref={motion} className="hero-featured-slot-motion"><div ref={resize} className="hero-featured-slot-resize"><div ref={scale} className="hero-featured-slot-scale">{children}</div></div></div>
  </div>;
}

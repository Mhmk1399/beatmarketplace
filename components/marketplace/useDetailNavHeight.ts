"use client";

import { useEffect, useRef } from "react";

/** The loading and loaded screens reserve exactly the same measured navigation space. */
export function useDetailNavHeight() {
  const screen = useRef<HTMLElement>(null);
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".music-navbar");
    const section = screen.current;
    if (!header || !section) return;
    const measure = () => section.style.setProperty("--detail-nav-height", Math.ceil(header.getBoundingClientRect().height) + "px");
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  return screen;
}

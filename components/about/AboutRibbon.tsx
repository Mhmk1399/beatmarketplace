/** Decorative points are static SVG: no additional WebGL scene or animation loop. */
export function AboutRibbon({ variant }: { variant: "hero" | "community" }) {
  return <svg className={`about-ribbon about-ribbon-${variant}`} viewBox="0 0 1200 420" fill="none" preserveAspectRatio="none" aria-hidden="true">
    {Array.from({ length: 35 }, (_, index) => {
      const offset = index * 3;
      const path = variant === "hero"
        ? `M-100 ${300 + offset}C100 ${400 - offset},240 ${18 + offset},460 ${135 + offset * .5}S760 ${370 - offset},1300 ${30 + offset}`
        : `M-100 ${330 + offset}C100 ${114 + offset},245 ${440 - offset},470 ${298 + offset * .4}S720 ${135 + offset},930 ${216 + offset * .4}S1130 ${-20 + offset},1300 ${126 + offset}`;
      return <path key={index} d={path} />;
    })}
  </svg>;
}

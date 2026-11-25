import Image from "next/image";
import type { HomeResponsiveImage } from "@/lib/home/types";

export function HomeEditorialPicture({ image, sizes, className }: {
  image: HomeResponsiveImage | null;
  sizes: string;
  className?: string;
}) {
  if (!image) return null;
  const { base, medium, mobile } = image;
  return (
    <picture className={className}>
      {mobile && <source media="(max-width: 599px)" srcSet={mobile.src} type="image/webp" />}
      {medium && <source srcSet={`${medium.src} ${medium.width}w, ${base.src} ${base.width}w`} sizes={sizes} type="image/webp" />}
      <Image {...base} alt="" unoptimized loading="lazy" />
    </picture>
  );
}

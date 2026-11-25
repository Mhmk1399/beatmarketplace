export type HomeImage = { src: string; width: number; height: number };

export type HomeResponsiveImage = {
  base: HomeImage;
  medium?: HomeImage;
  mobile?: HomeImage;
};

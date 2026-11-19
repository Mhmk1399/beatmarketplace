/** Decorative sound motif; live frequency data is supplied separately by TrackSpectrum. */
export function ReleaseWave({ className }: { className?: string }) {
  const path = Array.from({ length: 105 }, (_, index) => {
    const x = index * 5 + 2;
    const envelope = 30 * Math.exp(-Math.pow((index - 23) / 13, 2)) + 45 * Math.exp(-Math.pow((index - 63) / 10, 2)) + 17 * Math.exp(-Math.pow((index - 87) / 9, 2));
    const height = 3 + envelope * (.32 + .68 * Math.abs(Math.sin(index * 1.87)));
    return `M${x} ${(60 - height).toFixed(1)}v${(height * 2).toFixed(1)}`;
  }).join("");
  return <svg className={className} viewBox="0 0 525 120" fill="none" aria-hidden="true" focusable="false" preserveAspectRatio="none"><path d={path} stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>;
}

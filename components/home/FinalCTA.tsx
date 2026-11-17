import { CreateCta } from "@/components/home/CreateCta";
import { ArrowRightIcon } from "@/components/ui/icons";
import { NeumorphicLink } from "@/components/ui/neumorphic/Button";

export function FinalCTA() {
  return (
    <section className="music-home-section music-home-final" aria-labelledby="final-cta-title">
      <div className="music-home-container"><div className="music-home-final-panel"><div><p className="music-home-kicker">Go where the music takes you</p><h2 id="final-cta-title">The next one could<br />be <span className="text-gradient">your sound.</span></h2></div><div className="music-home-final-actions"><NeumorphicLink href="/marketplace" variant="accent" size="lg">Find your beat <ArrowRightIcon className="size-4" /></NeumorphicLink><CreateCta label="Bring your music" /></div><span className="music-home-final-record" aria-hidden="true" /></div></div>
    </section>
  );
}

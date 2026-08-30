import { CreateCta } from "@/components/home/CreateCta";
import { PlayerMockup } from "@/components/home/PlayerMockup";
import { NeumorphicLink } from "@/components/ui/neumorphic/Button";

export function Hero() {
  return (
    <section className="px-5 pb-20 pt-14 sm:pb-28 sm:pt-20 lg:pt-24">
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.02fr_.98fr] lg:gap-8">
        <div className="relative z-10 max-w-3xl">
          <div className="neo-inset inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.17em] text-[#b79acb]">
            <span className="size-1.5 rounded-full bg-[#c084fc] shadow-[0_0_14px_#a855f7]" />
            Independent sound, made visible
          </div>
          <h1 className="mt-8 text-[clamp(3.25rem,8vw,7.4rem)] font-black leading-[0.88] tracking-[-0.068em] text-[#f3f1f7]">
            Find the sound
            <span className="text-gradient block">your release needs.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-[#a2a7b2] sm:text-lg sm:leading-8">
            Discover original tracks from independent producers, hear the feeling instantly, and find the right foundation for what you make next.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <NeumorphicLink href="/#sounds" size="lg">
              Preview the sound
            </NeumorphicLink>
            <CreateCta />
          </div>
          <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#717681]">
            <span>Original music</span>
            <span>Independent producers</span>
            <span>Clear terms</span>
          </div>
        </div>

        <PlayerMockup />
      </div>
    </section>
  );
}

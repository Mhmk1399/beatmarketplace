import { CreateCta } from "@/components/home/CreateCta";
import { NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { NeumorphicSurface } from "@/components/ui/neumorphic/Surface";

export function FinalCTA() {
  return (
    <section className="px-5 py-20 sm:py-28">
      <NeumorphicSurface depth="strong" className="relative mx-auto max-w-7xl overflow-hidden rounded-[38px] px-6 py-16 text-center sm:px-12 sm:py-24">
        <div className="accent-orb absolute left-1/2 top-1/2 -z-0 size-[32rem] -translate-x-1/2 -translate-y-1/2 opacity-45" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-3xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#b78aed]">Make something unmistakable</p>
          <h2 className="mt-5 text-5xl font-black leading-[0.94] tracking-[-0.055em] text-[#f5f2f8] sm:text-7xl">Your next release starts with the right sound.</h2>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <NeumorphicLink href="/#sounds" size="lg">Preview music</NeumorphicLink>
            <CreateCta />
          </div>
        </div>
      </NeumorphicSurface>
    </section>
  );
}

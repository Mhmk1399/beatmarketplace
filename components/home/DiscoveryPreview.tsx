import { demoTracks } from "@/components/home/demo-content";
import { PlayIcon } from "@/components/ui/icons";
import { NeumorphicSurface } from "@/components/ui/neumorphic/Surface";

export function DiscoveryPreview() {
  return (
    <section id="sounds" className="scroll-mt-28 px-5 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#a875f5]">Discovery preview</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.045em] text-[#f1eff5] sm:text-5xl">Find your next sound.</h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-[#858a96]">Presentation catalog only. Real track discovery will arrive with the marketplace API.</p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {demoTracks.map((track, index) => (
            <NeumorphicSurface
              key={track.title}
              className={`group rounded-[28px] p-3 transition-transform duration-200 hover:-translate-y-1 ${index === 0 ? "sm:row-span-2 lg:row-span-1" : ""}`}
            >
              <div className={`relative aspect-[1.04] overflow-hidden rounded-[22px] ${track.artworkClass}`}>
                <div className="absolute inset-0 bg-[linear-gradient(130deg,transparent_34%,rgba(255,255,255,.09),transparent_60%)] opacity-60" />
                <span className="neo-button-accent absolute bottom-4 right-4 inline-flex size-12 items-center justify-center rounded-full text-white" aria-hidden="true">
                  <PlayIcon className="ml-0.5 size-5" />
                </span>
              </div>
              <div className="px-2 pb-3 pt-5">
                <h3 className="truncate text-lg font-extrabold tracking-[-0.025em] text-[#efedf3]">{track.title}</h3>
                <p className="mt-1 text-sm text-[#8d929e]">{track.producer}</p>
                <div className="mt-5 flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#737884]">
                  <span className="truncate">{track.genre}</span>
                  <span className="shrink-0 text-[#b89ae0]">{track.bpm} · {track.musicalKey}</span>
                </div>
              </div>
            </NeumorphicSurface>
          ))}
        </div>
      </div>
    </section>
  );
}

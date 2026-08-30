import { waveformHeights } from "@/components/home/demo-content";
import { MusicNoteIcon, PlayIcon } from "@/components/ui/icons";
import { NeumorphicSurface } from "@/components/ui/neumorphic/Surface";

export function AuthVisual({ mode }: { mode: "login" | "signup" }) {
  return (
    <div className="relative flex min-h-[36rem] items-center justify-center overflow-hidden rounded-[34px] px-6 py-12 lg:min-h-[44rem]">
      <div className="accent-orb absolute inset-[8%] -z-10 rounded-full opacity-65" aria-hidden="true" />
      <div className="absolute left-[12%] top-[14%] size-2 rounded-full bg-[#d8b4fe] shadow-[0_0_26px_8px_rgba(168,85,247,.35)]" aria-hidden="true" />
      <div className="absolute bottom-[18%] right-[12%] size-1.5 rounded-full bg-[#f0abfc] shadow-[0_0_22px_7px_rgba(217,70,239,.3)]" aria-hidden="true" />

      <div className="relative w-full max-w-md">
        <div className="mb-10 max-w-sm">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#aa7cf0]">BeatMarketplace</p>
          <h1 className="mt-4 text-4xl font-black leading-[1.02] tracking-[-0.05em] text-[#f2eff6] sm:text-5xl">
            {mode === "login" ? "Continue where your sound left off." : "Build your place in the sound."}
          </h1>
          <p className="mt-5 text-sm leading-6 text-[#8d929e]">
            {mode === "login" ? "Your session, catalog identity, and producer access stay connected." : "One account for discovering music, collaborating, and becoming a producer."}
          </p>
        </div>

        <NeumorphicSurface depth="strong" className="rotate-[-2deg] rounded-[30px] p-5">
          <div className="flex items-center gap-4">
            <div className="artwork-orbit relative size-24 shrink-0 overflow-hidden rounded-[22px]">
              <span className="absolute inset-0 flex items-center justify-center"><MusicNoteIcon className="size-8 text-white/75" /></span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.17em] text-[#8566ae]">Saved frequency</p>
              <p className="mt-2 truncate text-lg font-extrabold text-[#eae7ef]">After Orbit</p>
              <p className="mt-1 text-xs text-[#777c88]">Nox Club · 126 BPM</p>
            </div>
            <span className="neo-button-accent flex size-12 shrink-0 items-center justify-center rounded-full text-white" aria-hidden="true">
              <PlayIcon className="ml-0.5 size-5" />
            </span>
          </div>
          <div className="neo-inset mt-5 flex h-16 items-center justify-between gap-[3px] overflow-hidden rounded-2xl px-4" aria-hidden="true">
            {waveformHeights.slice(0, 24).map((height, index) => (
              <span key={`${height}-${index}`} className="wave-bar" style={{ height: `${Math.max(18, height - 8)}%` }} />
            ))}
          </div>
        </NeumorphicSurface>
      </div>
    </div>
  );
}

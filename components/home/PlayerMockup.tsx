import { PlayIcon, SkipBackIcon, SkipForwardIcon } from "@/components/ui/icons";
import { NeumorphicSurface } from "@/components/ui/neumorphic/Surface";
import { waveformHeights } from "@/components/home/demo-content";

export function PlayerMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[520px] px-2 py-10 sm:px-8" aria-label="Decorative music player preview">
      <div className="accent-orb absolute -inset-14 -z-10 rounded-full" aria-hidden="true" />

      <NeumorphicSurface depth="strong" className="relative overflow-hidden rounded-[34px] p-4 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-[0.86fr_1.14fr] sm:items-center">
          <div className="artwork-nocturne vinyl-lines relative aspect-square overflow-hidden rounded-[26px] shadow-[inset_0_1px_0_rgba(255,255,255,.12),10px_12px_28px_rgba(0,0,0,.48)]">
            <div className="absolute inset-0 bg-[linear-gradient(125deg,transparent_35%,rgba(255,255,255,.09),transparent_58%)]" />
            <div className="absolute bottom-4 left-4 rounded-full bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/75 backdrop-blur-sm">
              Original track
            </div>
          </div>

          <div className="min-w-0 px-1 sm:px-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#9d6fe9]">Now previewing</p>
            <h2 className="mt-2 truncate text-2xl font-extrabold tracking-[-0.035em] text-[#f5f2f8]">Midnight Shift</h2>
            <p className="mt-1 text-sm text-[#9095a1]">Ari Vance</p>

            <div className="neo-inset mt-6 rounded-2xl px-3 py-4">
              <div className="flex h-14 items-center justify-between gap-[3px] overflow-hidden" aria-hidden="true">
                {waveformHeights.map((height, index) => (
                  <span key={`${height}-${index}`} className="wave-bar" style={{ height: `${height}%` }} />
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] font-semibold text-[#6f7480]">
                <span>0:42</span>
                <span>2:48</span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-center gap-4" aria-hidden="true">
              <span className="neo-icon-button inline-flex size-10 items-center justify-center rounded-full text-[#9499a6]">
                <SkipBackIcon className="size-4" />
              </span>
              <span className="neo-button-accent inline-flex size-14 items-center justify-center rounded-full text-white shadow-[8px_8px_20px_rgba(0,0,0,.5),0_8px_25px_rgba(139,92,246,.25)]">
                <PlayIcon className="ml-0.5 size-6" />
              </span>
              <span className="neo-icon-button inline-flex size-10 items-center justify-center rounded-full text-[#9499a6]">
                <SkipForwardIcon className="size-4" />
              </span>
            </div>
          </div>
        </div>
      </NeumorphicSurface>

      <NeumorphicSurface className="floating-card absolute -left-1 top-1 rounded-2xl px-4 py-3 sm:left-0 sm:top-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#747986]">Tempo</p>
        <p className="mt-1 text-lg font-extrabold text-[#eeeaf4]">140 <span className="text-xs text-[#9a9fab]">BPM</span></p>
      </NeumorphicSurface>

      <NeumorphicSurface className="floating-card-delayed absolute -right-1 top-4 rounded-2xl px-4 py-3 sm:right-1 sm:top-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#747986]">Key</p>
        <p className="mt-1 text-lg font-extrabold text-[#d8b4fe]">C♯ Minor</p>
      </NeumorphicSurface>

      <NeumorphicSurface className="floating-card absolute -bottom-1 right-4 rounded-2xl px-4 py-3 sm:right-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#747986]">Mood</p>
        <p className="mt-1 text-sm font-bold text-[#eeeaf4]">Dark · Cinematic</p>
      </NeumorphicSurface>
    </div>
  );
}

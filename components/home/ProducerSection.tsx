import { CreateCta } from "@/components/home/CreateCta";
import { MusicNoteIcon, PlusIcon } from "@/components/ui/icons";
import { NeumorphicSurface } from "@/components/ui/neumorphic/Surface";

const stats = [
  ["12", "Tracks"],
  ["8", "Published"],
  ["4", "Drafts"],
];

export function ProducerSection() {
  return (
    <section id="producer" className="scroll-mt-28 px-5 py-20 sm:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <div className="order-2 lg:order-1">
          <NeumorphicSurface depth="strong" className="relative overflow-hidden rounded-[34px] p-5 sm:p-7">
            <div className="absolute right-0 top-0 size-48 translate-x-1/3 -translate-y-1/3 rounded-full bg-[#a855f7]/10 blur-3xl" aria-hidden="true" />
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="neo-inset flex size-11 items-center justify-center rounded-2xl text-[#c084fc]"><MusicNoteIcon className="size-5" /></span>
                <div>
                  <p className="text-sm font-extrabold text-[#eeebf2]">Producer Studio</p>
                  <p className="text-xs text-[#737884]">Catalog overview · concept</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-emerald-300">Live</span>
            </div>

            <div className="mt-7 grid grid-cols-3 gap-3">
              {stats.map(([value, label]) => (
                <div key={label} className="neo-inset rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black tracking-[-0.04em] text-[#f2eff6]">{value}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#707581]">{label}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-3">
              {["Midnight Shift", "Slow Signal", "Glass Houses"].map((title, index) => (
                <div key={title} className="flex items-center gap-3 rounded-2xl bg-black/10 p-3">
                  <div className={`size-11 shrink-0 rounded-xl ${index === 0 ? "artwork-nocturne" : index === 1 ? "artwork-tidal" : "artwork-ember"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#dcd9e1]">{title}</p>
                    <p className="mt-0.5 text-xs text-[#707581]">{index === 1 ? "Draft" : "Published"}</p>
                  </div>
                  <span className="text-xs font-semibold text-[#777c88]">{index === 0 ? "2.4k" : index === 1 ? "—" : "984"}</span>
                </div>
              ))}
            </div>

            <div className="neo-button mt-5 flex min-h-12 items-center justify-center gap-2 rounded-2xl text-sm font-bold text-[#bca1e3]" aria-hidden="true">
              <PlusIcon className="size-4" /> New track
            </div>
          </NeumorphicSurface>
        </div>

        <div className="order-1 lg:order-2">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#a875f5]">For producers</p>
          <h2 className="mt-4 text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[#f2eff6] sm:text-6xl">
            Your sound.<br />Your storefront.<br /><span className="text-gradient">Your rules.</span>
          </h2>
          <p className="mt-7 max-w-lg text-base leading-7 text-[#969ba7]">Build your catalog, define how your music can be used, and shape a producer identity that feels entirely your own.</p>
          <CreateCta className="mt-8" label="Create your account" />
          <p className="mt-4 text-xs text-[#6f7480]">Studio interface shown as a visual concept only.</p>
        </div>
      </div>
    </section>
  );
}

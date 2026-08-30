import { demoMoods } from "@/components/home/demo-content";

export function MoodExplorer() {
  return (
    <section className="px-5 py-14 sm:py-20" aria-labelledby="mood-heading">
      <div className="mx-auto max-w-7xl rounded-[34px] bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,.09),transparent_35%),rgba(255,255,255,.008)] px-5 py-10 sm:px-10 sm:py-14">
        <div className="grid gap-9 lg:grid-cols-[.62fr_1.38fr] lg:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#a875f5]">Explore by feeling</p>
            <h2 id="mood-heading" className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#f1eff5] sm:text-4xl">Start with the mood.</h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-[#858a96]">A visual preview of the mood taxonomy. Filtering is intentionally not active yet.</p>
          </div>
          <div className="flex flex-wrap gap-3" aria-label="Example track moods">
            {demoMoods.map((mood, index) => (
              <span
                key={mood}
                className={`neo-raised inline-flex min-h-12 items-center rounded-2xl px-5 text-sm font-bold ${index === 1 || index === 5 ? "text-[#d8b4fe]" : "text-[#a7acb7]"}`}
              >
                {mood}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

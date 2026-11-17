import { demoMoods } from "@/components/home/demo-content";

export function MoodExplorer() {
  return (
    <section className="px-5 py-14 sm:py-20" aria-labelledby="mood-heading">
      <div className="mx-auto max-w-7xl rounded-[34px] mood-surface px-5 py-10 sm:px-10 sm:py-14">
        <div className="grid gap-9 lg:grid-cols-[.62fr_1.38fr] lg:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-info">Explore by feeling</p>
            <h2 id="mood-heading" className="mt-3 text-3xl font-black tracking-[-0.04em] text-foreground sm:text-4xl">Start with the mood.</h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-muted">A visual preview of the mood taxonomy. Filtering is intentionally not active yet.</p>
          </div>
          <div className="flex flex-wrap gap-3" aria-label="Example track moods">
            {demoMoods.map((mood, index) => (
              <span
                key={mood}
                className={`neo-raised inline-flex min-h-12 items-center rounded-[var(--radius-control)] px-5 text-sm font-bold ${index === 1 || index === 5 ? "text-accent-text" : "text-muted"}`}
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

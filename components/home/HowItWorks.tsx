const artistSteps = ["Discover", "Listen", "License", "Create"];
const producerSteps = ["Upload", "Define terms", "Publish", "Sell"];

function StepFlow({ label, steps }: { label: string; steps: string[] }) {
  return (
    <div className="neo-raised rounded-[28px] p-6 sm:p-8">
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#9e73dd]">{label}</p>
      <ol className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {steps.map((step, index) => (
          <li key={step} className="relative">
            <div className="neo-inset flex min-h-20 flex-col justify-between rounded-2xl p-4">
              <span className="text-[10px] font-black text-[#696e79]">0{index + 1}</span>
              <span className="text-sm font-extrabold text-[#d9d6df]">{step}</span>
            </div>
            {index < steps.length - 1 && <span className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 text-[#6e4b9a] sm:block">→</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-28 px-5 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#a875f5]">Two sides, one creative flow</p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] text-[#f1eff5] sm:text-5xl">Made to keep music moving.</h2>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <StepFlow label="For artists" steps={artistSteps} />
          <StepFlow label="For producers" steps={producerSteps} />
        </div>
      </div>
    </section>
  );
}

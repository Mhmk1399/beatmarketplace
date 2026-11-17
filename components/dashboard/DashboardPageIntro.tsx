import type { ReactNode } from "react";

export function DashboardPageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-info">{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-foreground sm:text-4xl">{title}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-[15px]">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

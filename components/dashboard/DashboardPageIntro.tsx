import type { ReactNode } from "react";

export function DashboardPageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="workspace-page-intro">
      <div className="workspace-page-copy">
        <p className="workspace-page-eyebrow">{eyebrow}</p>
        <h1 className="workspace-page-title">{title}</h1>
        <p className="workspace-page-description">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

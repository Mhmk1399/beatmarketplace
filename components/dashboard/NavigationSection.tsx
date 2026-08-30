"use client";

import { NavigationItem } from "@/components/dashboard/NavigationItem";
import type { NavigationSection as NavigationSectionDefinition } from "@/lib/dashboard/navigation";

export function NavigationSection({
  onNavigate,
  pathname,
  section,
  workspaceRoot,
}: {
  onNavigate?: () => void;
  pathname: string;
  section: NavigationSectionDefinition;
  workspaceRoot: string;
}) {
  return (
    <section aria-label={section.label}>
      {section.label && <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[0.19em] text-[#666c79]">{section.label}</p>}
      <div className="space-y-1.5">
        {section.items.map((item) => <NavigationItem key={item.href} item={item} onNavigate={onNavigate} pathname={pathname} workspaceRoot={workspaceRoot} />)}
      </div>
    </section>
  );
}

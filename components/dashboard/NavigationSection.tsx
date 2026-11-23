"use client";

import { useId, useState } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";
import { NavigationItem } from "@/components/dashboard/NavigationItem";
import { isNavigationItemActive, type NavigationSection as NavigationSectionDefinition } from "@/lib/dashboard/navigation";

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
  const [expanded, setExpanded] = useState(true);
  const sectionId = useId();
  const containsCurrentPage = section.items.some(item => isNavigationItemActive(pathname, item, workspaceRoot));
  return (
    <section aria-label={section.label} className="dashboard-nav-section">
      {section.label && <button type="button" className="dashboard-nav-section-toggle" data-active={containsCurrentPage || undefined} aria-expanded={expanded} aria-controls={sectionId} onClick={()=>setExpanded(value=>!value)}><span>{section.label}{containsCurrentPage && <span className="sr-only"> — current section</span>}</span><ChevronDownIcon className={`size-3.5 transition-transform ${expanded ? "" : "-rotate-90"}`} /></button>}
      <div id={sectionId} hidden={Boolean(section.label) && !expanded} className="space-y-1">
        {section.items.map((item) => <NavigationItem key={item.href} item={item} onNavigate={onNavigate} pathname={pathname} workspaceRoot={workspaceRoot} />)}
      </div>
    </section>
  );
}

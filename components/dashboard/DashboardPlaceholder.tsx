import Link from "next/link";

import { ArrowRightIcon } from "@/components/ui/icons";
import { NeumorphicSurface } from "@/components/ui/neumorphic/Surface";
import type { NavigationItem } from "@/lib/dashboard/navigation";
import type { WorkspaceDefinition } from "@/lib/dashboard/workspaces";

import { DashboardIcon } from "./DashboardIcon";
import { DashboardPageIntro } from "./DashboardPageIntro";

export function DashboardPlaceholder({ item, workspace }: { item: NavigationItem; workspace: WorkspaceDefinition }) {
  return (
    <div className="space-y-8">
      <DashboardPageIntro eyebrow={workspace.label} title={item.label} description={item.description ?? "This workspace area is reserved for a later milestone."} />
      <NeumorphicSurface className="max-w-3xl rounded-[28px] p-6 sm:p-8">
        <div className="neo-inset flex size-14 items-center justify-center rounded-[18px] text-accent-muted">
          <DashboardIcon name={item.icon} className="size-6" />
        </div>
        <h3 className="mt-6 text-xl font-extrabold tracking-[-0.025em] text-foreground">Foundation ready</h3>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted">Navigation and authorization are in place. No forms, fake records, APIs, or management behavior were added for this area.</p>
        <Link href={workspace.href} className="mt-6 inline-flex items-center gap-2 rounded-xl text-sm font-bold text-accent-text hover:text-accent-text">
          Return to overview <ArrowRightIcon className="size-4" />
        </Link>
      </NeumorphicSurface>
    </div>
  );
}

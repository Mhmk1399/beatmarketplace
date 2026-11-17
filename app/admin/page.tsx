import Link from "next/link";

import { DashboardPageIntro } from "@/components/dashboard/DashboardPageIntro";
import { ArrowRightIcon, DiscIcon, MoodIcon, PianoIcon, ShieldIcon, TagIcon, UsersIcon } from "@/components/ui/icons";
import { NeumorphicSurface } from "@/components/ui/neumorphic/Surface";
import { requireWorkspaceUser } from "@/lib/dashboard/session";

const domains = [
  { label: "Hero placements", href: "/admin/hero", description: "Scheduled, sponsored homepage beats", icon: DiscIcon },
  { label: "Users", href: "/admin/users", description: "Account administration is planned", icon: UsersIcon },
  { label: "Genres", href: "/admin/genres", description: "Hierarchical musical classification", icon: TagIcon },
  { label: "Moods", href: "/admin/moods", description: "Reusable emotional taxonomy", icon: MoodIcon },
  { label: "Instruments", href: "/admin/instruments", description: "Instrument and family taxonomy", icon: PianoIcon },
];

export default async function AdminOverviewPage() {
  const user = await requireWorkspaceUser("admin");

  return (
    <div className="space-y-9">
      <DashboardPageIntro eyebrow="Admin workspace" title="Platform administration." description={`Signed in as ${user.email}. Keep the catalog organized with consistent genres, moods and instruments.`} />

      <NeumorphicSurface depth="strong" className="rounded-[28px] p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="neo-inset flex size-14 shrink-0 items-center justify-center rounded-[18px] text-accent-muted"><ShieldIcon className="size-6" /></span>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-info">Authorized workspace</p>
            <h3 className="mt-2 text-xl font-extrabold text-foreground">Shape the music catalog</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Add and edit genres, moods and instruments. Deactivate a classification to remove it from public choices while preserving existing records. User management and audit history are planned.</p>
          </div>
        </div>
      </NeumorphicSurface>

      <section aria-labelledby="admin-domains-title">
        <h3 id="admin-domains-title" className="text-lg font-extrabold tracking-[-0.025em] text-foreground">Available management domains</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {domains.map(({ description, href, icon: Icon, label }) => (
            <Link key={href} href={href} className="dashboard-domain-card neo-raised rounded-[24px] p-5">
              <span className="neo-inset flex size-11 items-center justify-center rounded-[15px] text-accent-muted"><Icon className="size-5" /></span>
              <h4 className="mt-5 font-extrabold text-foreground">{label}</h4>
              <p className="mt-2 min-h-10 text-xs leading-5 text-faint">{description}</p>
              <span className="mt-5 flex items-center gap-1.5 text-xs font-bold text-accent-muted">{label === "Users" ? "View planned area" : "Manage catalog"} <ArrowRightIcon className="size-3.5" /></span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

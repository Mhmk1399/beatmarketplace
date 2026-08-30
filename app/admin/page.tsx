import Link from "next/link";

import { DashboardPageIntro } from "@/components/dashboard/DashboardPageIntro";
import { ArrowRightIcon, MoodIcon, PianoIcon, ShieldIcon, TagIcon, UsersIcon } from "@/components/ui/icons";
import { NeumorphicSurface } from "@/components/ui/neumorphic/Surface";
import { requireWorkspaceUser } from "@/lib/dashboard/session";

const domains = [
  { label: "Users", href: "/admin/users", description: "Identity and account administration", icon: UsersIcon },
  { label: "Genres", href: "/admin/genres", description: "Hierarchical musical classification", icon: TagIcon },
  { label: "Moods", href: "/admin/moods", description: "Reusable emotional taxonomy", icon: MoodIcon },
  { label: "Instruments", href: "/admin/instruments", description: "Instrument and family taxonomy", icon: PianoIcon },
];

export default async function AdminOverviewPage() {
  const user = await requireWorkspaceUser("admin");

  return (
    <div className="space-y-9">
      <DashboardPageIntro eyebrow="Admin workspace" title="Platform administration." description={`Signed in as ${user.email}. This overview exposes only management domains represented by the current platform foundation—without invented counts or operational metrics.`} />

      <NeumorphicSurface depth="strong" className="rounded-[28px] p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="neo-inset flex size-14 shrink-0 items-center justify-center rounded-[18px] text-[#bd8afa]"><ShieldIcon className="size-6" /></span>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#a875f5]">Authorized workspace</p>
            <h3 className="mt-2 text-xl font-extrabold text-[#ece9f0]">Operational foundation</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#858b97]">Server-side access is active. Management CRUD, audit history, permissions, and platform statistics remain separate future milestones.</p>
          </div>
        </div>
      </NeumorphicSurface>

      <section aria-labelledby="admin-domains-title">
        <h3 id="admin-domains-title" className="text-lg font-extrabold tracking-[-0.025em] text-[#e9e6ed]">Available management domains</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {domains.map(({ description, href, icon: Icon, label }) => (
            <Link key={href} href={href} className="dashboard-domain-card neo-raised rounded-[24px] p-5">
              <span className="neo-inset flex size-11 items-center justify-center rounded-[15px] text-[#ad75f7]"><Icon className="size-5" /></span>
              <h4 className="mt-5 font-extrabold text-[#e8e5ec]">{label}</h4>
              <p className="mt-2 min-h-10 text-xs leading-5 text-[#7d838f]">{description}</p>
              <span className="mt-5 flex items-center gap-1.5 text-xs font-bold text-[#ad75f7]">View foundation <ArrowRightIcon className="size-3.5" /></span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";

import { DashboardPageIntro } from "@/components/dashboard/DashboardPageIntro";
import { ArrowRightIcon, DiscIcon, StoreIcon, TagIcon } from "@/components/ui/icons";
import { NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { NeumorphicSurface } from "@/components/ui/neumorphic/Surface";
import { requireWorkspaceUser } from "@/lib/dashboard/session";
import ContractModel from "@/models/Contract";
import ProducerProfileModel from "@/models/ProducerProfile";
import TrackModel from "@/models/Track";

export default async function ProducerOverviewPage() {
  const user = await requireWorkspaceUser("producer");
  const [profile, trackCount, publicCount, draftCount, licenseCount] = await Promise.all([
    ProducerProfileModel.findOne({ userId: user._id }),
    TrackModel.countDocuments({ producerId: user._id, status: { $ne: "ARCHIVED" } }),
    TrackModel.countDocuments({ producerId: user._id, status: "PUBLISHED", visibility: "PUBLIC" }),
    TrackModel.countDocuments({ producerId: user._id, status: "DRAFT" }),
    ContractModel.countDocuments({ producerId: user._id, isActive: true }),
  ]);
  const stageName = profile?.stageName || user.profile?.displayName || user.firstName;

  return <div className="space-y-8">
    <DashboardPageIntro eyebrow="Producer Studio" title={`Your sound, ${stageName}.`} description="Keep your catalog organized, choose the moments buyers hear, and set clear terms for every release." action={<NeumorphicLink href="/studio/tracks" variant="accent">Upload track <ArrowRightIcon className="size-4" /></NeumorphicLink>} />

    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">{[
      { label: "Tracks in catalog", value: trackCount, href: "/studio/tracks" },
      { label: "Public releases", value: publicCount, href: "/studio/tracks" },
      { label: "Drafts", value: draftCount, href: "/studio/tracks" },
      { label: "Active licenses", value: licenseCount, href: "/studio/contracts" },
    ].map((stat) => <Link href={stat.href} key={stat.label} className="neo-raised rounded-[var(--radius-card)] p-5 sm:p-6"><p className="text-3xl font-black text-[var(--accent-text)]">{stat.value}</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{stat.label}</p></Link>)}</div>

    <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <NeumorphicSurface depth="strong" className="rounded-[var(--radius-card)] p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--accent-text)]">Your next release</p>
        <h3 className="mt-3 text-2xl font-extrabold tracking-tight">From master to marketplace</h3>
        <ol className="mt-6 space-y-5">{[
          { title: "Upload the full WAV", detail: "Your master is private. Add artwork, BPM, key and a genre so buyers can find it." },
          { title: "Choose your best 30 seconds", detail: "Audition any section and pick its starting point. Buyers receive only the trimmed preview." },
          { title: "Add a license, then publish", detail: "Set a price in Toman, choose usage limits and make the release public when it is ready." },
        ].map((step, index) => <li key={step.title} className="flex gap-4"><span className="neo-inset flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-black text-[var(--accent-text)]">{index + 1}</span><div><h4 className="text-sm font-bold">{step.title}</h4><p className="mt-1 text-xs leading-6 text-[var(--muted)]">{step.detail}</p></div></li>)}</ol>
        <div className="mt-7 flex flex-wrap gap-3"><NeumorphicLink href="/studio/tracks" size="sm">Manage tracks</NeumorphicLink><NeumorphicLink href="/studio/contracts" size="sm">Manage licenses</NeumorphicLink></div>
      </NeumorphicSurface>

      <NeumorphicSurface className="rounded-[var(--radius-card)] p-6 sm:p-8">
        <StoreIcon className="size-7 text-[var(--accent-text)]" />
        <h3 className="mt-4 text-xl font-extrabold">{profile?.storefrontName || `${stageName} Studio`}</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">{profile?.stageName || stageName}</p>
        <p className="mt-5 text-sm leading-7 text-[var(--muted)]">{profile?.bio || "Your studio is ready for your next release."}</p>
        <div className="mt-6 space-y-3">{[
          { title: "Tracks", href: "/studio/tracks", detail: "Upload, preview and publish", Icon: DiscIcon },
          { title: "Licenses", href: "/studio/contracts", detail: "Set prices and usage terms", Icon: TagIcon },
          { title: "Marketplace", href: "/marketplace", detail: "See what buyers discover", Icon: StoreIcon },
        ].map(({ title, href, detail, Icon }) => <Link key={href} href={href} className="dashboard-quick-link neo-inset flex items-center gap-3 rounded-[var(--radius-control)] p-4"><Icon className="size-5 shrink-0 text-[var(--accent-text)]" /><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{title}</span><span className="mt-1 block text-xs text-[var(--muted)]">{detail}</span></span><ArrowRightIcon className="size-4 shrink-0 text-[var(--muted)]" /></Link>)}</div>
      </NeumorphicSurface>
    </div>
  </div>;
}

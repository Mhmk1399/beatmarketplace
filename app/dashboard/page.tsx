import Link from "next/link";

import { DashboardPageIntro } from "@/components/dashboard/DashboardPageIntro";
import { ArrowRightIcon, ShieldIcon, UserIcon } from "@/components/ui/icons";
import { NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { NeumorphicSurface } from "@/components/ui/neumorphic/Surface";
import { requireWorkspaceUser } from "@/lib/dashboard/session";
import { ProducerOnboarding } from "@/components/dashboard/ProducerOnboarding";

export default async function PersonalOverviewPage() {
  const user = await requireWorkspaceUser("personal");
  const isProducer = user.roles.includes("PRODUCER");

  return (
    <div className="space-y-9">
      <DashboardPageIntro
        eyebrow="Personal workspace"
        title={`Welcome back, ${user.firstName}.`}
        description="Discover your next beat, return to your saved sounds, and find your purchased licenses and downloads."
        action={<NeumorphicLink href={isProducer ? "/studio" : "/marketplace"} variant="accent">{isProducer ? "Open Producer Studio" : "Explore beats"}<ArrowRightIcon className="size-4" /></NeumorphicLink>}
      />

      <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <NeumorphicSurface className="rounded-[28px] p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="neo-inset flex size-14 shrink-0 items-center justify-center rounded-[18px] text-accent-muted"><UserIcon className="size-6" /></span>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-faint">Account identity</p>
              <h3 className="mt-2 truncate text-xl font-extrabold text-foreground">{user.profile?.displayName || `${user.firstName} ${user.lastName}`}</h3>
              <p className="mt-1 truncate text-sm text-muted">{user.email}</p>
            </div>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <div className="neo-inset rounded-[18px] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-faint">Email status</p>
              <p className="mt-2 text-sm font-bold text-secondary">{user.isEmailVerified ? "Verified" : "Verification pending"}</p>
            </div>
            <div className="neo-inset rounded-[18px] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-faint">Account status</p>
              <p className="mt-2 text-sm font-bold capitalize text-secondary">{user.status.toLowerCase()}</p>
            </div>
          </div>
        </NeumorphicSurface>

        <NeumorphicSurface depth="strong" className="rounded-[28px] p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-info">Access</p>
              <h3 className="mt-2 text-lg font-extrabold text-foreground">Current roles</h3>
            </div>
            <ShieldIcon className="size-6 text-info" />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {user.roles.map((role) => <span key={role} className="neo-inset rounded-xl px-3 py-2 text-xs font-extrabold tracking-[0.08em] text-accent-text">{role}</span>)}
          </div>
          <p className="mt-6 text-sm leading-6 text-faint">{isProducer ? "Producer Studio is available from the workspace switcher." : "Producer tools stay hidden until the producer role is added through onboarding."}</p>
        </NeumorphicSurface>
      </div>

      {!isProducer && <ProducerOnboarding />}
      <div className="flex flex-wrap gap-4"><NeumorphicLink href="/dashboard/favorites">Saved beats</NeumorphicLink><NeumorphicLink href="/dashboard/orders">Purchases and downloads</NeumorphicLink><Link href="/marketplace" className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-accent-text">Explore beats <ArrowRightIcon className="size-4" /></Link></div>
    </div>
  );
}

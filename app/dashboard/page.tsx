import Link from "next/link";

import { DashboardPageIntro } from "@/components/dashboard/DashboardPageIntro";
import { ArrowRightIcon, ShieldIcon, UserIcon } from "@/components/ui/icons";
import { NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { NeumorphicSurface } from "@/components/ui/neumorphic/Surface";
import { requireWorkspaceUser } from "@/lib/dashboard/session";

export default async function PersonalOverviewPage() {
  const user = await requireWorkspaceUser("personal");
  const isProducer = user.roles.includes("PRODUCER");

  return (
    <div className="space-y-9">
      <DashboardPageIntro
        eyebrow="Personal workspace"
        title={`Welcome back, ${user.firstName}.`}
        description="This is the home for your BeatMarketplace identity. Only real account and role information appears here while marketplace systems are still being built."
        action={<NeumorphicLink href={isProducer ? "/studio" : "/dashboard/profile"} variant="accent">{isProducer ? "Open Producer Studio" : "Become a Producer"}<ArrowRightIcon className="size-4" /></NeumorphicLink>}
      />

      <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <NeumorphicSurface className="rounded-[28px] p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="neo-inset flex size-14 shrink-0 items-center justify-center rounded-[18px] text-[#bd8afa]"><UserIcon className="size-6" /></span>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#777d89]">Account identity</p>
              <h3 className="mt-2 truncate text-xl font-extrabold text-[#ece9f0]">{user.profile?.displayName || `${user.firstName} ${user.lastName}`}</h3>
              <p className="mt-1 truncate text-sm text-[#858b97]">{user.email}</p>
            </div>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <div className="neo-inset rounded-[18px] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6f7581]">Email status</p>
              <p className="mt-2 text-sm font-bold text-[#dcd9e1]">{user.isEmailVerified ? "Verified" : "Verification pending"}</p>
            </div>
            <div className="neo-inset rounded-[18px] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6f7581]">Account status</p>
              <p className="mt-2 text-sm font-bold capitalize text-[#dcd9e1]">{user.status.toLowerCase()}</p>
            </div>
          </div>
        </NeumorphicSurface>

        <NeumorphicSurface depth="strong" className="rounded-[28px] p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#a875f5]">Access</p>
              <h3 className="mt-2 text-lg font-extrabold text-[#ece9f0]">Current roles</h3>
            </div>
            <ShieldIcon className="size-6 text-[#a875f5]" />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {user.roles.map((role) => <span key={role} className="neo-inset rounded-xl px-3 py-2 text-xs font-extrabold tracking-[0.08em] text-[#cab0ec]">{role}</span>)}
          </div>
          <p className="mt-6 text-sm leading-6 text-[#818793]">{isProducer ? "Producer Studio is available from the workspace switcher." : "Producer tools stay hidden until the producer role is added through onboarding."}</p>
        </NeumorphicSurface>
      </div>

      <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-[#858b97] hover:text-[#d8b4fe]">Return to public homepage <ArrowRightIcon className="size-4" /></Link>
    </div>
  );
}

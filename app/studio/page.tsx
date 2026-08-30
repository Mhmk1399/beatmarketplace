import Link from "next/link";

import { DashboardPageIntro } from "@/components/dashboard/DashboardPageIntro";
import { ArrowRightIcon, DiscIcon, StoreIcon, TagIcon } from "@/components/ui/icons";
import { NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { NeumorphicSurface } from "@/components/ui/neumorphic/Surface";
import { requireWorkspaceUser } from "@/lib/dashboard/session";
import ProducerProfileModel from "@/models/ProducerProfile";

export default async function ProducerOverviewPage() {
  const user = await requireWorkspaceUser("producer");
  const profile = await ProducerProfileModel.findOne({ userId: user._id });
  const stageName = profile?.stageName || user.profile?.displayName || user.firstName;
  const completionSignals = profile ? [profile.stageName, profile.storefrontName, profile.bio, profile.genreIds.length > 0] : [];
  const completion = profile ? Math.round((completionSignals.filter(Boolean).length / completionSignals.length) * 100) : 0;

  return (
    <div className="space-y-9">
      <DashboardPageIntro
        eyebrow="Producer Studio"
        title={`Your sound, ${stageName}.`}
        description="The studio foundation is connected to your real producer identity. Catalog management remains intentionally paused for the next milestone."
        action={<NeumorphicLink href="/studio/tracks" variant="accent">Create Track <ArrowRightIcon className="size-4" /></NeumorphicLink>}
      />

      {profile ? (
        <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
          <NeumorphicSurface depth="strong" className="rounded-[28px] p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#a875f5]">Producer profile</p>
                <h3 className="mt-3 text-2xl font-black tracking-[-0.035em] text-[#efecf2]">{profile.stageName}</h3>
                <p className="mt-1 text-sm text-[#858b97]">{profile.storefrontName}</p>
              </div>
              <div className="neo-inset min-w-28 rounded-[18px] px-4 py-3 text-right">
                <p className="text-2xl font-black text-[#c18dfb]">{completion}%</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#707683]">Complete</p>
              </div>
            </div>
            <p className="mt-7 max-w-2xl text-sm leading-6 text-[#8b919d]">{profile.bio || "Your producer biography has not been added yet."}</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="neo-inset flex items-center gap-3 rounded-[18px] p-4"><TagIcon className="size-5 text-[#aa70f7]" /><div><p className="text-xs font-bold text-[#dcd9e1]">{profile.genreIds.length} connected</p><p className="mt-0.5 text-[10px] text-[#737986]">Genres</p></div></div>
              <div className="neo-inset flex items-center gap-3 rounded-[18px] p-4"><StoreIcon className="size-5 text-[#aa70f7]" /><div className="min-w-0"><p className="truncate text-xs font-bold text-[#dcd9e1]">{profile.storefrontName}</p><p className="mt-0.5 text-[10px] text-[#737986]">Storefront</p></div></div>
            </div>
          </NeumorphicSurface>

          <NeumorphicSurface className="rounded-[28px] p-6 sm:p-8">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#777d89]">Quick paths</p>
            <div className="mt-5 space-y-3">
              {[
                ["Tracks", "/studio/tracks", "Catalog UI is the next milestone."],
                ["Contracts", "/studio/contracts", "Commercial terms remain model-only."],
                ["Producer Profile", "/studio/profile", "Profile editing is not active yet."],
              ].map(([label, href, detail]) => (
                <Link key={href} href={href} className="dashboard-quick-link neo-inset flex items-center gap-3 rounded-[18px] p-4">
                  <DiscIcon className="size-5 shrink-0 text-[#a875f5]" />
                  <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-[#dfdce4]">{label}</span><span className="mt-0.5 block truncate text-[10px] text-[#707683]">{detail}</span></span>
                  <ArrowRightIcon className="size-4 shrink-0 text-[#777d89]" />
                </Link>
              ))}
            </div>
          </NeumorphicSurface>
        </div>
      ) : (
        <NeumorphicSurface className="max-w-3xl rounded-[28px] p-7 sm:p-9">
          <StoreIcon className="size-8 text-[#b47af8]" />
          <h3 className="mt-5 text-xl font-extrabold text-[#ece9f0]">Producer profile setup is incomplete</h3>
          <p className="mt-3 text-sm leading-6 text-[#858b97]">Your account has producer access, but no ProducerProfile record was found. No placeholder profile has been fabricated.</p>
        </NeumorphicSurface>
      )}
    </div>
  );
}

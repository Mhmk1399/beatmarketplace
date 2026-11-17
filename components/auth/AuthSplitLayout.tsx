import type { ReactNode } from "react";

import { AuthVisual } from "@/components/auth/AuthVisual";
import { PublicShell } from "@/components/public/PublicShell";

export function AuthSplitLayout({ children, mode }: { children: ReactNode; mode: "login" | "signup" }) {
  return (
    <PublicShell showFooter={false}>
      <section className="px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[38px] bg-ink/[0.055] lg:grid-cols-[1.03fr_.97fr] lg:items-stretch">
          <div className="hidden p-4 lg:block">
            <AuthVisual mode={mode} />
          </div>
          <div className="flex items-center justify-center px-3 py-10 sm:px-8 lg:px-12 lg:py-16">
            <div className="w-full max-w-[31rem]">{children}</div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

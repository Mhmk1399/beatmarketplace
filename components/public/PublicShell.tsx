import type { ReactNode } from "react";

import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicNavbar } from "@/components/public/PublicNavbar";

export function PublicShell({ children, showFooter = true }: { children: ReactNode; showFooter?: boolean }) {
  return (
    <div className="page-shell flex min-h-screen flex-col">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      {showFooter && <PublicFooter />}
    </div>
  );
}

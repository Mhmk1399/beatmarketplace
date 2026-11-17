import type { ReactNode } from "react";

import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicNavbar } from "@/components/public/PublicNavbar";

export function PublicShell({ children, showFooter = true, overlayNavbar = false }: { children: ReactNode; showFooter?: boolean; overlayNavbar?: boolean }) {
  return (
    <div className="page-shell flex min-h-screen flex-col">
      <PublicNavbar overlay={overlayNavbar} />
      <main className="flex-1">{children}</main>
      {showFooter && <PublicFooter />}
    </div>
  );
}

import type { ReactNode } from "react";

import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicNavbar } from "@/components/public/PublicNavbar";
import styles from "./PublicShell.module.css";

export function PublicShell({ children, showFooter = true, overlayNavbar = false }: { children: ReactNode; showFooter?: boolean; overlayNavbar?: boolean }) {
  return (
    <div className="page-shell flex min-h-screen flex-col">
      <a href="#main-content" className={styles.skip}>Skip to main content</a>
      <PublicNavbar overlay={overlayNavbar} />
      <main id="main-content" tabIndex={-1} className="flex-1">{children}</main>
      {showFooter && <PublicFooter />}
    </div>
  );
}

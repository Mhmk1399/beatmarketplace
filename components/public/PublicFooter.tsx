import Link from "next/link";

import { BrandMark } from "@/components/public/BrandMark";
import { ArrowRightIcon, MusicNoteIcon, ShieldIcon } from "@/components/ui/icons";
import styles from "./PublicFooter.module.css";

const groups = [
  { label: "Find your sound", links: [{ label: "All beats", href: "/marketplace" }, { label: "Producers", href: "/producers" }, { label: "Live offers", href: "/discounts" }, { label: "Browse by genre", href: "/#explore-genres" }, { label: "Browse by mood", href: "/moods" }, { label: "Browse by instrument", href: "/instruments" }, { label: "Listening demos", href: "/#listening-room" }] },
  { label: "Make it yours", links: [{ label: "Producer Studio", href: "/#producer" }, { label: "How it works", href: "/#how-it-works" }, { label: "Licensing & downloads", href: "/#beat-questions" }, { label: "My purchases", href: "/dashboard/orders" }] },
  { label: "Stay connected", links: [{ label: "About us", href: "/about" }, { label: "Contact & support", href: "/contact" }, { label: "Sign in", href: "/login" }, { label: "Create an account", href: "/signup" }] },
];

export function PublicFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.panel}>
        <div className={styles.grid}>
          <div className={styles.brand}><BrandMark /><p>A home for original sound, independent producers, and the releases they inspire.</p><Link href="/marketplace" className={styles.browse}><MusicNoteIcon />Find your next sound<ArrowRightIcon /></Link></div>
          {groups.map(group=><nav key={group.label} aria-label={group.label}><h2>{group.label}</h2>{group.links.map(item=><Link href={item.href} prefetch={false} key={item.href}>{item.label}</Link>)}</nav>)}
        </div>
        <div className={styles.bottom}><p><ShieldIcon />Prices in toman · Producer-defined licenses · WAV after verified payment</p><span>© {new Date().getFullYear()} BeatMarketplace</span></div>
      </div>
    </footer>
  );
}

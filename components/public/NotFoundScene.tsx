import Image from "next/image";
import { NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { ArrowRightIcon, MusicNoteIcon, SearchIcon, UsersIcon } from "@/components/ui/icons";

function HomeIcon() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m3.5 10 8.5-7 8.5 7M6 8.5V21h12V8.5M10 21v-7h4v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function HeadphonesIcon() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 14v-3a8 8 0 1 1 16 0v3M4 12H3v7h4v-7H4Zm16 0h1v7h-4v-7h3Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function SupportWaveIcon() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 12h4l2-7 3 14 3-16 3 13 2-4h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>; }

const shortcuts = [
  { label: "Marketplace", href: "/marketplace", Icon: HeadphonesIcon },
  { label: "Producers", href: "/producers", Icon: UsersIcon },
  { label: "Genres", href: "/#explore-genres", Icon: MusicNoteIcon },
  { label: "Support", href: "/contact#contact-form", Icon: SupportWaveIcon },
];

export function NotFoundScene() {
  return <section className="not-found-scene" aria-labelledby="not-found-title">
    <div className="not-found-art" aria-hidden="true">
      <picture>
        <source media="(max-width: 640px)" srcSet="/assets/not-found/studio-mobile-small.webp 480w, /assets/not-found/studio-mobile.webp 960w" sizes="100vw" type="image/webp" />
        <source srcSet="/assets/not-found/studio-medium.webp 1100w, /assets/not-found/studio.webp 1586w" sizes="100vw" type="image/webp" />
        <Image src="/assets/not-found/studio.webp" alt="" width={1586} height={992} unoptimized loading="eager" fetchPriority="high" />
      </picture>
    </div>
    <div className="not-found-content">
      <h1 id="not-found-title"><span className="sr-only">404 — </span>Page Not <span className="not-found-highlight">Found</span></h1>
      <p className="not-found-description"><span>Looks like this beat went off track.</span><span>The page you’re looking for doesn’t exist or has been moved.</span></p>
      <div className="not-found-actions">
        <NeumorphicLink href="/" variant="accent" prefetch={false}><HomeIcon />Back to Home<ArrowRightIcon /></NeumorphicLink>
        <NeumorphicLink href="/marketplace" prefetch={false} className="not-found-browse"><SearchIcon />Browse Beats</NeumorphicLink>
      </div>
      <nav className="not-found-explore" aria-label="Find your way back">
        <p className="not-found-divider"><span>Or explore</span></p>
        <div className="not-found-shortcuts">{shortcuts.map(({ label, href, Icon }) => <NeumorphicLink key={label} href={href} prefetch={false} className="not-found-shortcut"><Icon /><span>{label}</span></NeumorphicLink>)}</div>
      </nav>
    </div>
  </section>;
}

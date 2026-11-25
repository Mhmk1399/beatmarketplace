"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useId, useRef, type MouseEvent } from "react";

import { useAuth, type CurrentUser } from "@/components/auth/AuthProvider";
import { BrandMark } from "@/components/public/BrandMark";
import { CartIcon, CloseIcon, DiscIcon, StoreIcon, TagIcon, UsersIcon } from "@/components/ui/icons";
import { NeumorphicButton, NeumorphicLink } from "@/components/ui/neumorphic/Button";

type MobileNavProps = {
  id: string;
  pathname: string;
  cartCount: number;
  user: CurrentUser | null;
  status: "loading" | "authenticated" | "anonymous";
  onClose: () => void;
};

/** A native modal lives above sticky headers and the persistent audio dock. */
export function PublicMobileNav({ id, pathname, cartCount, user, status, onClose }: MobileNavProps) {
  const { requestLogout, isLoggingOut } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const desktop = window.matchMedia("(min-width: 1100px)");
    if (desktop.matches) { onClose(); return; }
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!dialog.open) dialog.showModal();
    closeRef.current?.focus({ preventScroll: true });

    function resize(event: MediaQueryListEvent) { if (event.matches) onClose(); }
    function containFocus(event: KeyboardEvent) {
      if (event.key !== "Tab" || event.defaultPrevented) return;
      const controls = Array.from(dialog!.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])"))
        .filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) { event.preventDefault(); dialog!.focus({ preventScroll: true }); }
      else if (!dialog!.contains(document.activeElement)) { event.preventDefault(); first.focus({ preventScroll: true }); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus({ preventScroll: true }); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus({ preventScroll: true }); }
    }
    desktop.addEventListener("change", resize);
    document.addEventListener("keydown", containFocus);
    window.addEventListener("popstate", onClose);
    window.addEventListener("hashchange", onClose);
    return () => {
      desktop.removeEventListener("change", resize);
      document.removeEventListener("keydown", containFocus);
      window.removeEventListener("popstate", onClose);
      window.removeEventListener("hashchange", onClose);
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, [onClose]);

  function backdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
  }

  if (typeof document === "undefined") return null;
  const displayName = user && (user.profile?.displayName?.trim() || `${user.firstName} ${user.lastName}`.trim() || user.profile?.username || user.email);
  return createPortal(
    <dialog ref={dialogRef} id={id} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="music-mobile-menu" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={backdrop}>
      <header className="music-mobile-menu-header">
        <BrandMark className="music-mobile-menu-brand" onClick={onClose} />
        <button ref={closeRef} type="button" className="music-menu-control" aria-label="Close navigation menu" onClick={onClose}><CloseIcon className="size-5" /></button>
        <h2 id={titleId} className="sr-only">Navigation menu</h2>
      </header>
      <div className="music-mobile-menu-content">
        {user && <div className="music-mobile-menu-user"><span aria-hidden="true">{user.firstName.charAt(0)}{user.lastName.charAt(0)}</span><div><p>Signed in as</p><strong dir="auto">{displayName}</strong></div></div>}
        <p className="music-eyebrow">Explore your sound</p>
        <nav aria-label="Mobile navigation" className="music-mobile-menu-links">
          <Link href="/" className="music-mobile-menu-link" aria-current={pathname === "/" ? "page" : undefined} onClick={onClose}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg><span>Home</span></Link>
          <Link href="/marketplace" className="music-mobile-menu-link" aria-current={pathname === "/marketplace" || pathname.startsWith("/tracks/") ? "page" : undefined} onClick={onClose}><DiscIcon /><span>Explore beats</span></Link>
          <Link href="/discounts" className="music-mobile-menu-link" aria-current={pathname === "/discounts" ? "page" : undefined} onClick={onClose}><TagIcon /><span>Live offers</span></Link>
          <Link href="/producers" className="music-mobile-menu-link" aria-current={pathname.startsWith("/producers") ? "page" : undefined} onClick={onClose}><StoreIcon /><span>Producers</span></Link>
          <Link href="/about" className="music-mobile-menu-link" aria-current={pathname === "/about" ? "page" : undefined} onClick={onClose}><UsersIcon /><span>About us</span></Link>
          <Link href="/contact" className="music-mobile-menu-link" aria-current={pathname === "/contact" ? "page" : undefined} onClick={onClose}><UsersIcon /><span>Contact us</span></Link>
          <Link href="/cart" className="music-mobile-menu-link" aria-current={pathname === "/cart" ? "page" : undefined} onClick={onClose}><CartIcon /><span>Cart</span><span className="music-cart-count">{cartCount}</span></Link>
        </nav>
        <section className="music-mobile-menu-account" aria-label="Your account">
          {status === "loading" ? <p role="status" className="text-sm text-muted">Loading your account…</p> : user ? <>
            <NeumorphicLink href="/dashboard" variant="accent" className="w-full" onClick={onClose}>Your dashboard</NeumorphicLink>
            {user.roles.includes("PRODUCER") && <Link href="/studio" className="music-mobile-menu-link" onClick={onClose}><StoreIcon /><span>Producer Studio</span></Link>}
            {user.roles.includes("ADMIN") && <Link href="/admin" className="music-mobile-menu-link" onClick={onClose}><StoreIcon /><span>Admin panel</span></Link>}
            <NeumorphicButton className="w-full" variant="quiet" disabled={isLoggingOut} onClick={() => { onClose(); requestLogout(); }}>{isLoggingOut ? "Signing out…" : "Logout"}</NeumorphicButton>
          </> : <>
            <p className="text-sm leading-6 text-muted">Keep your favorites and find your next sound.</p>
            <NeumorphicLink href="/signup" variant="accent" className="w-full" onClick={onClose}>Create account</NeumorphicLink>
            <NeumorphicLink href="/login" className="w-full" onClick={onClose}>Login</NeumorphicLink>
          </>}
        </section>
      </div>
    </dialog>, document.body,
  );
}

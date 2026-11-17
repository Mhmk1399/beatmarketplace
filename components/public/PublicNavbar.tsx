"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useId, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { BrandMark } from "@/components/public/BrandMark";
import { PublicMobileNav } from "@/components/public/PublicMobileNav";
import { DiscIcon, MenuIcon, StoreIcon, TagIcon } from "@/components/ui/icons";
import { NeumorphicButton, NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useMarketplace } from "@/components/marketplace/MarketplaceProvider";

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function PublicNavbar({ overlay = false }: { overlay?: boolean }) {
  const { logout, status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const { cart } = useMarketplace();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      toast.success("Signed out", "Your session has been cleared.");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Could not sign out", "Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  }

  const exploreActive = pathname === "/marketplace" || pathname.startsWith("/tracks/");
  return (
    <><header className={`music-navbar ${overlay ? "fixed inset-x-0 w-screen" : "sticky"} top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-5`}>
      <nav aria-label="Primary navigation" className="music-nav-shell mx-auto max-w-7xl">
        <BrandMark className="music-nav-brand shrink-0" />
        <div className="music-nav-links">
          <Link href="/marketplace" className="music-nav-link" aria-current={exploreActive ? "page" : undefined}>
            <DiscIcon className="size-4" /> Explore
          </Link>
          <Link href="/discounts" className="music-nav-link" aria-current={pathname === "/discounts" ? "page" : undefined}>
            <TagIcon className="size-4" /> Live offers
          </Link>
          <Link href="/#producer" className="music-nav-link">For producers</Link>
          <Link href="/cart" className="music-nav-link music-nav-cart-link" aria-current={pathname === "/cart" ? "page" : undefined}>
            <StoreIcon className="size-4" /><span>Cart</span><span className="music-cart-count">{cart.length}</span>
          </Link>
        </div>

        <div className="music-nav-mobile-actions">
          <Link href="/cart" className="music-nav-cart-mobile" aria-label={`View cart, ${cart.length} ${cart.length === 1 ? "item" : "items"}`} aria-current={pathname === "/cart" ? "page" : undefined}>
            <StoreIcon className="size-5" />{cart.length > 0 && <span>{cart.length}</span>}
          </Link>
          <button type="button" className="music-menu-control" aria-label="Open navigation menu" aria-expanded={menuOpen} aria-controls={menuId} aria-haspopup="dialog" onClick={() => setMenuOpen(true)}><MenuIcon className="size-5" /></button>
        </div>
        <div className="music-nav-account music-nav-account-desktop">
          {status === "loading" ? (
            <div className="neo-inset h-10 w-24 animate-pulse rounded-[var(--radius-control)]" aria-label="Loading session" />
          ) : user ? (
            <>
              <span className="music-nav-avatar hidden sm:flex" aria-label={user.profile?.displayName || user.firstName}>
                {getInitials(user.firstName, user.lastName)}
              </span>
              <NeumorphicLink href="/dashboard" size="sm" className="px-3">
                <span className="sm:hidden">App</span><span className="hidden sm:inline">Dashboard</span>
              </NeumorphicLink>
              <NeumorphicButton size="sm" variant="quiet" className="px-3" onClick={handleLogout} disabled={isLoggingOut}>
                {isLoggingOut ? "Leaving…" : "Logout"}
              </NeumorphicButton>
            </>
          ) : (
            <>
              <NeumorphicLink href="/login" variant="quiet" size="sm" className="px-3 sm:px-4">Login</NeumorphicLink>
              <NeumorphicLink href="/signup" variant="accent" size="sm" className="px-3 sm:px-4">
                <span className="sm:hidden">Join</span><span className="hidden sm:inline">Join the music</span>
              </NeumorphicLink>
            </>
          )}
        </div>
      </nav>
    </header>
    {menuOpen && <PublicMobileNav id={menuId} pathname={pathname} cartCount={cart.length} user={user} status={status} isLoggingOut={isLoggingOut} onClose={closeMenu} onLogout={handleLogout} />}</>
  );
}

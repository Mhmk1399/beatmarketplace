"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useId, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { BrandMark } from "@/components/public/BrandMark";
import { PublicMobileNav } from "@/components/public/PublicMobileNav";
import { PublicAccountMenu } from "@/components/public/PublicAccountMenu";
import { CartIcon, DiscIcon, MenuIcon, TagIcon, UserIcon } from "@/components/ui/icons";
import { NeumorphicLink } from "@/components/ui/neumorphic/Button";
import { useMarketplace } from "@/components/marketplace/MarketplaceProvider";
import { GlobalSearch } from "@/components/search/GlobalSearch";

export function PublicNavbar({ overlay = false }: { overlay?: boolean }) {
  const { status, user } = useAuth();
  const pathname = usePathname();
  const { cart } = useMarketplace();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const closeMenu = useCallback(() => setMenuOpen(false), []);

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
          <Link href="/producers" className="music-nav-link" aria-current={pathname.startsWith("/producers") ? "page" : undefined}>Producers</Link>
          <Link href="/about" className="music-nav-link" aria-current={pathname === "/about" ? "page" : undefined}>About us</Link>
          <Link href="/contact" className="music-nav-link" aria-current={pathname === "/contact" ? "page" : undefined}>Contact</Link>
        </div>

        <div className="music-nav-actions">
          <GlobalSearch />
          <NeumorphicLink href="/cart" variant={pathname === "/cart" ? "accent" : "default"} size="sm" className="music-nav-cart" aria-label={`View cart, ${cart.length} ${cart.length === 1 ? "item" : "items"}`} aria-current={pathname === "/cart" ? "page" : undefined}>
            <CartIcon className="size-5" />{cart.length > 0 && <span aria-hidden="true">{cart.length}</span>}
          </NeumorphicLink>
        <div className="music-nav-account">
          {status === "loading" ? (
            <div className="music-nav-account-compact neo-inset h-11 w-20 animate-pulse rounded-[var(--radius-control)]" role="status" aria-label="Loading session" />
          ) : user ? (
            <PublicAccountMenu key={`${user.id}:${pathname}`} user={user} />
          ) : (
            <>
              <NeumorphicLink href="/login" size="sm" className="music-nav-login-icon music-nav-account-compact" aria-label="Log in">
                <UserIcon className="size-5" />
              </NeumorphicLink>
              <div className="music-nav-guest">
                <NeumorphicLink href="/login" variant="quiet" size="sm" className="px-3 sm:px-4">Login</NeumorphicLink>
                <NeumorphicLink href="/signup" variant="accent" size="sm" className="px-3 sm:px-4">Join the music</NeumorphicLink>
              </div>
            </>
          )}
        </div>
        <div className="music-nav-mobile-actions"><button type="button" className="music-menu-control" aria-label="Open navigation menu" aria-expanded={menuOpen} aria-controls={menuId} aria-haspopup="dialog" onClick={() => setMenuOpen(true)}><MenuIcon className="size-5" /></button></div>
        </div>
      </nav>
    </header>
    {menuOpen && <PublicMobileNav id={menuId} pathname={pathname} cartCount={cart.length} user={user} status={status} onClose={closeMenu} />}</>
  );
}

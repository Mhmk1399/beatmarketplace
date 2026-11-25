"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { useAuth, type CurrentUser } from "@/components/auth/AuthProvider";
import { ChevronDownIcon, GridIcon, LogOutIcon, ShieldIcon, StoreIcon, UserIcon } from "@/components/ui/icons";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import styles from "./PublicAccountMenu.module.css";

export function PublicAccountMenu({ user }: { user: CurrentUser }) {
  const { requestLogout, isLoggingOut } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const focusLast = useRef(false);
  const menuId = useId();
  const triggerId = useId();
  const name = user.profile?.displayName?.trim() || `${user.firstName} ${user.lastName}`.trim() || user.profile?.username || user.email;
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() || "BM";

  useEffect(() => {
    if (!open) return;
    const items = menuRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']");
    (focusLast.current ? items?.[items.length - 1] : items?.[0])?.focus({ preventScroll: true });
    function dismiss(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function history() { setOpen(false); }
    document.addEventListener("pointerdown", dismiss);
    window.addEventListener("popstate", history);
    window.addEventListener("hashchange", history);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("popstate", history);
      window.removeEventListener("hashchange", history);
    };
  }, [open]);

  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (!open) {
      focusLast.current = event.key === "ArrowUp" || event.key === "End";
      setOpen(true);
      return;
    }
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']:not(:disabled)") ?? []);
    const current = items.findIndex(item => item === document.activeElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (current + (event.key === "ArrowUp" ? -1 : 1) + items.length) % items.length;
    items[next]?.focus();
  }

  return <div ref={rootRef} className={styles.root} onKeyDown={keyboard} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <NeumorphicButton ref={triggerRef} id={triggerId} className={`${styles.trigger} music-nav-account-compact`} aria-label={`Account menu for ${name}`} aria-expanded={open} aria-haspopup="menu" aria-controls={open ? menuId : undefined} onClick={() => { focusLast.current = false; setOpen(current => !current); }}>
      <UserIcon className={styles.mobileIcon} />
      <span className={styles.avatar} aria-hidden="true">{initials}</span>
      <span className={styles.name} dir="auto">{name}</span>
      <ChevronDownIcon className={styles.chevron} />
    </NeumorphicButton>
    {open && <div ref={menuRef} id={menuId} role="menu" aria-labelledby={triggerId} className={`neo-raised-strong ${styles.menu}`}>
      <div className={styles.identity} role="presentation"><p dir="auto">{name}</p><span>{user.email}</span></div>
      <Link prefetch={false} role="menuitem" href="/dashboard" className={styles.item} onClick={() => setOpen(false)}><GridIcon />Dashboard</Link>
      {user.roles.includes("PRODUCER") && <Link prefetch={false} role="menuitem" href="/studio" className={styles.item} onClick={() => setOpen(false)}><StoreIcon />Producer Studio</Link>}
      {user.roles.includes("ADMIN") && <Link prefetch={false} role="menuitem" href="/admin" className={styles.item} onClick={() => setOpen(false)}><ShieldIcon />Admin panel</Link>}
      <button role="menuitem" type="button" disabled={isLoggingOut} className={`${styles.item} ${styles.logout}`} onClick={() => { setOpen(false); triggerRef.current?.focus(); requestLogout(); }}><LogOutIcon />Logout</button>
    </div>}
  </div>;
}

import { Cart } from "@/components/marketplace/Cart";
import { PublicShell } from "@/components/public/PublicShell";
export default function CartPage() { return <PublicShell><main className="mx-auto max-w-7xl space-y-9 px-5 py-12 sm:py-20"><header><p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--accent-text)]">Your next release</p><h1 className="mt-4 text-4xl font-black">Your cart.</h1><p className="mt-4 text-[var(--muted)]">One beat, the right license, your own sound.</p></header><Cart /></main></PublicShell>; }

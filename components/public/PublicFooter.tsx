import Link from "next/link";

import { BrandMark } from "@/components/public/BrandMark";

export function PublicFooter() {
  return (
    <footer className="px-5 pb-8 pt-14 sm:pt-20">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 border-t border-white/[0.045] pt-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-sm space-y-4">
          <BrandMark />
          <p className="text-sm leading-6 text-[#858a96]">A home for original sound, independent producers, and the releases they inspire.</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-[#858a96]">
          <Link href="/" className="transition-colors hover:text-white">Home</Link>
          <Link href="/login" className="transition-colors hover:text-white">Login</Link>
          <Link href="/signup" className="transition-colors hover:text-white">Create account</Link>
          <span className="text-[#5f646f]">© {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}

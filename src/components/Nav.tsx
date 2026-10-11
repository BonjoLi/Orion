import Link from "next/link";
import { Logo } from "@/components/Logo";

export function Nav() {
  return (
    <header className="h-16 border-b border-white/10">
      <nav className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-wide">
          <Logo className="h-8 w-8" />
          Orion
        </Link>
        <div className="flex gap-6 text-sm text-slate-300">
          <Link href="/map" className="hover:text-white">
            Map
          </Link>
          <Link href="/about" className="hover:text-white">
            About
          </Link>
        </div>
      </nav>
    </header>
  );
}

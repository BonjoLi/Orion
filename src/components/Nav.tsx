import Link from "next/link";

export function Nav() {
  return (
    <header className="h-16 border-b border-white/10">
      <nav className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="font-semibold tracking-wide">
          Orion
        </Link>
        <div className="flex gap-6 text-sm text-slate-300">
          <Link href="/map" className="hover:text-white">
            Map
          </Link>
          {/* TODO(landing owner): add About once that page exists */}
        </div>
      </nav>
    </header>
  );
}

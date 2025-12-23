import Link from "next/link";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/webhooks", label: "Webhooks" },
  { href: "/signals", label: "Signals" },
  { href: "/trades", label: "Trades" },
  { href: "/pnl", label: "P&L" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/settings", label: "Settings" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-semibold">
              OrbStrat Trader
            </Link>
            <nav className="hidden flex-wrap gap-3 text-sm text-zinc-700 md:flex">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="hover:underline">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
    </div>
  );
}



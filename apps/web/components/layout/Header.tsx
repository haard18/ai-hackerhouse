import Link from "next/link";

const NAV = [
  { key: "live", href: "/", label: "Live" },
  { key: "leaderboard", href: "/leaderboard", label: "Leaderboard" },
  { key: "models", href: "/models", label: "Models" },
  { key: "portfolio", href: "/portfolio", label: "Portfolio" },
] as const;

interface HeaderProps {
  activeNav: (typeof NAV)[number]["key"];
}

export function Header({ activeNav }: HeaderProps) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-logo">
          AI Trading Arena<span>by hackerhouse</span>
        </Link>
        <nav className="site-nav">
          {NAV.map(({ key, href, label }) => (
            <Link
              key={key}
              href={href}
              className={activeNav === key ? "active" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <Link href="/portfolio" className="site-cta">
          Get $50 Paper ↗
        </Link>
      </div>
    </header>
  );
}

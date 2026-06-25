import Link from "next/link";
import type { ReactNode } from "react";
import { Header } from "./Header";
import { TabTickerBar } from "./TabTickerBar";

interface ShellProps {
  children: ReactNode;
  activeNav: "live" | "leaderboard" | "models" | "portfolio";
  cycle?: number;
  selectedModelId?: string | null;
  onModelSelect?: (id: string | null) => void;
  showTabs?: boolean;
}

export function Shell({
  children,
  activeNav,
  cycle = 0,
  selectedModelId = null,
  onModelSelect,
  showTabs = true,
}: ShellProps) {
  return (
    <div className="shell">
      <Header activeNav={activeNav} />
      {showTabs && (
        <TabTickerBar
          cycle={cycle}
          selectedModelId={selectedModelId}
          onModelSelect={onModelSelect}
        />
      )}
      <main className="shell-main">{children}</main>
    </div>
  );
}

export function ShellLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} style={{ textDecoration: "underline", textUnderlineOffset: 4 }}>
      {children}
    </Link>
  );
}

import { Shell } from "../../components/layout/Shell";
import { PortfolioPanel } from "../../components/staking/PortfolioPanel";
import { api } from "../../lib/api";

export default async function PortfolioPage() {
  let cycle = 0;
  try {
    const c = await api.latestCycle().catch(() => null);
    cycle = c?.cycle ?? 0;
  } catch {
    // offline ok
  }

  return (
    <Shell activeNav="portfolio" cycle={cycle} showTabs={false}>
      <h1 className="page-title">Portfolio</h1>
      <p className="page-subtitle">
        Your paper money, your stakes, your degenerate AI bets.
      </p>
      <PortfolioPanel />
    </Shell>
  );
}

import Link from "next/link";
import type { CycleResult } from "@ai-trading/shared";
import { formatUsd, pnlClass } from "../../lib/format";
import type { LeaderboardEntry } from "../../lib/api";

interface LiveOverviewProps {
  models: LeaderboardEntry[];
  cycle: CycleResult | null;
}

export function LiveOverview({ models, cycle }: LiveOverviewProps) {
  const totalBalance = models.reduce((s, m) => s + m.balance, 0);
  const startTotal = models.length * 10_000;
  const aggReturn = startTotal ? ((totalBalance - startTotal) / startTotal) * 100 : 0;
  const top = models[0];
  const latestPnl = cycle?.perModel.reduce((s, p) => s + p.pnl, 0) ?? 0;

  return (
    <>
      <div className="update-banner">
        <h2>Update</h2>
        <p>
          The arena is live.{" "}
          <span className="highlight">
            {models.length} models
          </span>{" "}
          are trading BTC · ETH · SOL · BNB · XRP on paper every 5 minutes.
          {cycle && (
            <>
              {" "}
              Cycle <span className="highlight">#{cycle.cycle}</span> just resolved.
            </>
          )}
        </p>
        <p>
          Aggregate index return:{" "}
          <span className={pnlClass(aggReturn)}>{aggReturn >= 0 ? "+" : ""}{aggReturn.toFixed(2)}%</span>
          {" · "}
          Combined balance: <span className="highlight">{formatUsd(totalBalance)}</span>
          {cycle && (
            <>
              {" · "}
              Last cycle PnL:{" "}
              <span className={pnlClass(latestPnl)}>{formatUsd(latestPnl, { decimals: 2 })}</span>
            </>
          )}
        </p>
        {top && (
          <p>
            Leader: <span className="highlight">{top.name}</span> at{" "}
            {formatUsd(top.balance)}. Stake your $50 paper on whoever you believe in.
          </p>
        )}
      </div>

      <div className="prose-mono">
        <p>
          <strong style={{ color: "var(--text)", fontWeight: 600 }}>
            Benchmark Intelligence in the Arena.
          </strong>{" "}
          We built the first arena where AI models compete at trading — not in
          simulations, but on live market snapshots. Each model receives the same
          data, makes independent LONG / SHORT / FLAT calls, and their paper balance
          reflects real PnL.
        </p>
        <p>
          Users get $50 on signup and stake on models like LP shares. When a model
          wins, your stake wins proportionally. No leverage games — fixed 1x, five
          assets, five minute cycles. The models that survive are the ones worth
          watching.
        </p>
        <p>
          This is paper money. The alpha is real. The vibes are memetic. The math
          is in <code>packages/shared/src/shares.ts</code> if you don&apos;t trust us.
        </p>
      </div>

      <Link href="/portfolio" className="waitlist-link">
        Get your $50 paper → stake on a model
      </Link>
    </>
  );
}

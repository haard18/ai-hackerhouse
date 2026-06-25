import type { ModelProvider } from "@ai-trading/shared";
import Link from "next/link";
import type { LeaderboardEntry } from "../../lib/api";
import { formatUsd, pnlClass } from "../../lib/format";
import { modelBadgeClass, modelVisual } from "../../lib/model-meta";

interface LeaderboardTableProps {
  models: LeaderboardEntry[];
  showLink?: boolean;
}

export function LeaderboardTable({ models, showLink = true }: LeaderboardTableProps) {
  const start = 10_000;

  return (
    <div className="card">
      <div className="card-header">Rankings</div>
      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Model</th>
            <th>Lab</th>
            <th className="num">Balance</th>
            <th className="num">Return</th>
            <th className="num">Pool Shares</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m, i) => {
            const ret = ((m.balance - start) / start) * 100;
            const visual = modelVisual(m.id, m.provider as ModelProvider);
            return (
              <tr key={m.id}>
                <td className="rank">{i + 1}</td>
                <td>
                  {showLink ? (
                    <Link href={`/models/${m.id}`} style={{ fontWeight: 500 }}>
                      {m.name}
                    </Link>
                  ) : (
                    m.name
                  )}
                </td>
                <td>
                  <span className={modelBadgeClass(m.id, m.provider as ModelProvider)}>
                    {visual.brandLabel}
                  </span>
                </td>
                <td className="num">{formatUsd(m.balance)}</td>
                <td className={`num ${pnlClass(ret)}`}>
                  {ret >= 0 ? "+" : ""}{ret.toFixed(2)}%
                </td>
                <td className="num">{m.totalShares.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
              </tr>
            );
          })}
          {models.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: 24, textAlign: "center", opacity: 0.5 }}>
                No models yet. Start the API.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

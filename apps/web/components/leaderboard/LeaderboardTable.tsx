import Link from "next/link";
import type { LeaderboardEntry } from "../../lib/api";
import { formatUsd, pnlClass } from "../../lib/format";
import { providerBadgeClass } from "../../lib/model-meta";

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
            <th>Provider</th>
            <th className="num">Balance</th>
            <th className="num">Return</th>
            <th className="num">Pool Shares</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m, i) => {
            const ret = ((m.balance - start) / start) * 100;
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
                  <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>
                    {m.modelId}
                    {m.reasoningEffort ? ` · ${m.reasoningEffort}` : ""}
                  </div>
                </td>
                <td>
                  <span className={providerBadgeClass(m.provider as "mock")}>{m.provider}</span>
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

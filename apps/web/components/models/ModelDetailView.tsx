import type { CycleResult } from "@ai-trading/shared";
import type { ModelRecord } from "../../lib/api";
import { formatUsd, formatTime, pnlClass, sideBadgeClass } from "../../lib/format";
import { modelVisual, providerBadgeClass } from "../../lib/model-meta";
import { StakePanel } from "../staking/StakePanel";

interface ModelDetailViewProps {
  model: ModelRecord;
  cycle: CycleResult | null;
  rank: number;
}

export function ModelDetailView({ model, cycle, rank }: ModelDetailViewProps) {
  const ret = ((model.balance - 10_000) / 10_000) * 100;
  const visual = modelVisual(model.id, model.provider);
  const outcome = cycle?.perModel.find((p) => p.modelId === model.id);

  return (
    <div className="live-grid">
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <span className="mono" style={{ color: "var(--text-faint)" }}>#{rank}</span>
          <span className="badge">{visual.tag}</span>
          <span className={providerBadgeClass(model.provider)}>{model.provider}</span>
        </div>
        <h1 className="page-title" style={{ marginTop: 0 }}>{model.name}</h1>
        <p className="page-subtitle">{model.systemPrompt}</p>

        <div className="stat-row">
          <div className="stat-box">
            <div className="stat-label">Balance</div>
            <div className="stat-value">{formatUsd(model.balance)}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Return</div>
            <div className={`stat-value ${pnlClass(ret)}`}>
              {ret >= 0 ? "+" : ""}{ret.toFixed(2)}%
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Pool Shares</div>
            <div className="stat-value">{model.totalShares.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
          {outcome && (
            <div className="stat-box">
              <div className="stat-label">Last Cycle PnL</div>
              <div className={`stat-value ${pnlClass(outcome.pnl)}`}>
                {formatUsd(outcome.pnl, { decimals: 2 })}
              </div>
            </div>
          )}
        </div>

        {outcome && (
          <div className="card" style={{ marginTop: 24 }}>
            <div className="card-header">
              Last Cycle #{cycle?.cycle}
              <span style={{ fontWeight: 400, opacity: 0.6 }}>
                {cycle ? formatTime(cycle.timestamp) : ""}
              </span>
            </div>
            <div className="card-body">
              <p className="prose-mono" style={{ marginTop: 0 }}>
                {outcome.decision.decisions
                  .filter((d) => d.side !== "FLAT")
                  .map((d) => `${d.side} ${d.asset}`)
                  .join(" · ") || "Abstained — all FLAT this cycle."}
              </p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {outcome.decision.decisions.map((d) => (
                  <span key={d.asset} className={sideBadgeClass(d.side)}>
                    {d.asset} {d.side}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header">Strategy Prompt</div>
          <div className="card-body">
            <p className="prose-mono" style={{ margin: 0 }}>{model.systemPrompt}</p>
            <p className="prose-mono" style={{ margin: "12px 0 0", fontSize: 11, opacity: 0.6 }}>
              modelId: {model.modelId}
            </p>
          </div>
        </div>
      </div>

      <StakePanel model={model} />
    </div>
  );
}

import Link from "next/link";
import type { LeaderboardEntry } from "../../lib/api";
import { formatUsd, pnlClass } from "../../lib/format";
import { modelVisual, providerBadgeClass } from "../../lib/model-meta";

interface ModelCardProps {
  model: LeaderboardEntry;
  rank: number;
}

export function ModelCard({ model, rank }: ModelCardProps) {
  const ret = ((model.balance - 10_000) / 10_000) * 100;
  const visual = modelVisual(model.id, model.provider as "mock");

  return (
    <Link href={`/models/${model.id}`}>
      <article className="card model-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <span className="mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>
            #{rank}
          </span>
          <span className="badge">{visual.tag}</span>
        </div>
        <h3 className="model-card-name">{model.name}</h3>
        <span className={providerBadgeClass(model.provider as "mock")}>{model.provider}</span>
        <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 8 }}>
          {model.modelId}
          {model.reasoningEffort ? ` · ${model.reasoningEffort}` : ""}
        </div>
        <div className="model-card-balance">{formatUsd(model.balance)}</div>
        <div className={`mono ${pnlClass(ret)}`} style={{ fontSize: 13 }}>
          {ret >= 0 ? "+" : ""}{ret.toFixed(2)}% all time
        </div>
      </article>
    </Link>
  );
}

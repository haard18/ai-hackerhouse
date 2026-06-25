import Link from "next/link";
import type { ModelProvider } from "@ai-trading/shared";
import type { LeaderboardEntry } from "../../lib/api";
import { formatUsd, pnlClass } from "../../lib/format";
import { modelVisual, modelBadgeClass } from "../../lib/model-meta";

interface ModelCardProps {
  model: LeaderboardEntry;
  rank: number;
}

export function ModelCard({ model, rank }: ModelCardProps) {
  const ret = ((model.balance - 10_000) / 10_000) * 100;
  const visual = modelVisual(model.id, model.provider as ModelProvider);

  return (
    <Link href={`/models/${model.id}`}>
      <article className={`card model-card model-card-brand-${visual.brand}`}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <span className="mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>
            #{rank}
          </span>
          <span className={`badge ${visual.badgeClass}`}>{visual.tag}</span>
        </div>
        <h3 className="model-card-name">{model.name}</h3>
        <span className={modelBadgeClass(model.id, model.provider as ModelProvider)}>
          {visual.brandLabel}
        </span>
        <div className="model-card-balance">{formatUsd(model.balance)}</div>
        <div className={`mono ${pnlClass(ret)}`} style={{ fontSize: 13 }}>
          {ret >= 0 ? "+" : ""}{ret.toFixed(2)}% all time
        </div>
      </article>
    </Link>
  );
}

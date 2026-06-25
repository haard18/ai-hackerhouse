"use client";

import { ASSETS, type ModelProvider, type PositionSide } from "@ai-trading/shared";
import type { CycleResult } from "@ai-trading/shared";
import type { LeaderboardEntry } from "../../lib/api";
import { modelVisual } from "../../lib/model-meta";

interface PositionHeatmapProps {
  models: LeaderboardEntry[];
  cycle: CycleResult | null;
}

function cellClass(side: PositionSide) {
  if (side === "LONG") return "heatmap-cell long";
  if (side === "SHORT") return "heatmap-cell short";
  return "heatmap-cell flat";
}

export function PositionHeatmap({ models, cycle }: PositionHeatmapProps) {
  const modelById = Object.fromEntries(models.map((m) => [m.id, m]));

  const rows = cycle?.perModel ?? models.map((m) => ({
    modelId: m.id,
    decision: {
      decisions: ASSETS.map((a) => ({ asset: a, side: "FLAT" as PositionSide })),
    },
  }));

  return (
    <div className="heatmap-grid">
      <div className="heatmap-header">
        <span className="heatmap-label">Model</span>
        {ASSETS.map((a) => (
          <span key={a} className="heatmap-cell flat" style={{ cursor: "default", fontSize: 9 }}>
            {a}
          </span>
        ))}
      </div>
      {rows.map((p) => {
        const model = modelById[p.modelId];
        const visual = modelVisual(
          p.modelId,
          (model?.provider ?? "mock") as ModelProvider,
        );
        const label = model?.name.split(" ")[0] ?? p.modelId;
        return (
        <div key={p.modelId} className="heatmap-row">
          <span className={`heatmap-label heatmap-label-brand-${visual.brand}`}>{label}</span>
          {p.decision.decisions.map((d) => (
            <span
              key={d.asset}
              className={cellClass(d.side)}
              title={`${label} · ${d.asset} · ${d.side}`}
            >
              {d.side === "FLAT" ? "—" : d.side.slice(0, 1)}
            </span>
          ))}
        </div>
        );
      })}
    </div>
  );
}

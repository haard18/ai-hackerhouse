"use client";

import { ASSETS, type PositionSide } from "@ai-trading/shared";
import type { CycleResult } from "@ai-trading/shared";
import type { LeaderboardEntry } from "../../lib/api";

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
  const nameById = Object.fromEntries(models.map((m) => [m.id, m.name.split(" ")[0]]));

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
      {rows.map((p) => (
        <div key={p.modelId} className="heatmap-row">
          <span className="heatmap-label">{nameById[p.modelId] ?? p.modelId}</span>
          {p.decision.decisions.map((d) => (
            <span
              key={d.asset}
              className={cellClass(d.side)}
              title={`${nameById[p.modelId]} · ${d.asset} · ${d.side}`}
            >
              {d.side === "FLAT" ? "—" : d.side.slice(0, 1)}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

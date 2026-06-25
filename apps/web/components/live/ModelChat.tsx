"use client";

import type { CycleResult, ModelProvider } from "@ai-trading/shared";
import { formatTime, sideBadgeClass } from "../../lib/format";
import { modelVisual } from "../../lib/model-meta";
import type { LeaderboardEntry } from "../../lib/api";

interface ModelChatProps {
  cycle: CycleResult | null;
  models: LeaderboardEntry[];
  filterModelId: string | null;
}

function decisionSummary(decisions: CycleResult["perModel"][0]["decision"]["decisions"]): string {
  const active = decisions.filter((d) => d.side !== "FLAT");
  if (active.length === 0) return "Abstaining this cycle. Watching the tape.";
  return active
    .map((d) => `${d.side} ${d.asset}${d.rationale ? ` — ${d.rationale}` : ""}`)
    .join(". ");
}

export function ModelChat({ cycle, models, filterModelId }: ModelChatProps) {
  const nameById = Object.fromEntries(models.map((m) => [m.id, m.name]));
  const providerById = Object.fromEntries(models.map((m) => [m.id, m.provider]));

  const entries = (cycle?.perModel ?? []).filter(
    (p) => !filterModelId || p.modelId === filterModelId,
  );

  return (
    <div className="card">
      <div className="card-header">
        <span>ModelChat</span>
        <span style={{ fontWeight: 400, opacity: 0.6 }}>
          {filterModelId ? nameById[filterModelId] ?? "Filtered" : "All Models"}
        </span>
      </div>
      <div className="chat-feed">
        {entries.length === 0 && (
          <div className="chat-item">
            <p className="chat-body" style={{ margin: 0 }}>
              Waiting for cycle data. Start the API to see live model thoughts.
            </p>
          </div>
        )}
        {entries.map((p) => {
          const visual = modelVisual(
            p.modelId,
            (providerById[p.modelId] ?? "mock") as ModelProvider,
          );
          const name = nameById[p.modelId] ?? p.modelId;
          return (
            <div key={`${p.modelId}-${cycle?.cycle}`} className="chat-item">
              <div className="chat-meta">
                <span>
                  <span className="chat-model" style={{ color: visual.chatColor }}>
                    {visual.icon} {name.toUpperCase()}
                  </span>
                  <span className="chat-tag">{visual.tag}</span>
                </span>
                <span className="chat-time">
                  {cycle ? formatTime(cycle.timestamp) : "—"}
                </span>
              </div>
              <p className="chat-body">{decisionSummary(p.decision.decisions)}</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {p.decision.decisions.map((d) => (
                  <span key={d.asset} className={sideBadgeClass(d.side)}>
                    {d.asset} {d.side}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

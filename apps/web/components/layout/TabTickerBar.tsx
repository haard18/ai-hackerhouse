"use client";

import { useEffect, useState } from "react";
import type { LeaderboardEntry } from "../../lib/api";
import { api } from "../../lib/api";
import { formatPrice, formatPct } from "../../lib/format";
import { quotesForCycle } from "../../lib/market-prices";
import { modelVisual } from "../../lib/model-meta";

interface TabTickerBarProps {
  cycle: number;
  selectedModelId: string | null;
  onModelSelect?: (id: string | null) => void;
}

export function TabTickerBar({ cycle, selectedModelId, onModelSelect }: TabTickerBarProps) {
  const [models, setModels] = useState<LeaderboardEntry[]>([]);
  const quotes = quotesForCycle(cycle);

  useEffect(() => {
    api.leaderboard().then(setModels).catch(() => {});
  }, []);

  const tickerItems = [...quotes, ...quotes];

  return (
    <div className="tab-ticker-bar">
      <div className="model-tabs">
        <button
          type="button"
          className={`model-tab ${selectedModelId === null ? "active" : ""}`}
          onClick={() => onModelSelect?.(null)}
        >
          Aggregate Index
        </button>
        {models.map((m, i) => {
          const v = modelVisual(m.id, m.provider as "mock");
          return (
            <button
              key={m.id}
              type="button"
              className={`model-tab ${v.tabClass} ${selectedModelId === m.id ? "active" : ""}`}
              onClick={() => onModelSelect?.(m.id)}
            >
              {i + 1}: {m.name.split(" ")[0]}
            </button>
          );
        })}
      </div>
      <div className="ticker-scroll">
        <div className="ticker-track">
          {tickerItems.map((q, i) => (
            <span key={`${q.asset}-${i}`} className="ticker-item">
              <span className="ticker-symbol">{q.asset}</span>
              <span className="ticker-price">${formatPrice(q.asset, q.price)}</span>
              <span className={`ticker-change ${q.changePct >= 0 ? "up" : "down"}`}>
                {formatPct(q.changePct)}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

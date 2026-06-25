"use client";

import { useEffect, useState } from "react";
import type { CycleResult } from "@ai-trading/shared";
import { CYCLE_INTERVAL_MS } from "@ai-trading/shared";
import { Shell } from "../layout/Shell";
import { ArenaHero } from "./ArenaHero";
import { AssetStrip } from "./AssetStrip";
import { ModelBattle } from "./ModelBattle";
import { ModelChat } from "./ModelChat";
import { PositionHeatmap } from "./PositionHeatmap";
import { IndexChart } from "../charts/IndexChart";
import { ModelPnLChart } from "../charts/ModelPnLChart";
import { aggregateIndexHistory } from "../../lib/chart-data";
import { api, type LeaderboardEntry } from "../../lib/api";

function formatCountdown(ms: number): string {
  if (ms <= 0) return "imminent…";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function LiveDashboard({
  initialModels,
  initialCycle,
}: {
  initialModels: LeaderboardEntry[];
  initialCycle: CycleResult | null;
}) {
  const [models, setModels] = useState(initialModels);
  const [cycle, setCycle] = useState(initialCycle);
  const [filterModelId, setFilterModelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState("—");

  useEffect(() => {
    const poll = async () => {
      try {
        const [m, c] = await Promise.all([
          api.leaderboard(),
          api.latestCycle().catch(() => null),
        ]);
        setModels(m);
        if (c) setCycle(c);
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      }
    };
    const id = setInterval(poll, 15_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const tick = () => {
      if (!cycle?.timestamp) {
        setCountdown("—");
        return;
      }
      const next = cycle.timestamp + CYCLE_INTERVAL_MS;
      setCountdown(formatCountdown(next - Date.now()));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cycle?.timestamp, cycle?.cycle]);

  const indexData = aggregateIndexHistory(models, cycle?.cycle ?? 0);

  return (
    <Shell
      activeNav="live"
      cycle={cycle?.cycle ?? 0}
      selectedModelId={filterModelId}
      onModelSelect={setFilterModelId}
    >
      {error && (
        <div className="error-banner">
          API offline ({error}). Run <code>pnpm --filter @ai-trading/api dev</code>
        </div>
      )}

      <ArenaHero models={models} cycle={cycle} cycleCountdown={countdown} />

      <div className="arena-grid">
        <div className="glass-card arena-span-2">
          <div className="card-header">
            <span>Aggregate Index · TVL</span>
            <span style={{ opacity: 0.5 }}>24 cycles</span>
          </div>
          <div className="card-body">
            <IndexChart data={indexData} />
          </div>
        </div>

        <div className="glass-card">
          <div className="card-header">
            <span>ModelChat</span>
            <span style={{ opacity: 0.5 }}>live feed</span>
          </div>
          <ModelChat cycle={cycle} models={models} filterModelId={filterModelId} />
        </div>

        <div className="glass-card arena-row-full">
          <div className="card-header">
            <span>Market Tape</span>
            <span style={{ opacity: 0.5 }}>hover for vol</span>
          </div>
          <div className="card-body">
            <AssetStrip cycle={cycle?.cycle ?? 0} />
          </div>
        </div>

        <div className="glass-card">
          <div className="card-header">
            <span>Head-to-Head</span>
            <span style={{ opacity: 0.5 }}>top 2</span>
          </div>
          <div className="card-body">
            <ModelBattle models={models} cycle={cycle} />
          </div>
        </div>

        <div className="glass-card">
          <div className="card-header">
            <span>Cycle PnL</span>
            <span style={{ opacity: 0.5 }}>last tick</span>
          </div>
          <div className="card-body">
            <ModelPnLChart models={models} cycle={cycle} />
          </div>
        </div>

        <div className="glass-card">
          <div className="card-header">
            <span>Position Matrix</span>
            <span style={{ opacity: 0.5 }}>L / S / flat</span>
          </div>
          <div className="card-body">
            <PositionHeatmap models={models} cycle={cycle} />
          </div>
        </div>
      </div>
    </Shell>
  );
}

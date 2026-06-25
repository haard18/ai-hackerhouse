"use client";

import { useEffect, useState } from "react";
import type { CycleResult } from "@ai-trading/shared";
import { Shell } from "../layout/Shell";
import { LiveOverview } from "./LiveOverview";
import { ModelChat } from "./ModelChat";
import { api, type LeaderboardEntry } from "../../lib/api";

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
    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <Shell
      activeNav="live"
      cycle={cycle?.cycle ?? 0}
      selectedModelId={filterModelId}
      onModelSelect={setFilterModelId}
    >
      {error && (
        <div className="error-banner">
          API offline ({error}). Run{" "}
          <code>pnpm --filter @ai-trading/api dev</code>
        </div>
      )}
      <div className="live-grid" style={{ marginTop: 28 }}>
        <div>
          <LiveOverview models={models} cycle={cycle} />
        </div>
        <ModelChat cycle={cycle} models={models} filterModelId={filterModelId} />
      </div>
    </Shell>
  );
}

/**
 * Tiny typed client for the platform API. Aashwin: extend with the staking /
 * user calls as the UI grows.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface LeaderboardEntry {
  id: string;
  name: string;
  provider: string;
  balance: number;
  totalShares: number;
  active: boolean;
}

export interface AssetDecision {
  asset: string;
  side: "LONG" | "SHORT" | "FLAT";
  confidence: number;
  rationale?: string;
}

export interface CycleOutcome {
  modelId: string;
  decision: {
    modelId: string;
    cycle: number;
    decisions: AssetDecision[];
    raw?: string;
  };
  pnl: number;
  balanceAfter: number;
}

export interface LatestCycle {
  cycle: number;
  timestamp: number;
  snapshotRef: number;
  perModel: CycleOutcome[];
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  leaderboard: () => get<LeaderboardEntry[]>("/models"),
  latestCycle: () => get<LatestCycle>("/cycle/latest"),
};

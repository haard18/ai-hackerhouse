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

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  leaderboard: () => get<LeaderboardEntry[]>("/models"),
  latestCycle: () => get<unknown>("/cycle/latest"),
};

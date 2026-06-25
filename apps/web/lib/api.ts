/**
 * Typed client for the platform API.
 */

import type { CycleResult, ModelConfig, Stake, User } from "@ai-trading/shared";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface LeaderboardEntry {
  id: string;
  name: string;
  provider: string;
  balance: number;
  totalShares: number;
  active: boolean;
}

export interface ModelRecord extends ModelConfig {
  balance: number;
  totalShares: number;
  active: boolean;
}

export interface UserWithStakes extends User {
  stakes: Stake[];
}

export interface StakeValue {
  shares: number;
  value: number;
  contributed: number;
}

export interface ClaimResult {
  payout: number;
  remainingShares: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `API ${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  leaderboard: () => request<LeaderboardEntry[]>("/models"),
  model: (id: string) => request<ModelRecord>(`/models/${id}`),
  latestCycle: () => request<CycleResult>("/cycle/latest"),
  createUser: (handle: string) =>
    request<User>("/users", { method: "POST", body: JSON.stringify({ handle }) }),
  user: (id: string) => request<UserWithStakes>(`/users/${id}`),
  stake: (modelId: string, userId: string, amount: number) =>
    request<Stake>(`/models/${modelId}/stake`, {
      method: "POST",
      body: JSON.stringify({ userId, amount }),
    }),
  claim: (modelId: string, userId: string, shares?: number) =>
    request<ClaimResult>(`/models/${modelId}/claim`, {
      method: "POST",
      body: JSON.stringify({ userId, shares }),
  }),
  stakeValue: (modelId: string, userId: string) =>
    request<StakeValue>(`/models/${modelId}/stake/${userId}`),
};

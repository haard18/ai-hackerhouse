import { ASSETS, STARTING_BALANCE, type AssetSymbol } from "@ai-trading/shared";
import type { LeaderboardEntry } from "./api";
import { priceAt } from "./market-prices";

function hashPnl(modelId: string, cycle: number): number {
  let h = 2166136261 ^ cycle;
  for (const ch of modelId) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const n = ((h >>> 0) % 1000) / 1000;
  return (n - 0.48) * 120;
}

/** Deterministic balance walk, snapped to real balance at current cycle. */
export function modelBalanceHistory(
  modelId: string,
  currentBalance: number,
  currentCycle: number,
  points = 24,
) {
  const start = Math.max(0, currentCycle - points + 1);
  const raw: { cycle: number; balance: number }[] = [];
  let bal = STARTING_BALANCE;
  for (let c = 0; c <= currentCycle; c++) {
    if (c > 0) bal += hashPnl(modelId, c);
    raw.push({ cycle: c, balance: bal });
  }
  const simEnd = raw[currentCycle]?.balance ?? STARTING_BALANCE;
  const scale = simEnd ? currentBalance / simEnd : 1;
  return raw
    .filter((p) => p.cycle >= start)
    .map((p) => ({
      cycle: p.cycle,
      balance: Math.round(p.balance * scale),
      label: `#${p.cycle}`,
    }));
}

export function aggregateIndexHistory(
  models: LeaderboardEntry[],
  currentCycle: number,
  points = 24,
) {
  const perModel = models.map((m) =>
    modelBalanceHistory(m.id, m.balance, currentCycle, points),
  );
  if (!perModel.length) return [];
  const cycles = perModel[0].map((p) => p.cycle);
  return cycles.map((cycle, i) => ({
    cycle,
    tvl: perModel.reduce((s, h) => s + (h[i]?.balance ?? 0), 0),
    label: `#${cycle}`,
  }));
}

export function assetVolumeProxy(asset: AssetSymbol, cycle: number): number {
  const p = priceAt(asset, cycle);
  const prev = priceAt(asset, Math.max(0, cycle - 1));
  return Math.abs(p - prev) / prev;
}

export { ASSETS };

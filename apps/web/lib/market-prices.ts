import { ASSETS, type AssetSymbol } from "@ai-trading/shared";

/** Mirrors packages/data-feed stub pricing so ticker matches backend. */
const BASE_PRICE: Record<AssetSymbol, number> = {
  BTC: 65_000,
  ETH: 3_400,
  SOL: 150,
  BNB: 580,
  XRP: 0.52,
};

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(asset: AssetSymbol, cycle: number): number {
  let h = 2166136261 ^ cycle;
  for (const ch of asset) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

function priceAt(asset: AssetSymbol, cycle: number): number {
  const rand = rng(hashSeed(asset, cycle));
  const base = BASE_PRICE[asset];
  const drift = 1 + Math.sin(cycle / 12) * 0.02;
  const open = base * drift * (0.985 + rand() * 0.03);
  const close = open * (0.99 + rand() * 0.02);
  return close;
}

export interface TickerQuote {
  asset: AssetSymbol;
  price: number;
  changePct: number;
}

export function quotesForCycle(cycle: number): TickerQuote[] {
  const prev = Math.max(0, cycle - 1);
  return ASSETS.map((asset) => {
    const price = priceAt(asset, cycle);
    const prevPrice = priceAt(asset, prev);
    const changePct = prevPrice ? ((price - prevPrice) / prevPrice) * 100 : 0;
    return { asset, price, changePct };
  });
}

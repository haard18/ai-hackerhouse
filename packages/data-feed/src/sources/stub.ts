/**
 * StubMarketDataSource — deterministic fake market data for local dev and tests.
 * No network. Produces a plausible random walk seeded per (asset, cycle) so
 * runs are reproducible.
 *
 * Replace with a real source (see ./binance.ts TODO) for live trading.
 */

import type {
  AssetMarketData,
  AssetSymbol,
  Candle,
} from "@ai-trading/shared";
import type { MarketDataSource } from "../source.js";

const BASE_PRICE: Record<AssetSymbol, number> = {
  BTC: 65_000,
  ETH: 3_400,
  SOL: 150,
  BNB: 580,
  XRP: 0.52,
};

/** Cheap deterministic PRNG (mulberry32) so snapshots are reproducible. */
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

export class StubMarketDataSource implements MarketDataSource {
  readonly name = "stub";

  /** Cycle counter so successive snapshots drift over time. */
  constructor(private cycle = 0) {}

  setCycle(cycle: number): void {
    this.cycle = cycle;
  }

  private candleAt(asset: AssetSymbol, cycle: number): Candle {
    const rand = rng(hashSeed(asset, cycle));
    const base = BASE_PRICE[asset];
    // ±1.5% wiggle per cycle around the base, drifting with cycle index.
    const drift = 1 + Math.sin(cycle / 12) * 0.02;
    const open = base * drift * (0.985 + rand() * 0.03);
    const close = open * (0.99 + rand() * 0.02);
    const high = Math.max(open, close) * (1 + rand() * 0.005);
    const low = Math.min(open, close) * (1 - rand() * 0.005);
    return {
      asset,
      openTime: cycle * 5 * 60 * 1000,
      open,
      high,
      low,
      close,
      volume: 1_000 + rand() * 9_000,
    };
  }

  async getCandles(asset: AssetSymbol, limit: number): Promise<Candle[]> {
    const start = this.cycle - limit + 1;
    const out: Candle[] = [];
    for (let c = start; c <= this.cycle; c++) out.push(this.candleAt(asset, c));
    return out;
  }

  async getAssetData(
    asset: AssetSymbol,
    candleWindow: number,
  ): Promise<AssetMarketData> {
    const candles = await this.getCandles(asset, candleWindow);
    const price = candles[candles.length - 1]?.close ?? BASE_PRICE[asset];
    return { asset, price, candles };
  }
}

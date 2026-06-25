/**
 * BinanceMarketDataSource — live market data from Binance public REST klines.
 *
 * No API key required (public market-data endpoints). One request per asset per
 * cycle = 5 requests / 5 min, which is trivially within Binance's rate limits.
 *
 * Endpoint: GET /api/v3/klines?symbol=BTCUSDT&interval=5m&limit=N
 * Response: array of arrays — [openTime, open, high, low, close, volume, ...].
 *
 * Region note: `api.binance.com` is geo-blocked in some countries (e.g. US).
 * Set MARKET_DATA_BASE_URL=https://api.binance.us there (same symbol map works).
 *
 * Security (CLAUDE.md): every response field is validated and coerced to a
 * finite number before use; requests are timed out; nothing is logged that
 * could leak secrets (there are none here).
 */

import type { AssetMarketData, AssetSymbol, Candle } from "@ai-trading/shared";
import type { MarketDataSource } from "../source.js";

const SYMBOL_MAP: Record<AssetSymbol, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
  BNB: "BNBUSDT",
  XRP: "XRPUSDT",
};

/** Raw kline tuple shape we depend on (first 6 fields). */
type RawKline = [number, string, string, string, string, string, ...unknown[]];

export interface BinanceOptions {
  /** API base, e.g. https://api.binance.com or https://api.binance.us. */
  baseUrl?: string;
  /** Candle interval. Must match the cycle cadence (default 5m). */
  interval?: string;
  /** Per-request timeout in ms. */
  timeoutMs?: number;
}

export class BinanceMarketDataSource implements MarketDataSource {
  readonly name = "binance";
  private readonly baseUrl: string;
  private readonly interval: string;
  private readonly timeoutMs: number;

  constructor(opts: BinanceOptions = {}) {
    this.baseUrl =
      opts.baseUrl ??
      process.env.MARKET_DATA_BASE_URL ??
      "https://api.binance.com";
    this.interval = opts.interval ?? "5m";
    this.timeoutMs = opts.timeoutMs ?? 8_000;
  }

  async getCandles(asset: AssetSymbol, limit: number): Promise<Candle[]> {
    const symbol = SYMBOL_MAP[asset];
    const url =
      `${this.baseUrl}/api/v3/klines?symbol=${symbol}` +
      `&interval=${this.interval}&limit=${Math.max(1, Math.min(1000, limit))}`;

    const raw = await this.fetchJson(url);
    if (!Array.isArray(raw)) {
      throw new Error(`binance: unexpected klines payload for ${symbol}`);
    }

    const candles: Candle[] = [];
    for (const row of raw as RawKline[]) {
      const candle = this.parseKline(asset, row);
      if (candle) candles.push(candle);
    }
    if (candles.length === 0) {
      throw new Error(`binance: no valid candles for ${symbol}`);
    }
    return candles;
  }

  async getAssetData(
    asset: AssetSymbol,
    candleWindow: number,
  ): Promise<AssetMarketData> {
    const candles = await this.getCandles(asset, candleWindow);
    const price = candles[candles.length - 1]!.close;
    return { asset, price, candles };
  }

  // ── internals ──────────────────────────────────────────────────────────

  private async fetchJson(url: string): Promise<unknown> {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { accept: "application/json" },
      });
      if (!res.ok) {
        throw new Error(`binance: HTTP ${res.status} for ${url}`);
      }
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  }

  /** Validate + coerce one kline row. Returns null if malformed. */
  private parseKline(asset: AssetSymbol, row: RawKline): Candle | null {
    if (!Array.isArray(row) || row.length < 6) return null;
    const openTime = Number(row[0]);
    const open = Number(row[1]);
    const high = Number(row[2]);
    const low = Number(row[3]);
    const close = Number(row[4]);
    const volume = Number(row[5]);
    const nums = [openTime, open, high, low, close, volume];
    if (nums.some((n) => !Number.isFinite(n))) return null;
    if (open <= 0 || close <= 0) return null;
    return { asset, openTime, open, high, low, close, volume };
  }
}

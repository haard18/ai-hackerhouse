/**
 * BinanceMarketDataSource — live market data from Binance public REST klines.
 *
 * No API key required. One REST request per asset per cycle is comfortably
 * within Binance public rate limits. Responses are validated and coerced before
 * becoming Candle objects so a bad upstream payload fails loudly.
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

export interface BinanceOptions {
  /** API base, e.g. https://api.binance.com or https://api.binance.us. */
  baseUrl?: string;
  /** Candle interval. Must match the cycle cadence. */
  interval?: string;
  /** Per-request timeout in ms. */
  timeoutMs?: number;
}

export class BinanceMarketDataSource implements MarketDataSource {
  readonly name = "binance";
  private readonly baseUrl: string;
  private readonly interval: string;
  private readonly timeoutMs: number;

  constructor(opts: BinanceOptions | string = {}) {
    const options = typeof opts === "string" ? { baseUrl: opts } : opts;
    this.baseUrl =
      options.baseUrl ??
      process.env.MARKET_DATA_BASE_URL ??
      process.env.BINANCE_API_BASE ??
      "https://api.binance.com";
    this.interval = options.interval ?? "5m";
    this.timeoutMs = positiveMs(
      options.timeoutMs ?? Number(process.env.MARKET_DATA_TIMEOUT_MS ?? 8_000),
      8_000,
    );
  }

  async getCandles(asset: AssetSymbol, limit: number): Promise<Candle[]> {
    const symbol = SYMBOL_MAP[asset];
    const safeLimit = Math.max(1, Math.min(1000, Math.floor(limit)));
    const url = new URL("/api/v3/klines", this.baseUrl);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", this.interval);
    url.searchParams.set("limit", String(safeLimit));

    const raw = await this.fetchJson(url);
    if (!Array.isArray(raw)) {
      throw new Error(`binance: unexpected klines payload for ${symbol}`);
    }

    const candles = raw.map((row, index) =>
      parseKline(asset, symbol, row, index),
    );
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
    const price = candles[candles.length - 1]?.close;
    if (!price) throw new Error(`binance: no latest price for ${SYMBOL_MAP[asset]}`);
    return { asset, price, candles };
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(this.timeoutMs),
      headers: { accept: "application/json" },
    });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`binance: HTTP ${response.status} for ${url.toString()}`);
    }
    return JSON.parse(body) as unknown;
  }
}

function parseKline(
  asset: AssetSymbol,
  symbol: string,
  row: unknown,
  index: number,
): Candle {
  if (!Array.isArray(row) || row.length < 6) {
    throw new Error(`binance: invalid kline ${symbol}[${index}]`);
  }

  const openTime = parseNumber(row[0], `${symbol}[${index}].openTime`);
  const open = parseNumber(row[1], `${symbol}[${index}].open`);
  const high = parseNumber(row[2], `${symbol}[${index}].high`);
  const low = parseNumber(row[3], `${symbol}[${index}].low`);
  const close = parseNumber(row[4], `${symbol}[${index}].close`);
  const volume = parseNumber(row[5], `${symbol}[${index}].volume`);

  if (open <= 0 || high <= 0 || low <= 0 || close <= 0 || volume < 0) {
    throw new Error(`binance: invalid non-positive OHLCV for ${symbol}[${index}]`);
  }
  if (high < Math.max(open, close) || low > Math.min(open, close)) {
    throw new Error(`binance: invalid OHLC relationship for ${symbol}[${index}]`);
  }

  return { asset, openTime, open, high, low, close, volume };
}

function parseNumber(value: unknown, label: string): number {
  const parsed =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) {
    throw new Error(`binance: invalid numeric field ${label}`);
  }
  return parsed;
}

function positiveMs(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

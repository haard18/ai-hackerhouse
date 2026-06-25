/**
 * BinanceMarketDataSource — REST-backed live market data source.
 *
 * Uses public 5-minute klines for the five traded assets. Responses are
 * validated before becoming Candle objects so a bad upstream payload fails the
 * cycle instead of silently poisoning model prompts.
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

export class BinanceMarketDataSource implements MarketDataSource {
  readonly name = "binance";

  constructor(
    private readonly apiBase =
      process.env.BINANCE_API_BASE ?? "https://api.binance.com",
    private readonly timeoutMs = Number(process.env.MARKET_DATA_TIMEOUT_MS ?? 10_000),
  ) {}

  async getCandles(asset: AssetSymbol, limit: number): Promise<Candle[]> {
    const symbol = SYMBOL_MAP[asset];
    const safeLimit = Math.max(1, Math.min(1000, Math.floor(limit)));
    const url = new URL("/api/v3/klines", this.apiBase);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", "5m");
    url.searchParams.set("limit", String(safeLimit));

    const response = await fetch(url, {
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    const body = await response.text();
    if (!response.ok) {
      throw new Error(`Binance ${response.status} for ${symbol}: ${body.slice(0, 200)}`);
    }

    const parsed = JSON.parse(body) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error(`Binance returned non-array klines for ${symbol}`);
    }

    return parsed.map((row, index) => parseKline(asset, symbol, row, index));
  }

  async getAssetData(
    asset: AssetSymbol,
    candleWindow: number,
  ): Promise<AssetMarketData> {
    const candles = await this.getCandles(asset, candleWindow);
    const price = candles[candles.length - 1]?.close;
    if (!price) throw new Error(`Binance returned no candles for ${SYMBOL_MAP[asset]}`);
    return { asset, price, candles };
  }
}

function parseKline(
  asset: AssetSymbol,
  symbol: string,
  row: unknown,
  index: number,
): Candle {
  if (!Array.isArray(row) || row.length < 6) {
    throw new Error(`Invalid Binance kline ${symbol}[${index}]`);
  }

  const openTime = parseNumber(row[0], `${symbol}[${index}].openTime`);
  const open = parseNumber(row[1], `${symbol}[${index}].open`);
  const high = parseNumber(row[2], `${symbol}[${index}].high`);
  const low = parseNumber(row[3], `${symbol}[${index}].low`);
  const close = parseNumber(row[4], `${symbol}[${index}].close`);
  const volume = parseNumber(row[5], `${symbol}[${index}].volume`);

  if (high < Math.max(open, close) || low > Math.min(open, close)) {
    throw new Error(`Invalid Binance OHLC relationship for ${symbol}[${index}]`);
  }

  return { asset, openTime, open, high, low, close, volume };
}

function parseNumber(value: unknown, label: string): number {
  const parsed =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric Binance field ${label}`);
  }
  return parsed;
}

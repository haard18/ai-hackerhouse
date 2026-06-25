/**
 * CandleBuffer — keeps a rolling window of recent closed candles per asset,
 * fed by the live stream, plus the current forming candle for an up-to-the-
 * second price. It implements MarketDataSource, so the cycle engine can build
 * snapshots straight from the live feed (no REST call per cycle).
 *
 * On cold start the buffer is empty; seed it once from REST history via
 * `seed()` so models have context before the first 5m candle closes.
 */

import {
  CANDLE_WINDOW,
  type AssetMarketData,
  type AssetSymbol,
  type Candle,
} from "@ai-trading/shared";
import type { MarketDataSource } from "./source.js";
import type { CandleEvent } from "./stream.js";

export class CandleBuffer implements MarketDataSource {
  readonly name = "stream-buffer";
  /** Closed candle history per asset, oldest first. */
  private history = new Map<AssetSymbol, Candle[]>();
  /** Latest forming (or last closed) candle per asset for a live price. */
  private current = new Map<AssetSymbol, Candle>();

  constructor(private readonly maxLen = Math.max(CANDLE_WINDOW * 4, 200)) {}

  /** Apply a stream event: update live price, and append on candle close. */
  ingest(event: CandleEvent): void {
    const { candle, closed } = event;
    this.current.set(candle.asset, candle);
    if (!closed) return;

    const hist = this.history.get(candle.asset) ?? [];
    const last = hist[hist.length - 1];
    if (last && last.openTime === candle.openTime) {
      hist[hist.length - 1] = candle; // replace if same window re-closed
    } else {
      hist.push(candle);
    }
    if (hist.length > this.maxLen) hist.splice(0, hist.length - this.maxLen);
    this.history.set(candle.asset, hist);
  }

  /** Preload closed-candle history (e.g. from REST) before the stream warms up. */
  seed(asset: AssetSymbol, candles: Candle[]): void {
    this.history.set(asset, candles.slice(-this.maxLen));
    const last = candles[candles.length - 1];
    if (last) this.current.set(asset, last);
  }

  hasData(asset: AssetSymbol): boolean {
    return this.current.has(asset);
  }

  // ── MarketDataSource ─────────────────────────────────────────────────────

  async getCandles(asset: AssetSymbol, limit: number): Promise<Candle[]> {
    const hist = this.history.get(asset) ?? [];
    return hist.slice(-limit);
  }

  async getAssetData(
    asset: AssetSymbol,
    candleWindow: number,
  ): Promise<AssetMarketData> {
    const cur = this.current.get(asset);
    const candles = await this.getCandles(asset, candleWindow);
    const price = cur?.close ?? candles[candles.length - 1]?.close ?? 0;
    return { asset, price, candles };
  }
}

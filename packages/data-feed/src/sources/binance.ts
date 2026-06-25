/**
 * BinanceMarketDataSource — STUB for a real exchange feed.
 *
 * TODO (data-feed owner):
 *  - Fetch klines from https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=5m
 *  - Map our AssetSymbol -> exchange symbol (BTC -> BTCUSDT, etc.)
 *  - Validate every response field before use (CLAUDE.md security rule).
 *  - Rate-limit requests; respect weight headers.
 *  - Consider a WS stream for live price + REST for the candle backfill.
 *
 * Until implemented, methods throw so we never silently serve fake prices in
 * a "live" config.
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

  constructor(private readonly apiBase = "https://api.binance.com") {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getCandles(asset: AssetSymbol, limit: number): Promise<Candle[]> {
    void SYMBOL_MAP[asset];
    void this.apiBase;
    void limit;
    throw new Error("BinanceMarketDataSource.getCandles not implemented yet");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getAssetData(
    asset: AssetSymbol,
    candleWindow: number,
  ): Promise<AssetMarketData> {
    void asset;
    void candleWindow;
    throw new Error("BinanceMarketDataSource.getAssetData not implemented yet");
  }
}

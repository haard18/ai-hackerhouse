/**
 * MarketDataSource — the contract every data provider must implement.
 *
 * Owner: data-feed (you). Swap providers by implementing this interface:
 * a stub (deterministic fake), a real exchange (Binance/Coinbase REST or WS),
 * or a cached/replayed dataset for backtesting.
 */

import type { AssetMarketData, AssetSymbol, Candle } from "@ai-trading/shared";

export interface MarketDataSource {
  readonly name: string;
  /** Latest price + recent candle window for one asset. */
  getAssetData(asset: AssetSymbol, candleWindow: number): Promise<AssetMarketData>;
  /** Optional: latest candles only, used by the snapshot builder. */
  getCandles?(asset: AssetSymbol, limit: number): Promise<Candle[]>;
}

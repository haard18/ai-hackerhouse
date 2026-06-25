export * from "./source.js";
export * from "./snapshot.js";
export * from "./scheduler.js";
export { StubMarketDataSource } from "./sources/stub.js";
export { BinanceMarketDataSource } from "./sources/binance.js";

import type { MarketDataSource } from "./source.js";
import { StubMarketDataSource } from "./sources/stub.js";
import { BinanceMarketDataSource } from "./sources/binance.js";

/** Resolve a data source from env config (MARKET_DATA_SOURCE). */
export function createMarketDataSource(
  kind = process.env.MARKET_DATA_SOURCE ?? "stub",
): MarketDataSource {
  switch (kind) {
    case "binance":
      return new BinanceMarketDataSource();
    case "stub":
    default:
      return new StubMarketDataSource();
  }
}

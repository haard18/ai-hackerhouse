export * from "./source.js";
export * from "./snapshot.js";
export * from "./scheduler.js";
export * from "./stream.js";
export * from "./buffer.js";
export * from "./sink.js";
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
      return new BinanceMarketDataSource(process.env.BINANCE_API_BASE);
    case "stub":
    default:
      return new StubMarketDataSource();
  }
}

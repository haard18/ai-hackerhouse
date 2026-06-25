/**
 * Builds the MarketSnapshot fed to every model each cycle: latest price plus a
 * recent candle window for all 5 assets.
 */

import {
  ASSETS,
  type AssetMarketData,
  type AssetSymbol,
  type MarketSnapshot,
} from "@ai-trading/shared";
import type { MarketDataSource } from "./source.js";

export interface SnapshotOptions {
  /** Number of recent candles per asset to include. */
  candleWindow?: number;
}

export async function buildSnapshot(
  source: MarketDataSource,
  cycle: number,
  timestamp: number,
  opts: SnapshotOptions = {},
): Promise<MarketSnapshot> {
  const candleWindow = opts.candleWindow ?? 24;

  const entries = await Promise.all(
    ASSETS.map(
      async (asset): Promise<[AssetSymbol, AssetMarketData]> => [
        asset,
        await source.getAssetData(asset, candleWindow),
      ],
    ),
  );

  const assets = Object.fromEntries(entries) as Record<
    AssetSymbol,
    AssetMarketData
  >;

  return { timestamp, cycle, assets };
}

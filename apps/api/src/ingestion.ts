/**
 * Ingestion wiring: connects the live WebSocket stream to (a) a rolling buffer
 * that the cycle engine reads as its MarketDataSource, and (b) a persistence
 * sink that saves every closed candle.
 *
 * In "stub" mode there's no stream — we just hand back the deterministic source
 * so the platform runs fully offline.
 */

import {
  BinanceKlineStream,
  BinanceMarketDataSource,
  CandleBuffer,
  createMarketDataSource,
  type CandleSink,
  type MarketDataSource,
} from "@ai-trading/data-feed";
import { ASSETS, CANDLE_WINDOW, type Candle } from "@ai-trading/shared";

export interface Ingestion {
  source: MarketDataSource;
  start(): Promise<void>;
  stop(): void;
}

export function createIngestion(sink: CandleSink): Ingestion {
  const mode = process.env.MARKET_DATA_SOURCE ?? "stub";

  // Offline / deterministic: no live stream, no persistence stream.
  if (mode !== "binance") {
    return {
      source: createMarketDataSource(mode),
      async start() {},
      stop() {},
    };
  }

  const buffer = new CandleBuffer();
  const rest = new BinanceMarketDataSource();
  const stream = new BinanceKlineStream();

  // Every tick updates the live buffer; every CLOSED candle is persisted.
  stream.onCandle((e) => {
    buffer.ingest(e);
    if (e.closed) {
      void sink.save(e.candle).catch((err) =>
        console.error(`[persist] failed for ${e.candle.asset}`, err),
      );
    }
  });

  return {
    source: buffer,
    async start() {
      // Seed REST history so models have context before the first candle closes,
      // and persist that history too.
      await Promise.all(
        ASSETS.map(async (asset) => {
          try {
            const candles: Candle[] = await rest.getCandles(asset, CANDLE_WINDOW);
            buffer.seed(asset, candles);
            await sink.saveMany?.(candles);
          } catch (err) {
            console.error(`[seed] ${asset} failed`, err);
          }
        }),
      );
      stream.start();
    },
    stop() {
      stream.stop();
    },
  };
}

/**
 * CandleSink — where ingested candles get persisted. The data-feed package only
 * defines the contract; the concrete store (Prisma/Neon) lives in apps/api.
 *
 * Wire a sink to the stream:
 *   stream.onCandle((e) => { if (e.closed) void sink.save(e.candle); });
 *
 * We persist CLOSED candles by default — the canonical, immutable 5m OHLCV
 * history ("all the data" at candle granularity). Persisting every ~1–2s
 * forming update is possible but is a heavy write stream; flip `persistForming`
 * on the consumer if you truly want tick-level history.
 */

import type { Candle } from "@ai-trading/shared";

export interface CandleSink {
  /** Persist a single (closed) candle. Should be idempotent on (asset, openTime). */
  save(candle: Candle): Promise<void>;
  /** Optional batch path for backfills. */
  saveMany?(candles: Candle[]): Promise<void>;
}

/** No-op sink that logs — used until a real DATABASE_URL is configured. */
export class ConsoleCandleSink implements CandleSink {
  async save(candle: Candle): Promise<void> {
    console.log(
      `[persist] ${candle.asset} ${new Date(candle.openTime).toISOString()} ` +
        `O=${candle.open} C=${candle.close} V=${candle.volume}`,
    );
  }
}

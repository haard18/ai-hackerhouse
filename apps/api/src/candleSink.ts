/**
 * PrismaCandleSink — persists closed candles to Postgres (Neon). Idempotent:
 * re-ingesting the same (asset, interval, openTime) updates in place, so
 * reconnects and overlapping backfills never duplicate rows.
 */

import { CANDLE_INTERVAL, type Candle } from "@ai-trading/shared";
import type { CandleSink } from "@ai-trading/data-feed";
import type { PrismaClient } from "@prisma/client";

export class PrismaCandleSink implements CandleSink {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly interval = CANDLE_INTERVAL,
  ) {}

  async save(candle: Candle): Promise<void> {
    const data = {
      asset: candle.asset,
      interval: this.interval,
      openTime: BigInt(candle.openTime),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
    };
    await this.prisma.candle.upsert({
      where: {
        asset_interval_openTime: {
          asset: data.asset,
          interval: data.interval,
          openTime: data.openTime,
        },
      },
      create: data,
      update: {
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
        volume: data.volume,
      },
    });
  }

  async saveMany(candles: Candle[]): Promise<void> {
    if (candles.length === 0) return;
    // Bulk insert for backfill; the unique (asset, interval, openTime) index +
    // skipDuplicates makes it idempotent in a single round trip.
    await this.prisma.candle.createMany({
      data: candles.map((c) => ({
        asset: c.asset,
        interval: this.interval,
        openTime: BigInt(c.openTime),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      })),
      skipDuplicates: true,
    });
  }
}

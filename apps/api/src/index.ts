/**
 * API entrypoint. Wires the store, staking service, market-data ingestion
 * (live WS stream + persistence, or offline stub), the cycle runner, the
 * 5-minute scheduler, and the HTTP server.
 *
 * Runs fully on stubs with no credentials. Set MARKET_DATA_SOURCE=binance for
 * the live feed, and DATABASE_URL (Neon) to persist every closed candle.
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import cors from "cors";
import { config as loadEnv } from "dotenv";
import express from "express";
import {
  CycleScheduler,
  ConsoleCandleSink,
  type CandleSink,
} from "@ai-trading/data-feed";
import type { CycleResult } from "@ai-trading/shared";
import { CycleRunner } from "./cycleRunner.js";
import { InMemoryStore } from "./memoryStore.js";
import { buildRoutes } from "./routes.js";
import { StakingService } from "./staking.js";
import { createIngestion } from "./ingestion.js";

for (const path of [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../../.env"),
].filter(existsSync)) {
  loadEnv({ path });
}

const PORT = Number(process.env.API_PORT ?? 4000);

/** Build a persistence sink: Prisma/Neon when DATABASE_URL is set, else console. */
async function createSink(): Promise<CandleSink> {
  if (!process.env.DATABASE_URL) {
    console.log("[persist] DATABASE_URL not set — candles logged, not stored.");
    return new ConsoleCandleSink();
  }
  const { PrismaClient } = await import("@prisma/client");
  const { PrismaCandleSink } = await import("./candleSink.js");
  console.log("[persist] using Postgres candle store.");
  return new PrismaCandleSink(new PrismaClient());
}

async function main() {
  const store = new InMemoryStore();
  const staking = new StakingService(store);

  const sink = await createSink();
  const ingestion = createIngestion(sink);
  await ingestion.start();

  const runner = new CycleRunner(store, ingestion.source);

  let lastCycle: CycleResult | null = null;

  const scheduler = new CycleScheduler(async (cycle, ts) => {
    try {
      lastCycle = await runner.runCycle(cycle, ts);
      console.log(
        `[cycle ${cycle}] resolved — ` +
          lastCycle.perModel
            .map((m) => `${m.modelId}:${m.balanceAfter.toFixed(0)}`)
            .join(" "),
      );
    } catch (err) {
      console.error(`[cycle ${cycle}] failed`, err);
    }
  });

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api", buildRoutes({ store, staking, lastCycle: () => lastCycle }));

  const server = app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
    console.log(`Market data source: ${ingestion.source.name}`);
  });

  const shutdown = () => {
    console.log("\nshutting down…");
    ingestion.stop();
    scheduler.stop();
    server.close(() => process.exit(0));
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  void scheduler.tick();
  scheduler.start();
}

main().catch((err) => {
  console.error("fatal", err);
  process.exit(1);
});

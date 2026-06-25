/**
 * API entrypoint. Wires the store, staking service, market-data ingestion
 * (live WS stream + persistence, or offline stub), the cycle runner, the
 * 5-minute scheduler, the equity-history recorder, and the HTTP server.
 *
 * Runs fully on stubs with no credentials. Set MARKET_DATA_SOURCE=binance for
 * the live feed, and DATABASE_URL (Neon) to persist candles + the model
 * equity timeseries.
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
import { ASSETS, type CycleResult } from "@ai-trading/shared";
import { CycleRunner } from "./cycleRunner.js";
import { InMemoryStore } from "./memoryStore.js";
import { buildRoutes, type MarketQuote } from "./routes.js";
import { StakingService } from "./staking.js";
import { createIngestion } from "./ingestion.js";
import { CycleHistory } from "./history.js";

for (const path of [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../../.env"),
].filter(existsSync)) {
  loadEnv({ path });
}

const PORT = Number(process.env.API_PORT ?? 4000);

/** Create one shared Prisma client, or null when no DATABASE_URL is set. */
async function createPrisma() {
  if (!process.env.DATABASE_URL) {
    console.log("[persist] DATABASE_URL not set — running in-memory only.");
    return null;
  }
  const { PrismaClient } = await import("@prisma/client");
  console.log("[persist] using Postgres (candles + equity history).");
  return new PrismaClient();
}

async function main() {
  const store = new InMemoryStore();
  const staking = new StakingService(store);

  const prisma = await createPrisma();

  let sink: CandleSink;
  if (prisma) {
    const { PrismaCandleSink } = await import("./candleSink.js");
    sink = new PrismaCandleSink(prisma);
  } else {
    sink = new ConsoleCandleSink();
  }

  const ingestion = createIngestion(sink);
  await ingestion.start();

  const history = new CycleHistory(prisma);
  await history.load().catch((err) => console.error("[equity] load failed", err));

  const runner = new CycleRunner(store, ingestion.source);

  let lastCycle: CycleResult | null = null;

  // Live asset quotes from the real feed: latest price + recent closes.
  const market = async (): Promise<MarketQuote[]> =>
    Promise.all(
      ASSETS.map(async (asset) => {
        const data = await ingestion.source.getAssetData(asset, 24);
        const closes = data.candles.map((c) => c.close);
        const first = closes[0] ?? data.price;
        const changePct = first ? ((data.price - first) / first) * 100 : 0;
        return { asset, price: data.price, changePct, history: closes };
      }),
    );

  const scheduler = new CycleScheduler(async (cycle, ts) => {
    try {
      lastCycle = await runner.runCycle(cycle, ts);
      await history.record(lastCycle);
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
  app.use(
    "/api",
    buildRoutes({ store, staking, lastCycle: () => lastCycle, history, market }),
  );

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

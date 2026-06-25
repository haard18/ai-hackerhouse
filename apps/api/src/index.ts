/**
 * API entrypoint. Wires the store, staking service, cycle runner, the 5-minute
 * scheduler, and the HTTP server. Runs fully on stubs (in-memory store + mock
 * models + stub market data) with no credentials or database.
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import cors from "cors";
import { config as loadEnv } from "dotenv";
import express from "express";
import { CycleScheduler, createMarketDataSource } from "@ai-trading/data-feed";
import type { CycleResult } from "@ai-trading/shared";
import { CycleRunner } from "./cycleRunner.js";
import { InMemoryStore } from "./memoryStore.js";
import { buildRoutes } from "./routes.js";
import { StakingService } from "./staking.js";

for (const path of [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../../.env"),
].filter(existsSync)) {
  loadEnv({ path });
}

const PORT = Number(process.env.API_PORT ?? 4000);

async function main() {
  const store = new InMemoryStore();
  const staking = new StakingService(store);
  const source = createMarketDataSource();
  const runner = new CycleRunner(store, source);

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
    console.log(`Market data source: ${source.name}`);
  });

  const shutdown = () => {
    scheduler.stop();
    server.close(() => process.exit(0));
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  // Run cycle 0 immediately so the dashboard has data, then every 5 min.
  void scheduler.tick();
  scheduler.start();
}

main().catch((err) => {
  console.error("fatal", err);
  process.exit(1);
});

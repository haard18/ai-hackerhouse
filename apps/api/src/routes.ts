/**
 * REST routes. Thin handlers over Store + StakingService. Frontend (Aashwin)
 * consumes these. All money is paper.
 */

import { randomUUID } from "node:crypto";
import { Router } from "express";
import { SIGNUP_BONUS, type CycleResult } from "@ai-trading/shared";
import type { Store } from "./store.js";
import type { StakingService } from "./staking.js";
import type { CycleHistory } from "./history.js";
import { createUserLimiter, mutationLimiter } from "./security.js";

/** Coerce body input to a safe finite number in (0, max]. */
function positiveAmount(value: unknown, max = 1_000_000_000): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > max) return null;
  return n;
}

export interface MarketQuote {
  asset: string;
  price: number;
  changePct: number;
  /** Recent closes (oldest first) for sparklines. */
  history: number[];
}

export interface RouteDeps {
  store: Store;
  staking: StakingService;
  /** Returns the most recent cycle result for dashboards. */
  lastCycle: () => CycleResult | null;
  /** Model equity timeseries for charts. */
  history: CycleHistory;
  /** Live asset quotes (real feed prices + sparkline history). */
  market: () => Promise<MarketQuote[]>;
}

export function buildRoutes({ store, staking, lastCycle, history, market }: RouteDeps): Router {
  const r = Router();

  r.get("/health", (_req, res) => res.json({ ok: true }));

  // --- Models / leaderboard ---
  r.get("/models", async (_req, res) => {
    const models = await store.listModels();
    const board = models
      .map((m) => ({
        id: m.id,
        name: m.name,
        provider: m.provider,
        modelId: m.modelId,
        reasoningEffort:
          m.provider === "openai"
            ? (process.env.OPENAI_REASONING_EFFORT ?? "medium")
            : undefined,
        balance: m.balance,
        totalShares: m.totalShares,
        active: m.active,
      }))
      .sort((a, b) => b.balance - a.balance);
    res.json(board);
  });

  r.get("/models/:id", async (req, res) => {
    const m = await store.getModel(req.params.id);
    if (!m) return res.status(404).json({ error: "not found" });
    res.json(m);
  });

  // --- Users ---
  const HANDLE_RE = /^[a-zA-Z0-9_]{3,20}$/;
  r.post("/users", createUserLimiter, async (req, res) => {
    const handle = String(req.body?.handle ?? "").trim();
    if (!HANDLE_RE.test(handle)) {
      return res.status(400).json({
        error: "handle must be 3–20 chars: letters, numbers, underscore",
      });
    }
    // Reject already-taken usernames (case-insensitive).
    if (await store.getUserByHandle(handle)) {
      return res.status(409).json({ error: "username already taken" });
    }
    try {
      const user = await store.upsertUser({
        id: randomUUID(),
        handle,
        balance: SIGNUP_BONUS,
      });
      res.status(201).json(user);
    } catch {
      // Unique-constraint race → still report taken, never leak internals.
      res.status(409).json({ error: "username already taken" });
    }
  });

  r.get("/users/:id", async (req, res) => {
    const u = await store.getUser(req.params.id);
    if (!u) return res.status(404).json({ error: "not found" });
    const stakes = await store.listStakes({ userId: u.id });
    res.json({ ...u, stakes });
  });

  // --- Staking ---
  r.post("/models/:id/stake", mutationLimiter, async (req, res) => {
    const userId = String(req.body?.userId ?? "").trim();
    const amount = positiveAmount(req.body?.amount);
    if (!userId) return res.status(400).json({ error: "userId required" });
    if (amount === null) return res.status(400).json({ error: "invalid amount" });
    try {
      const stake = await staking.stake(userId, String(req.params.id), amount);
      res.status(201).json(stake);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  r.post("/models/:id/claim", mutationLimiter, async (req, res) => {
    const userId = String(req.body?.userId ?? "").trim();
    if (!userId) return res.status(400).json({ error: "userId required" });
    let shares: number | undefined;
    if (req.body?.shares !== undefined) {
      const parsed = positiveAmount(req.body.shares);
      if (parsed === null) return res.status(400).json({ error: "invalid shares" });
      shares = parsed;
    }
    try {
      const result = await staking.claim(userId, String(req.params.id), shares);
      res.json(result);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  r.get("/models/:id/stake/:userId", async (req, res) => {
    const value = await staking.positionValue(req.params.userId, req.params.id);
    res.json(value);
  });

  // --- Cycle / market ---
  r.get("/cycle/latest", (_req, res) => {
    const c = lastCycle();
    if (!c) return res.status(404).json({ error: "no cycle yet" });
    res.json(c);
  });

  // Model equity timeseries (aggregate index + per-model + cycle PnL charts).
  r.get("/history", async (req, res) => {
    const points = Math.max(2, Math.min(500, Number(req.query.points ?? 48)));
    const models = (await store.listModels()).map((m) => ({
      id: m.id,
      name: m.name,
    }));
    res.json({ models, points: history.recent(points) });
  });

  // Live asset quotes with real feed prices + sparkline history.
  r.get("/market", async (_req, res) => {
    try {
      res.json({ assets: await market() });
    } catch (e) {
      res.status(503).json({ error: (e as Error).message });
    }
  });

  return r;
}

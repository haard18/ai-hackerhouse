/**
 * REST routes. Thin handlers over Store + StakingService. Frontend (Aashwin)
 * consumes these. All money is paper.
 */

import { randomUUID } from "node:crypto";
import { Router } from "express";
import { SIGNUP_BONUS, type CycleResult } from "@ai-trading/shared";
import type { Store } from "./store.js";
import type { StakingService } from "./staking.js";

export interface RouteDeps {
  store: Store;
  staking: StakingService;
  /** Returns the most recent cycle result for dashboards. */
  lastCycle: () => CycleResult | null;
}

export function buildRoutes({ store, staking, lastCycle }: RouteDeps): Router {
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
  r.post("/users", async (req, res) => {
    const handle = String(req.body?.handle ?? "").trim();
    if (!handle) return res.status(400).json({ error: "handle required" });
    const user = await store.upsertUser({
      id: randomUUID(),
      handle,
      balance: SIGNUP_BONUS,
    });
    res.status(201).json(user);
  });

  r.get("/users/:id", async (req, res) => {
    const u = await store.getUser(req.params.id);
    if (!u) return res.status(404).json({ error: "not found" });
    const stakes = await store.listStakes({ userId: u.id });
    res.json({ ...u, stakes });
  });

  // --- Staking ---
  r.post("/models/:id/stake", async (req, res) => {
    try {
      const { userId, amount } = req.body ?? {};
      const stake = await staking.stake(String(userId), req.params.id, Number(amount));
      res.status(201).json(stake);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  r.post("/models/:id/claim", async (req, res) => {
    try {
      const { userId, shares } = req.body ?? {};
      const result = await staking.claim(
        String(userId),
        req.params.id,
        shares === undefined ? undefined : Number(shares),
      );
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

  return r;
}

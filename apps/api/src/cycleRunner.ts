/**
 * CycleRunner — the engine that runs every 5 minutes:
 *
 *   1. Resolve positions opened last cycle against the new snapshot's prices,
 *      realize paper PnL, and update each model's balance.
 *   2. Feed the new snapshot + system prompt to each active model; collect a
 *      decision per asset (LONG / SHORT / FLAT).
 *   3. Size and open new positions for the next cycle. Leverage is 1x, so the
 *      model's balance is split across its non-FLAT positions.
 *
 * Stake pool balances move with the model balance automatically because stakers
 * hold pool shares (see @ai-trading/shared `shares.ts`); no per-staker math runs
 * each cycle — value is computed on read/claim.
 */

import {
  buildSnapshot,
  type MarketDataSource,
} from "@ai-trading/data-feed";
import {
  createAdapterRegistry,
  getAdapter,
  parseDecision,
} from "@ai-trading/models";
import {
  ASSETS,
  positionPnl,
  roundMoney,
  type AssetSymbol,
  type CycleResult,
  type ModelCycleOutcome,
  type Position,
} from "@ai-trading/shared";
import type { Store } from "./store.js";

export class CycleRunner {
  private registry = createAdapterRegistry();

  constructor(
    private readonly store: Store,
    private readonly source: MarketDataSource,
  ) {}

  /** Run a single cycle end-to-end. Safe to call from the scheduler. */
  async runCycle(cycle: number, timestamp: number): Promise<CycleResult> {
    const snapshot = await buildSnapshot(this.source, cycle, timestamp);

    // 1) Resolve last cycle's open positions at the new prices.
    const open = await this.store.getOpenPositions();
    const pnlByModel = new Map<string, number>();
    for (const pos of open) {
      // A missing/zero price means "no fresh data" — book 0, never a phantom
      // -100% (which `?? entryPrice` would NOT catch, since 0 is a valid number).
      const live = snapshot.assets[pos.asset]?.price;
      const exitPrice = live && live > 0 ? live : pos.entryPrice;
      const pnl = positionPnl(pos.side, pos.notional, pos.entryPrice, exitPrice);
      pnlByModel.set(pos.modelId, (pnlByModel.get(pos.modelId) ?? 0) + pnl);
    }

    const models = (await this.store.listModels()).filter((m) => m.active);
    const perModel: ModelCycleOutcome[] = [];
    const newOpen: Position[] = [];

    const modelRuns = await Promise.all(models.map(async (model) => {
      // Apply realized PnL atomically (relative increment), rounded to cents,
      // so a concurrent stake mid-cycle isn't clobbered.
      const pnl = roundMoney(pnlByModel.get(model.id) ?? 0);
      // Capture balanceAfter BEFORE mutating (an in-memory store hands back the
      // live object, so adjust would otherwise double-count when we re-read).
      const balanceAfter = roundMoney(model.balance + pnl);
      if (pnl !== 0) await this.store.adjustModelPool(model.id, pnl, 0);

      // 2) Ask the model for its next decision (one bad model can't sink the cycle).
      let decision;
      try {
        const adapter = getAdapter(this.registry, model.provider);
        decision = await adapter.decide({ config: model, snapshot });
      } catch (err) {
        decision = parseDecision(
          `Adapter ${model.provider} failed: ${(err as Error).message}`,
          model.id,
          snapshot.cycle,
        );
      }

      // 3) Open new positions: split balance equally across non-FLAT picks.
      // Only open against a real (>0) price; skip assets with no fresh data.
      const live = decision.decisions.filter(
        (d) => d.side !== "FLAT" && (snapshot.assets[d.asset]?.price ?? 0) > 0,
      );
      const perNotional = live.length > 0 ? balanceAfter / live.length : 0;
      const positions: Position[] = [];
      for (const d of live) {
        positions.push({
          modelId: model.id,
          asset: d.asset,
          side: d.side,
          notional: perNotional,
          entryPrice: snapshot.assets[d.asset].price,
          cycle,
        });
      }

      return {
        outcome: { modelId: model.id, decision, pnl, balanceAfter },
        positions,
      };
    }));

    for (const run of modelRuns) {
      perModel.push(run.outcome);
      newOpen.push(...run.positions);
    }

    await this.store.setOpenPositions(newOpen);

    const prices = Object.fromEntries(
      ASSETS.map((a) => [a, snapshot.assets[a]?.price ?? 0]),
    ) as Record<AssetSymbol, number>;

    return {
      cycle,
      timestamp,
      snapshotRef: snapshot.timestamp,
      perModel,
      prices,
    };
  }
}

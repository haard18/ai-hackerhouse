/**
 * Staking service — users deposit free paper money into a model's pool and
 * receive shares; they claim shares back for paper at any time (a "cycle end").
 * All pool math lives in @ai-trading/shared `shares.ts`.
 *
 * Balance/share writes go through the store's ATOMIC relative updates
 * (adjust*), so a stake landing mid-cycle or two concurrent stakes/claims
 * compose instead of clobbering each other. Money is rounded to cents at every
 * write to prevent binary-float drift.
 */

import { randomUUID } from "node:crypto";
import {
  MIN_STAKE,
  applyClaim,
  applyDeposit,
  claimValue,
  gte,
  roundMoney,
} from "@ai-trading/shared";
import type { Store } from "./store.js";

/** Share quantity within this of the full stake counts as a full exit. */
const SHARE_EPSILON = 1e-6;

export class StakingService {
  constructor(private readonly store: Store) {}

  /** Deposit `amount` of a user's free balance into a model's pool. */
  async stake(userId: string, modelId: string, amount: number) {
    if (!Number.isFinite(amount) || amount < MIN_STAKE) {
      throw new Error(`minimum stake is ${MIN_STAKE}`);
    }
    amount = roundMoney(amount);
    const user = await this.store.getUser(userId);
    if (!user) throw new Error("user not found");
    if (!gte(user.balance, amount)) throw new Error("insufficient balance");
    const model = await this.store.getModel(modelId);
    if (!model) throw new Error("model not found");

    const { sharesMinted } = applyDeposit(amount, model.balance, model.totalShares);

    // Atomic relative updates — safe under concurrency.
    await this.store.adjustUserBalance(userId, -amount);
    await this.store.adjustModelPool(modelId, amount, sharesMinted);

    const existing = await this.store.getStake(userId, modelId);
    return this.store.upsertStake({
      id: existing?.id ?? randomUUID(),
      userId,
      modelId,
      shares: (existing?.shares ?? 0) + sharesMinted,
      contributed: roundMoney((existing?.contributed ?? 0) + amount),
    });
  }

  /** Claim back shares for their current paper value. Omit `shares` to claim all. */
  async claim(userId: string, modelId: string, shares?: number) {
    const stake = await this.store.getStake(userId, modelId);
    if (!stake) throw new Error("no stake found");
    const model = await this.store.getModel(modelId);
    if (!model) throw new Error("model not found");
    const user = await this.store.getUser(userId);
    if (!user) throw new Error("user not found");

    let toClaim = shares ?? stake.shares;
    if (!Number.isFinite(toClaim) || toClaim <= 0 || toClaim > stake.shares + SHARE_EPSILON) {
      throw new Error("invalid share amount");
    }
    // Claiming (within dust of) the whole stake redeems all of it, so pool
    // shares and the stake row stay consistent (no stranded sliver).
    if (toClaim >= stake.shares - SHARE_EPSILON) toClaim = stake.shares;

    const { payout } = applyClaim(toClaim, model.balance, model.totalShares);
    const roundedPayout = roundMoney(payout);

    await this.store.adjustModelPool(modelId, -roundedPayout, -toClaim);
    await this.store.adjustUserBalance(userId, roundedPayout);

    const remaining = stake.shares - toClaim;
    if (remaining <= SHARE_EPSILON) {
      await this.store.removeStake(stake.id);
    } else {
      await this.store.upsertStake({
        ...stake,
        shares: remaining,
        // Reduce cost basis proportionally to shares redeemed.
        contributed: roundMoney(stake.contributed * (remaining / stake.shares)),
      });
    }
    return { payout: roundedPayout, remainingShares: Math.max(0, remaining) };
  }

  /** Current paper value of a user's stake in a model. */
  async positionValue(userId: string, modelId: string) {
    const stake = await this.store.getStake(userId, modelId);
    const model = await this.store.getModel(modelId);
    if (!stake || !model) return { shares: 0, value: 0, contributed: 0 };
    return {
      shares: stake.shares,
      contributed: stake.contributed,
      value: roundMoney(claimValue(stake.shares, model.balance, model.totalShares)),
    };
  }
}

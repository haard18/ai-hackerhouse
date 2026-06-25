/**
 * Staking service — users deposit free paper money into a model's pool and
 * receive shares; they claim shares back for paper at any time (a "cycle end").
 * All pool math lives in @ai-trading/shared `shares.ts`.
 */

import { randomUUID } from "node:crypto";
import {
  MIN_STAKE,
  applyClaim,
  applyDeposit,
  claimValue,
} from "@ai-trading/shared";
import type { Store } from "./store.js";

export class StakingService {
  constructor(private readonly store: Store) {}

  /** Deposit `amount` of a user's free balance into a model's pool. */
  async stake(userId: string, modelId: string, amount: number) {
    if (amount < MIN_STAKE) throw new Error(`minimum stake is ${MIN_STAKE}`);
    const user = await this.store.getUser(userId);
    if (!user) throw new Error("user not found");
    if (user.balance < amount) throw new Error("insufficient balance");
    const model = await this.store.getModel(modelId);
    if (!model) throw new Error("model not found");

    const { sharesMinted, newPoolBalance, newTotalShares } = applyDeposit(
      amount,
      model.balance,
      model.totalShares,
    );

    await this.store.updateUserBalance(userId, user.balance - amount);
    await this.store.updateModelPool(modelId, newPoolBalance, newTotalShares);

    const existing = await this.store.getStake(userId, modelId);
    const stake = await this.store.upsertStake({
      id: existing?.id ?? randomUUID(),
      userId,
      modelId,
      shares: (existing?.shares ?? 0) + sharesMinted,
      contributed: (existing?.contributed ?? 0) + amount,
    });
    return stake;
  }

  /** Claim back shares for their current paper value. Omit `shares` to claim all. */
  async claim(userId: string, modelId: string, shares?: number) {
    const stake = await this.store.getStake(userId, modelId);
    if (!stake) throw new Error("no stake found");
    const toClaim = shares ?? stake.shares;
    if (toClaim <= 0 || toClaim > stake.shares) throw new Error("invalid share amount");
    const model = await this.store.getModel(modelId);
    if (!model) throw new Error("model not found");
    const user = await this.store.getUser(userId);
    if (!user) throw new Error("user not found");

    const { payout, newPoolBalance, newTotalShares } = applyClaim(
      toClaim,
      model.balance,
      model.totalShares,
    );

    await this.store.updateModelPool(modelId, newPoolBalance, newTotalShares);
    await this.store.updateUserBalance(userId, user.balance + payout);

    const remaining = stake.shares - toClaim;
    if (remaining <= 1e-9) {
      await this.store.removeStake(stake.id);
    } else {
      await this.store.upsertStake({
        ...stake,
        shares: remaining,
        contributed: stake.contributed * (remaining / stake.shares),
      });
    }
    return { payout, remainingShares: Math.max(0, remaining) };
  }

  /** Current paper value of a user's stake in a model. */
  async positionValue(userId: string, modelId: string) {
    const stake = await this.store.getStake(userId, modelId);
    const model = await this.store.getModel(modelId);
    if (!stake || !model) return { shares: 0, value: 0, contributed: 0 };
    return {
      shares: stake.shares,
      contributed: stake.contributed,
      value: claimValue(stake.shares, model.balance, model.totalShares),
    };
  }
}

/**
 * In-memory Store implementation. Lets the engine + API run with no database.
 * State is lost on restart. Replace with PrismaStore for persistence.
 */

import { randomUUID } from "node:crypto";
import {
  STARTING_BALANCE,
  type Position,
  type Stake,
  type User,
} from "@ai-trading/shared";
import type { ModelRecord, Store } from "./store.js";
import { SEED_MODELS } from "./seedModels.js";

export class InMemoryStore implements Store {
  private models = new Map<string, ModelRecord>();
  private users = new Map<string, User>();
  private stakes = new Map<string, Stake>();
  private openPositions: Position[] = [];

  constructor() {
    for (const m of SEED_MODELS) {
      this.models.set(m.id, {
        ...m,
        balance: STARTING_BALANCE,
        totalShares: STARTING_BALANCE, // seed shares == balance (price 1.0)
        active: true,
      });
    }
  }

  async listModels(): Promise<ModelRecord[]> {
    return [...this.models.values()];
  }
  async getModel(id: string): Promise<ModelRecord | undefined> {
    return this.models.get(id);
  }
  async updateModelPool(id: string, balance: number, totalShares: number) {
    const m = this.models.get(id);
    if (m) {
      m.balance = balance;
      m.totalShares = totalShares;
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }
  async getUserByHandle(handle: string): Promise<User | undefined> {
    const lower = handle.toLowerCase();
    return [...this.users.values()].find((u) => u.handle.toLowerCase() === lower);
  }
  async upsertUser(user: User): Promise<User> {
    this.users.set(user.id, user);
    return user;
  }
  async updateUserBalance(id: string, balance: number) {
    const u = this.users.get(id);
    if (u) u.balance = balance;
  }

  async listStakes(filter: { userId?: string; modelId?: string }): Promise<Stake[]> {
    return [...this.stakes.values()].filter(
      (s) =>
        (!filter.userId || s.userId === filter.userId) &&
        (!filter.modelId || s.modelId === filter.modelId),
    );
  }
  async getStake(userId: string, modelId: string): Promise<Stake | undefined> {
    return [...this.stakes.values()].find(
      (s) => s.userId === userId && s.modelId === modelId,
    );
  }
  async upsertStake(stake: Stake): Promise<Stake> {
    const id = stake.id || randomUUID();
    const withId = { ...stake, id };
    this.stakes.set(id, withId);
    return withId;
  }
  async removeStake(id: string) {
    this.stakes.delete(id);
  }

  async getOpenPositions(): Promise<Position[]> {
    return this.openPositions;
  }
  async setOpenPositions(positions: Position[]) {
    this.openPositions = positions;
  }
}

/**
 * Storage abstraction. The cycle runner and routes talk to this interface so
 * the engine runs with zero infra (InMemoryStore) and later swaps to Prisma
 * (PrismaStore — TODO) without touching engine logic.
 */

import type { ModelConfig, Position, Stake, User } from "@ai-trading/shared";

export interface ModelRecord extends ModelConfig {
  balance: number;
  totalShares: number;
  active: boolean;
}

export interface Store {
  listModels(): Promise<ModelRecord[]>;
  getModel(id: string): Promise<ModelRecord | undefined>;
  updateModelPool(id: string, balance: number, totalShares: number): Promise<void>;

  getUser(id: string): Promise<User | undefined>;
  getUserByHandle(handle: string): Promise<User | undefined>;
  upsertUser(user: User): Promise<User>;
  updateUserBalance(id: string, balance: number): Promise<void>;

  listStakes(filter: { userId?: string; modelId?: string }): Promise<Stake[]>;
  getStake(userId: string, modelId: string): Promise<Stake | undefined>;
  upsertStake(stake: Stake): Promise<Stake>;
  removeStake(id: string): Promise<void>;

  /** Open positions carried into the next cycle for PnL resolution. */
  getOpenPositions(): Promise<Position[]>;
  setOpenPositions(positions: Position[]): Promise<void>;
}

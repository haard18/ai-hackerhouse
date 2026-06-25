/**
 * PrismaStore — persistent Store backed by Postgres (Neon). Model balances,
 * stakes, users, and open positions survive restarts/redeploys, so the engine
 * resumes exactly where it left off instead of resetting to $10k / cycle 0.
 */

import {
  STARTING_BALANCE,
  type ModelProvider,
  type Position,
  type PositionSide,
  type Stake,
  type User,
} from "@ai-trading/shared";
import type { PrismaClient } from "@prisma/client";
import { Provider, Side } from "@prisma/client";
import type { ModelRecord, Store } from "./store.js";
import { SEED_MODELS } from "./seedModels.js";

export class PrismaStore implements Store {
  constructor(private readonly prisma: PrismaClient) {}

  /** Insert the roster once. Existing rows keep their runtime balance/shares. */
  async seed(): Promise<void> {
    for (const m of SEED_MODELS) {
      await this.prisma.model.upsert({
        where: { id: m.id },
        create: {
          id: m.id,
          name: m.name,
          provider: m.provider as Provider,
          modelId: m.modelId,
          systemPrompt: m.systemPrompt,
          balance: STARTING_BALANCE,
          totalShares: STARTING_BALANCE, // seed shares == balance (price 1.0)
          active: true,
        },
        // Only refresh config — never clobber persisted balance/shares.
        update: {
          name: m.name,
          provider: m.provider as Provider,
          modelId: m.modelId,
          systemPrompt: m.systemPrompt,
        },
      });
    }
  }

  /** Highest recorded cycle, so the scheduler resumes at cycle+1. */
  async lastCycle(): Promise<number> {
    const row = await this.prisma.equityPoint.findFirst({
      orderBy: { cycle: "desc" },
      select: { cycle: true },
    });
    return row?.cycle ?? -1;
  }

  async listModels(): Promise<ModelRecord[]> {
    const rows = await this.prisma.model.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider as ModelProvider,
      modelId: m.modelId,
      systemPrompt: m.systemPrompt,
      balance: m.balance,
      totalShares: m.totalShares,
      active: m.active,
    }));
  }

  async getModel(id: string): Promise<ModelRecord | undefined> {
    const m = await this.prisma.model.findUnique({ where: { id } });
    if (!m) return undefined;
    return {
      id: m.id,
      name: m.name,
      provider: m.provider as ModelProvider,
      modelId: m.modelId,
      systemPrompt: m.systemPrompt,
      balance: m.balance,
      totalShares: m.totalShares,
      active: m.active,
    };
  }

  async updateModelPool(id: string, balance: number, totalShares: number): Promise<void> {
    await this.prisma.model.update({ where: { id }, data: { balance, totalShares } });
  }

  async getUser(id: string): Promise<User | undefined> {
    const u = await this.prisma.user.findUnique({ where: { id } });
    return u ? { id: u.id, handle: u.handle, balance: u.balance } : undefined;
  }

  async getUserByHandle(handle: string): Promise<User | undefined> {
    const u = await this.prisma.user.findFirst({
      where: { handle: { equals: handle, mode: "insensitive" } },
    });
    return u ? { id: u.id, handle: u.handle, balance: u.balance } : undefined;
  }

  async upsertUser(user: User): Promise<User> {
    const u = await this.prisma.user.upsert({
      where: { id: user.id },
      create: { id: user.id, handle: user.handle, balance: user.balance },
      update: { handle: user.handle, balance: user.balance },
    });
    return { id: u.id, handle: u.handle, balance: u.balance };
  }

  async updateUserBalance(id: string, balance: number): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { balance } });
  }

  async listStakes(filter: { userId?: string; modelId?: string }): Promise<Stake[]> {
    const rows = await this.prisma.stake.findMany({
      where: { userId: filter.userId, modelId: filter.modelId },
    });
    return rows.map(mapStake);
  }

  async getStake(userId: string, modelId: string): Promise<Stake | undefined> {
    const s = await this.prisma.stake.findUnique({
      where: { userId_modelId: { userId, modelId } },
    });
    return s ? mapStake(s) : undefined;
  }

  async upsertStake(stake: Stake): Promise<Stake> {
    const s = await this.prisma.stake.upsert({
      where: { userId_modelId: { userId: stake.userId, modelId: stake.modelId } },
      create: {
        userId: stake.userId,
        modelId: stake.modelId,
        shares: stake.shares,
        contributed: stake.contributed,
      },
      update: { shares: stake.shares, contributed: stake.contributed },
    });
    return mapStake(s);
  }

  async removeStake(id: string): Promise<void> {
    await this.prisma.stake.delete({ where: { id } }).catch(() => {});
  }

  async getOpenPositions(): Promise<Position[]> {
    const rows = await this.prisma.openPosition.findMany();
    return rows.map((p) => ({
      modelId: p.modelId,
      asset: p.asset as Position["asset"],
      side: p.side as PositionSide,
      notional: p.notional,
      entryPrice: p.entryPrice,
      cycle: p.cycle,
    }));
  }

  async setOpenPositions(positions: Position[]): Promise<void> {
    // Replace the whole set atomically each cycle.
    await this.prisma.$transaction([
      this.prisma.openPosition.deleteMany({}),
      this.prisma.openPosition.createMany({
        data: positions.map((p) => ({
          modelId: p.modelId,
          asset: p.asset,
          side: p.side as Side,
          notional: p.notional,
          entryPrice: p.entryPrice,
          cycle: p.cycle,
        })),
      }),
    ]);
  }
}

function mapStake(s: {
  id: string;
  userId: string;
  modelId: string;
  shares: number;
  contributed: number;
}): Stake {
  return {
    id: s.id,
    userId: s.userId,
    modelId: s.modelId,
    shares: s.shares,
    contributed: s.contributed,
  };
}

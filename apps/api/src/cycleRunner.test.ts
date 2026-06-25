import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ASSETS,
  type AssetMarketData,
  type AssetSymbol,
  type Candle,
  type ModelConfig,
  type Position,
  type Stake,
  type User,
} from "@ai-trading/shared";
import type { MarketDataSource } from "@ai-trading/data-feed";
import { CycleRunner } from "./cycleRunner.js";
import type { ModelRecord, Store } from "./store.js";

test("cycle runner realizes PnL and sizes new mock positions equally", async () => {
  const store = new TestStore([
    {
      id: "m_mock",
      name: "Mock",
      provider: "mock",
      modelId: "mock",
      systemPrompt: "Momentum.",
      balance: 1_000,
      totalShares: 1_000,
      active: true,
    },
  ]);
  await store.setOpenPositions([
    {
      modelId: "m_mock",
      asset: "BTC",
      side: "LONG",
      notional: 100,
      entryPrice: 100,
      cycle: 0,
    },
  ]);

  const runner = new CycleRunner(store, new TestSource(110));
  const result = await runner.runCycle(1, 1_700_000_000_000);

  assert.equal(result.perModel.length, 1);
  assert.equal(result.perModel[0]?.pnl, 10);
  assert.equal(result.perModel[0]?.balanceAfter, 1_010);

  const open = await store.getOpenPositions();
  assert.equal(open.length, ASSETS.length);
  assert.ok(open.every((p) => p.side === "LONG"));
  assert.ok(open.every((p) => Math.abs(p.notional - 202) < 1e-9));
});

class TestSource implements MarketDataSource {
  readonly name = "test";

  constructor(private readonly price: number) {}

  async getAssetData(asset: AssetSymbol): Promise<AssetMarketData> {
    return {
      asset,
      price: this.price,
      candles: [
        candle(asset, this.price - 2),
        candle(asset, this.price),
      ],
    };
  }
}

class TestStore implements Store {
  private positions: Position[] = [];

  constructor(private readonly models: ModelRecord[]) {}

  async listModels(): Promise<ModelRecord[]> {
    return this.models;
  }

  async getModel(id: string): Promise<ModelRecord | undefined> {
    return this.models.find((m) => m.id === id);
  }

  async updateModelPool(id: string, balance: number, totalShares: number): Promise<void> {
    const model = this.models.find((m) => m.id === id);
    if (model) {
      model.balance = balance;
      model.totalShares = totalShares;
    }
  }

  async getOpenPositions(): Promise<Position[]> {
    return this.positions;
  }

  async setOpenPositions(positions: Position[]): Promise<void> {
    this.positions = positions;
  }

  async getUser(): Promise<User | undefined> {
    return undefined;
  }

  async upsertUser(user: User): Promise<User> {
    return user;
  }

  async updateUserBalance(): Promise<void> {}

  async listStakes(): Promise<Stake[]> {
    return [];
  }

  async getStake(): Promise<Stake | undefined> {
    return undefined;
  }

  async upsertStake(stake: Stake): Promise<Stake> {
    return stake;
  }

  async removeStake(): Promise<void> {}
}

function candle(asset: AssetSymbol, close: number): Candle {
  return {
    asset,
    openTime: 0,
    open: close - 1,
    high: close + 1,
    low: close - 2,
    close,
    volume: 1_000,
  };
}

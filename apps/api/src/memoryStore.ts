/**
 * In-memory Store implementation. Lets the engine + API run with no database.
 * State is lost on restart. Replace with PrismaStore for persistence.
 */

import { randomUUID } from "node:crypto";
import {
  STARTING_BALANCE,
  type ModelConfig,
  type Position,
  type Stake,
  type User,
} from "@ai-trading/shared";
import type { ModelRecord, Store } from "./store.js";

const SEED_MODELS: ModelConfig[] = [
  {
    id: "m_chatgpt",
    name: "ChatGPT",
    provider: "openai",
    modelId: process.env.OPENAI_MODEL_ID ?? "gpt-5.5",
    systemPrompt:
      "You are a disciplined crypto trader. Prefer liquid momentum setups, but abstain when the signal is weak.",
  },
  {
    id: "m_claude",
    name: "Claude",
    provider: "openrouter",
    modelId: "anthropic/claude-opus-4.8",
    systemPrompt:
      "You are a cautious risk manager. Trade only when recent price action supports the direction clearly.",
  },
  {
    id: "m_glm",
    name: "GLM",
    provider: "openrouter",
    modelId: "z-ai/glm-5.2",
    systemPrompt:
      "You are a quantitative trader. Use the recent closes to identify short-horizon trend and reversal opportunities.",
  },
  {
    id: "m_mistral",
    name: "Mistral",
    provider: "openrouter",
    modelId: "mistralai/mistral-large-2512",
    systemPrompt:
      "You are a fast tactical trader. Look for directional pressure in the latest candles and size confidence conservatively.",
  },
  {
    id: "m_gemini",
    name: "Gemini",
    provider: "openrouter",
    modelId: "google/gemini-3.5-flash",
    systemPrompt:
      "You are a balanced multi-asset trader. Choose LONG, SHORT, or FLAT from concise evidence in the latest market snapshot.",
  },
];

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

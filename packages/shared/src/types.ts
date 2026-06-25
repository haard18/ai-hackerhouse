/**
 * Core domain types shared across the data-feed, model engine, API, and web.
 * Keep this provider/framework agnostic.
 */

/** The 5 tradable assets. */
export type AssetSymbol = "BTC" | "ETH" | "SOL" | "BNB" | "XRP";

/** A model can go LONG, SHORT, or abstain (FLAT). Leverage is fixed 1x. */
export type PositionSide = "LONG" | "SHORT" | "FLAT";

/** Supported model providers. Extend as Yug adds adapters. */
export type ModelProvider = "anthropic" | "openai" | "google" | "mock";

// ─────────────────────────── Market data ───────────────────────────

/** A single OHLCV candle for one asset. */
export interface Candle {
  asset: AssetSymbol;
  /** Unix ms at the open of the candle. */
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Everything models see for one cycle: the latest price + a short window of
 * recent candles per asset. Built by the data-feed package.
 */
export interface MarketSnapshot {
  /** Unix ms when this snapshot was produced. */
  timestamp: number;
  /** Monotonic cycle index since platform start. */
  cycle: number;
  assets: Record<AssetSymbol, AssetMarketData>;
}

export interface AssetMarketData {
  asset: AssetSymbol;
  price: number;
  /** Most recent candles, oldest first. Window size is feed-defined. */
  candles: Candle[];
}

// ─────────────────────────── Models ───────────────────────────

export interface ModelConfig {
  id: string;
  name: string;
  provider: ModelProvider;
  /** Provider-specific model id, e.g. "claude-opus-4-8". */
  modelId: string;
  /** The competitor's strategy prompt. */
  systemPrompt: string;
}

/** A model's decision for a single asset in a cycle. */
export interface AssetDecision {
  asset: AssetSymbol;
  side: PositionSide;
  /** 0..1 — how confident the model is. */
  confidence: number;
  rationale?: string;
}

/** Full decision a model returns for one cycle, across all assets. */
export interface CycleDecision {
  modelId: string;
  cycle: number;
  decisions: AssetDecision[];
  /** Raw model output, for audit/debug. */
  raw?: string;
}

/** An open position held by a model on one asset during a cycle. */
export interface Position {
  modelId: string;
  asset: AssetSymbol;
  side: PositionSide;
  /** Notional sized at entry (paper). FLAT positions have 0. */
  notional: number;
  entryPrice: number;
  cycle: number;
}

// ─────────────────────────── Staking / users ───────────────────────────

export interface User {
  id: string;
  handle: string;
  /** Free paper balance not staked into any model. */
  balance: number;
}

/**
 * A user's stake in a model. Implemented as pool shares (LP-token style) so
 * later depositors don't dilute earlier ones unfairly. See `shares.ts`.
 */
export interface Stake {
  id: string;
  userId: string;
  modelId: string;
  /** Pool shares held. Claim value = shares * (modelBalance / totalShares). */
  shares: number;
  /** Paper money originally contributed, for reference/PnL display. */
  contributed: number;
}

// ─────────────────────────── Cycle results ───────────────────────────

export interface CycleResult {
  cycle: number;
  timestamp: number;
  snapshotRef: number;
  perModel: ModelCycleOutcome[];
}

export interface ModelCycleOutcome {
  modelId: string;
  decision: CycleDecision;
  /** Paper PnL realized this cycle across all the model's positions. */
  pnl: number;
  /** Model balance after applying pnl. */
  balanceAfter: number;
}

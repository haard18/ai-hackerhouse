/**
 * ModelAdapter — provider-agnostic contract for turning a market snapshot into
 * a trading decision. Every provider (Anthropic, OpenAI, Google, ...) implements
 * this. Owner: Yug.
 */

import type {
  CycleDecision,
  MarketSnapshot,
  ModelConfig,
} from "@ai-trading/shared";

export interface DecisionRequest {
  config: ModelConfig;
  snapshot: MarketSnapshot;
}

export interface ModelAdapter {
  readonly provider: string;
  /**
   * Run one inference: feed the snapshot + system prompt, return a parsed
   * decision for all 5 assets. Must never throw on a bad model reply — fall
   * back to all-FLAT (abstain) and surface the raw output for audit.
   */
  decide(req: DecisionRequest): Promise<CycleDecision>;
}

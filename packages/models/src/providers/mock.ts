/**
 * MockModelAdapter — no API calls. Produces a deterministic decision from the
 * snapshot (simple momentum: long if last close > prior close). Lets the whole
 * cycle pipeline run end-to-end with zero credentials.
 */

import {
  ASSETS,
  type AssetDecision,
  type CycleDecision,
} from "@ai-trading/shared";
import type { DecisionRequest, ModelAdapter } from "../adapter.js";

export class MockModelAdapter implements ModelAdapter {
  readonly provider = "mock";

  async decide({ config, snapshot }: DecisionRequest): Promise<CycleDecision> {
    const decisions: AssetDecision[] = ASSETS.map((asset) => {
      const candles = snapshot.assets[asset].candles;
      const last = candles[candles.length - 1]?.close ?? 0;
      const prev = candles[candles.length - 2]?.close ?? last;
      const side = last > prev ? "LONG" : last < prev ? "SHORT" : "FLAT";
      return {
        asset,
        side,
        confidence: 0.5,
        rationale: "mock momentum",
      };
    });
    return {
      modelId: config.id,
      cycle: snapshot.cycle,
      decisions,
      raw: "mock",
    };
  }
}

/**
 * Builds the user-facing prompt and parses the model's reply into a decision.
 * Shared by every provider adapter so the contract (and the JSON schema we ask
 * the model for) stays identical across providers.
 */

import {
  ASSETS,
  type AssetDecision,
  type CycleDecision,
  type MarketSnapshot,
  type PositionSide,
} from "@ai-trading/shared";

/** The instruction block appended to each competitor's own system prompt. */
export const DECISION_PROTOCOL = `You are trading 5 crypto assets on paper money. Leverage is fixed at 1x.
For EACH asset decide one of: LONG, SHORT, or FLAT (abstain).
Respond with ONLY a JSON object, no prose, of the form:
{"decisions":[{"asset":"BTC","side":"LONG","confidence":0.7,"rationale":"..."}, ...]}
Include all 5 assets. confidence is 0..1.`;

/** Render the snapshot into a compact, model-readable block. */
export function renderSnapshot(snapshot: MarketSnapshot): string {
  const lines = ASSETS.map((asset) => {
    const a = snapshot.assets[asset];
    const recent = a.candles.slice(-6).map((c) => c.close.toFixed(4)).join(", ");
    return `${asset}: price=${a.price.toFixed(4)} recentCloses=[${recent}]`;
  });
  return `Cycle ${snapshot.cycle} @ ${new Date(snapshot.timestamp).toISOString()}\n${lines.join("\n")}`;
}

export function buildUserPrompt(snapshot: MarketSnapshot): string {
  return `${renderSnapshot(snapshot)}\n\n${DECISION_PROTOCOL}`;
}

const VALID_SIDES: PositionSide[] = ["LONG", "SHORT", "FLAT"];

/**
 * Parse a model reply into a CycleDecision. Tolerant: anything malformed for a
 * given asset degrades to FLAT. Never throws.
 */
export function parseDecision(
  raw: string,
  modelId: string,
  cycle: number,
): CycleDecision {
  const byAsset = new Map<string, AssetDecision>();
  try {
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    const slice = jsonStart >= 0 ? raw.slice(jsonStart, jsonEnd + 1) : raw;
    const parsed = JSON.parse(slice) as { decisions?: unknown };
    if (Array.isArray(parsed.decisions)) {
      for (const d of parsed.decisions as Record<string, unknown>[]) {
        const asset = String(d.asset ?? "");
        const side = String(d.side ?? "FLAT").toUpperCase() as PositionSide;
        if (!ASSETS.includes(asset as never)) continue;
        byAsset.set(asset, {
          asset: asset as never,
          side: VALID_SIDES.includes(side) ? side : "FLAT",
          confidence: clamp01(Number(d.confidence ?? 0)),
          rationale: d.rationale ? String(d.rationale) : undefined,
        });
      }
    }
  } catch {
    // fall through — everything defaults to FLAT below
  }

  const decisions: AssetDecision[] = ASSETS.map(
    (asset) =>
      byAsset.get(asset) ?? { asset, side: "FLAT", confidence: 0 },
  );

  return { modelId, cycle, decisions, raw };
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Paper PnL calculation for a single position over one cycle.
 * Leverage is fixed at 1x, so notional == capital committed.
 */

import { LEVERAGE } from "./constants.js";
import type { PositionSide } from "./types.js";

/**
 * Realized paper PnL for holding `notional` of an asset from `entryPrice` to
 * `exitPrice` on the given side. FLAT (abstain) always returns 0.
 */
export function positionPnl(
  side: PositionSide,
  notional: number,
  entryPrice: number,
  exitPrice: number,
): number {
  if (side === "FLAT" || notional <= 0 || entryPrice <= 0) return 0;
  const pctMove = (exitPrice - entryPrice) / entryPrice;
  const direction = side === "LONG" ? 1 : -1;
  return notional * pctMove * direction * LEVERAGE;
}

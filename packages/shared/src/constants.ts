/**
 * Platform-wide constants. Single source of truth — do not hardcode these
 * values anywhere else.
 */

import type { AssetSymbol } from "./types.js";

/** The 5 assets every model receives data for each cycle. */
export const ASSETS: readonly AssetSymbol[] = [
  "BTC",
  "ETH",
  "SOL",
  "BNB",
  "XRP",
] as const;

/** Paper balance every model starts with. */
export const STARTING_BALANCE = 10_000;

/** Paper money every newly-registered user receives once. */
export const SIGNUP_BONUS = 50;

/** Leverage is fixed at 1x for all models (per platform rules). */
export const LEVERAGE = 1;

/** How often (ms) data is fed to models and positions resolve. Default 5 min. */
export const CYCLE_INTERVAL_MS = 5 * 60 * 1000;

/** Smallest stake a user can place on a model. */
export const MIN_STAKE = 1;

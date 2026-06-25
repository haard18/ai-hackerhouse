import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyClaim,
  applyDeposit,
  claimValue,
  ownershipFraction,
} from "./shares.js";

test("first depositor into a losing pool owns spec'd fraction", () => {
  // Model down to 9000, no stakers yet. Seed shares == balance.
  const balance = 9_000;
  const totalShares = 9_000;
  const { sharesMinted, newPoolBalance, newTotalShares } = applyDeposit(
    10,
    balance,
    totalShares,
  );
  // ~10/9000 ownership of the resulting pool, per spec.
  assert.ok(Math.abs(ownershipFraction(sharesMinted, newTotalShares) - 10 / 9010) < 1e-9);
  assert.equal(newPoolBalance, 9_010);
});

test("staker gains when the model becomes profitable", () => {
  const { sharesMinted } = applyDeposit(10, 9_000, 9_000);
  // Pool later climbs to 18,020 (price doubled-ish). Value should roughly double.
  const value = claimValue(sharesMinted, 18_020, 9_010);
  assert.ok(value > 19 && value < 21, `expected ~20, got ${value}`);
});

test("deposit then claim is roughly value-neutral with no PnL", () => {
  const { sharesMinted, newPoolBalance, newTotalShares } = applyDeposit(
    50,
    11_000,
    11_000,
  );
  const { payout } = applyClaim(sharesMinted, newPoolBalance, newTotalShares);
  assert.ok(Math.abs(payout - 50) < 1e-6);
});

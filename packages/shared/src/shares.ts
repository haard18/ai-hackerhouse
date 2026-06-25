/**
 * Staking / profit-share math.
 *
 * Spec (from product): a user's share of a model is the % of the model's
 * balance they contributed. If a model sits at 9,000 (down from 10k) and you
 * add $10, you own ~10/9000 of the pool; if it's at 11,000, you own ~10/11000.
 * When the balance later moves, your claimable value moves with your share.
 *
 * We implement this as pool shares (like LP tokens) instead of storing a raw
 * percentage. Reason: percentages don't compose when many users deposit and
 * the balance drifts every cycle — they'd need constant renormalization and
 * early stakers would get diluted. With shares:
 *
 *   sharePrice          = poolBalance / totalShares
 *   sharesMinted(X)     = X / sharePrice           (deposit X paper)
 *   claimValue(shares)  = shares * sharePrice
 *
 * A deposit of X into a pool at balance B mints X*totalShares/B shares, giving
 * ownership X/(B+X) of the new pool — matching the spec's "contribution % of
 * balance" while staying fair as the balance changes.
 *
 * All functions are pure. No floating-point money is persisted as truth in a
 * real system, but for paper-money stubs `number` is fine.
 */

/** Current price of one pool share. Returns 1 for an unseeded pool. */
export function sharePrice(poolBalance: number, totalShares: number): number {
  if (totalShares <= 0) return 1;
  return poolBalance / totalShares;
}

/** Shares minted when depositing `amount` paper into a pool. */
export function sharesForDeposit(
  amount: number,
  poolBalance: number,
  totalShares: number,
): number {
  if (amount <= 0) throw new Error("deposit amount must be positive");
  return amount / sharePrice(poolBalance, totalShares);
}

/** Paper value of holding `shares` in the pool right now. */
export function claimValue(
  shares: number,
  poolBalance: number,
  totalShares: number,
): number {
  if (shares <= 0) return 0;
  return shares * sharePrice(poolBalance, totalShares);
}

/** Fractional ownership (0..1) represented by `shares`. */
export function ownershipFraction(shares: number, totalShares: number): number {
  if (totalShares <= 0) return 0;
  return shares / totalShares;
}

export interface DepositResult {
  sharesMinted: number;
  newTotalShares: number;
  newPoolBalance: number;
}

/** Apply a deposit, returning the updated pool figures. */
export function applyDeposit(
  amount: number,
  poolBalance: number,
  totalShares: number,
): DepositResult {
  const sharesMinted = sharesForDeposit(amount, poolBalance, totalShares);
  return {
    sharesMinted,
    newTotalShares: totalShares + sharesMinted,
    newPoolBalance: poolBalance + amount,
  };
}

export interface ClaimResult {
  payout: number;
  newTotalShares: number;
  newPoolBalance: number;
}

/** Redeem `shares` for their current paper value at a cycle end. */
export function applyClaim(
  shares: number,
  poolBalance: number,
  totalShares: number,
): ClaimResult {
  const payout = claimValue(shares, poolBalance, totalShares);
  return {
    payout,
    newTotalShares: Math.max(0, totalShares - shares),
    newPoolBalance: Math.max(0, poolBalance - payout),
  };
}

import assert from "node:assert/strict";
import { test } from "node:test";
import { InMemoryStore } from "./memoryStore.js";
import { StakingService } from "./staking.js";

async function setup() {
  const store = new InMemoryStore();
  const staking = new StakingService(store);
  const user = await store.upsertUser({ id: "u1", handle: "tester", balance: 50 });
  return { store, staking, user };
}

test("concurrent stakes don't lose updates (atomic pool)", async () => {
  const { store, staking } = await setup();
  const before = (await store.getModel("m_chatgpt"))!.balance;

  // Two simultaneous $10 stakes — with read-modify-write this would lose one.
  await Promise.all([
    staking.stake("u1", "m_chatgpt", 10),
    staking.stake("u1", "m_chatgpt", 10),
  ]);

  const model = (await store.getModel("m_chatgpt"))!;
  const user = (await store.getUser("u1"))!;
  assert.equal(model.balance, before + 20, "both stakes must hit the pool");
  assert.equal(user.balance, 30, "user debited for both stakes");
});

test("stake then full claim is value-neutral and clears the stake", async () => {
  const { store, staking } = await setup();
  await staking.stake("u1", "m_chatgpt", 25);
  const claim = await staking.claim("u1", "m_chatgpt");
  assert.ok(Math.abs(claim.payout - 25) < 1e-6, `payout ~25, got ${claim.payout}`);
  assert.equal(claim.remainingShares, 0);
  assert.equal((await store.getStake("u1", "m_chatgpt")), undefined);
  assert.ok(Math.abs((await store.getUser("u1"))!.balance - 50) < 1e-6);
});

test("balances stay rounded to cents (no float drift)", async () => {
  const { store, staking } = await setup();
  await staking.stake("u1", "m_chatgpt", 10.01);
  await staking.claim("u1", "m_chatgpt", undefined);
  const bal = (await store.getUser("u1"))!.balance;
  assert.equal(bal, Math.round(bal * 100) / 100, "balance is whole cents");
});

test("rejects invalid amounts", async () => {
  const { staking } = await setup();
  await assert.rejects(staking.stake("u1", "m_chatgpt", NaN));
  await assert.rejects(staking.stake("u1", "m_chatgpt", 0));
  await assert.rejects(staking.stake("u1", "m_chatgpt", 999999), /insufficient/);
});

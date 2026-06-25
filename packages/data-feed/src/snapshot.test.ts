import assert from "node:assert/strict";
import { test } from "node:test";
import { CANDLE_WINDOW } from "@ai-trading/shared";
import { buildSnapshot } from "./snapshot.js";
import { StubMarketDataSource } from "./sources/stub.js";

test("stub snapshots include a full candle window from cycle 0", async () => {
  const source = new StubMarketDataSource();
  const snapshot = await buildSnapshot(source, 0, 1_700_000_000_000);

  assert.equal(snapshot.assets.BTC.candles.length, CANDLE_WINDOW);
  assert.equal(snapshot.assets.BTC.candles.at(-1)?.openTime, 0);
  assert.ok((snapshot.assets.BTC.candles[0]?.openTime ?? 0) < 0);
});

test("snapshot builder advances cycle-aware sources before reading assets", async () => {
  const source = new StubMarketDataSource();
  const first = await buildSnapshot(source, 0, 1);
  const later = await buildSnapshot(source, 3, 2);

  assert.notEqual(first.assets.BTC.price, later.assets.BTC.price);
  assert.equal(later.assets.BTC.candles.at(-1)?.openTime, 3 * 5 * 60 * 1000);
});

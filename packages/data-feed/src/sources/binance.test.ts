import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { BinanceMarketDataSource } from "./binance.js";

afterEach(() => mock.restoreAll());

test("Binance source maps valid klines into candles", async () => {
  let requestedUrl = "";
  mock.method(globalThis, "fetch", async (url: string | URL | Request) => {
    requestedUrl = String(url);
    return new Response(
      JSON.stringify([[1_700_000_000_000, "100", "110", "90", "105", "123.45"]]),
      { status: 200 },
    );
  });

  const source = new BinanceMarketDataSource({
    baseUrl: "https://binance.test",
    timeoutMs: 1_000,
  });
  const candles = await source.getCandles("BTC", 24);

  assert.match(requestedUrl, /symbol=BTCUSDT/);
  assert.match(requestedUrl, /interval=5m/);
  assert.match(requestedUrl, /limit=24/);
  assert.deepEqual(candles[0], {
    asset: "BTC",
    openTime: 1_700_000_000_000,
    open: 100,
    high: 110,
    low: 90,
    close: 105,
    volume: 123.45,
  });
});

test("Binance source rejects invalid OHLC relationships", async () => {
  mock.method(globalThis, "fetch", async () =>
    new Response(
      JSON.stringify([[1_700_000_000_000, "100", "101", "99", "105", "1"]]),
      { status: 200 },
    ),
  );

  const source = new BinanceMarketDataSource({
    baseUrl: "https://binance.test",
    timeoutMs: 1_000,
  });

  await assert.rejects(
    () => source.getCandles("BTC", 1),
    /invalid OHLC relationship/,
  );
});

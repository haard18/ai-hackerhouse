import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { ASSETS, type MarketSnapshot, type ModelConfig } from "@ai-trading/shared";
import { OpenRouterModelAdapter } from "./openrouter.js";

afterEach(() => mock.restoreAll());

test("OpenRouter adapter sends JSON-mode request and parses text-array content", async () => {
  let requestBody: Record<string, unknown> | undefined;
  mock.method(globalThis, "fetch", async (_url: string | URL | Request, init?: RequestInit) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    decisions: ASSETS.map((asset) => ({
                      asset,
                      side: asset === "ETH" ? "SHORT" : "FLAT",
                      confidence: 0.6,
                    })),
                  }),
                },
              ],
            },
          },
        ],
      }),
    );
  });

  const adapter = new OpenRouterModelAdapter(
    "test-key",
    "https://openrouter.test/api/v1",
    1_000,
  );
  const decision = await adapter.decide({
    config: config(),
    snapshot: snapshot(),
  });

  assert.equal(requestBody?.model, "anthropic/claude-opus-4.8");
  assert.deepEqual(requestBody?.response_format, { type: "json_object" });
  assert.deepEqual(requestBody?.reasoning, { exclude: true });
  assert.equal(decision.decisions.find((d) => d.asset === "ETH")?.side, "SHORT");
});

test("OpenRouter adapter safely abstains when API key is missing", async () => {
  const adapter = new OpenRouterModelAdapter("");
  const decision = await adapter.decide({
    config: config(),
    snapshot: snapshot(),
  });

  assert.match(decision.raw ?? "", /OPENROUTER_API_KEY/);
  assert.ok(decision.decisions.every((d) => d.side === "FLAT"));
});

function config(): ModelConfig {
  return {
    id: "m_claude",
    name: "Claude",
    provider: "openrouter",
    modelId: "anthropic/claude-opus-4.8",
    systemPrompt: "Trade safely.",
  };
}

function snapshot(): MarketSnapshot {
  return {
    cycle: 8,
    timestamp: 1_700_000_000_000,
    assets: Object.fromEntries(
      ASSETS.map((asset, index) => [
        asset,
        {
          asset,
          price: 100 + index,
          candles: [
            {
              asset,
              openTime: 0,
              open: 100,
              high: 102,
              low: 99,
              close: 101 + index,
              volume: 1_000,
            },
          ],
        },
      ]),
    ) as MarketSnapshot["assets"],
  };
}

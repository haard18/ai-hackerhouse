import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { ASSETS, type MarketSnapshot, type ModelConfig } from "@ai-trading/shared";
import { OpenAIModelAdapter } from "./openai.js";

afterEach(() => mock.restoreAll());

test("OpenAI adapter sends GPT-5.5 with low reasoning by default", async () => {
  let requestBody: Record<string, unknown> | undefined;
  mock.method(globalThis, "fetch", async (_url: string | URL | Request, init?: RequestInit) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return jsonResponse({
      choices: [
        {
          message: {
            content: JSON.stringify({
              decisions: ASSETS.map((asset) => ({
                asset,
                side: asset === "BTC" ? "LONG" : "FLAT",
                confidence: 0.7,
              })),
            }),
          },
        },
      ],
    });
  });

  const adapter = new OpenAIModelAdapter(
    "test-key",
    "https://openai.test/v1",
    1_000,
    "low",
  );
  const decision = await adapter.decide({
    config: config("openai", "gpt-5.5"),
    snapshot: snapshot(),
  });

  assert.equal(requestBody?.model, "gpt-5.5");
  assert.equal(requestBody?.reasoning_effort, "low");
  assert.equal(requestBody?.max_completion_tokens, 900);
  assert.equal(requestBody?.temperature, undefined);
  assert.deepEqual(requestBody?.response_format, { type: "json_object" });
  assert.equal(decision.decisions.find((d) => d.asset === "BTC")?.side, "LONG");
});

test("OpenAI adapter safely abstains when API key is missing", async () => {
  const adapter = new OpenAIModelAdapter("");
  const decision = await adapter.decide({
    config: config("openai", "gpt-5.5"),
    snapshot: snapshot(),
  });

  assert.match(decision.raw ?? "", /OPENAI_API_KEY/);
  assert.ok(decision.decisions.every((d) => d.side === "FLAT"));
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function config(provider: "openai", modelId: string): ModelConfig {
  return {
    id: "m_chatgpt",
    name: "ChatGPT",
    provider,
    modelId,
    systemPrompt: "Trade safely.",
  };
}

function snapshot(): MarketSnapshot {
  return {
    cycle: 7,
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

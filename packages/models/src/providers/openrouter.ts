/**
 * OpenRouterModelAdapter — OpenAI-compatible chat completions adapter.
 *
 * Uses one OpenRouter key for all competitor models. If the key is missing or a
 * model returns bad JSON, the shared parser degrades that model to all-FLAT so
 * the cycle runner keeps moving.
 */

import type { CycleDecision } from "@ai-trading/shared";
import type { DecisionRequest, ModelAdapter } from "../adapter.js";
import { buildUserPrompt, parseDecision } from "../prompt.js";

interface OpenRouterChatResponse {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
  error?: {
    message?: string;
  };
}

export class OpenRouterModelAdapter implements ModelAdapter {
  readonly provider = "openrouter";

  constructor(
    private readonly apiKey = process.env.OPENROUTER_API_KEY ?? "",
    private readonly baseUrl =
      process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
    private readonly timeoutMs = Number(process.env.OPENROUTER_TIMEOUT_MS ?? 60_000),
  ) {}

  async decide({ config, snapshot }: DecisionRequest): Promise<CycleDecision> {
    if (!this.apiKey) {
      return parseDecision("OPENROUTER_API_KEY is not configured", config.id, snapshot.cycle);
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:4000",
          "X-Title": process.env.OPENROUTER_APP_NAME ?? "AI Trading Arena",
        },
        body: JSON.stringify({
          model: config.modelId,
          messages: [
            { role: "system", content: config.systemPrompt },
            { role: "user", content: buildUserPrompt(snapshot) },
          ],
          temperature: 0.2,
          max_tokens: 1_500,
          reasoning: { exclude: true },
          response_format: { type: "json_object" },
        }),
      });

      const bodyText = await response.text();
      if (!response.ok) {
        return parseDecision(`OpenRouter ${response.status}: ${bodyText}`, config.id, snapshot.cycle);
      }

      const body = JSON.parse(bodyText) as OpenRouterChatResponse;
      const raw =
        extractContent(body.choices?.[0]?.message?.content) ??
        body.error?.message ??
        bodyText;

      return parseDecision(raw, config.id, snapshot.cycle);
    } catch (err) {
      return parseDecision(`OpenRouter adapter error: ${(err as Error).message}`, config.id, snapshot.cycle);
    }
  }
}

function extractContent(content: unknown): string | undefined {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return undefined;

  const parts = content
    .map((part) => {
      if (
        part &&
        typeof part === "object" &&
        "text" in part &&
        typeof part.text === "string"
      ) {
        return part.text;
      }
      return "";
    })
    .filter(Boolean);

  return parts.length > 0 ? parts.join("\n") : undefined;
}

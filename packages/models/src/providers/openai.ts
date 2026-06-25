/**
 * OpenAIModelAdapter — direct ChatGPT/OpenAI API adapter.
 *
 * Uses OPENAI_API_KEY for the ChatGPT competitor. Bad/missing credentials,
 * transport errors, and malformed replies degrade to all-FLAT through the
 * shared parser so one provider cannot crash a trading cycle.
 */

import type { CycleDecision } from "@ai-trading/shared";
import type { DecisionRequest, ModelAdapter } from "../adapter.js";
import { buildUserPrompt, parseDecision } from "../prompt.js";

interface OpenAIChatResponse {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
  error?: {
    message?: string;
  };
}

type OpenAIReasoningEffort =
  | "none"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh";

export class OpenAIModelAdapter implements ModelAdapter {
  readonly provider = "openai";

  constructor(
    private readonly apiKey = process.env.OPENAI_API_KEY ?? "",
    private readonly baseUrl =
      process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    private readonly timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS ?? 60_000),
    private readonly reasoningEffort = parseReasoningEffort(
      process.env.OPENAI_REASONING_EFFORT ?? "low",
    ),
  ) {}

  async decide({ config, snapshot }: DecisionRequest): Promise<CycleDecision> {
    if (!this.apiKey) {
      return parseDecision("OPENAI_API_KEY is not configured", config.id, snapshot.cycle);
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.modelId,
          messages: [
            { role: "system", content: config.systemPrompt },
            { role: "user", content: buildUserPrompt(snapshot) },
          ],
          temperature: 0.2,
          max_completion_tokens: 900,
          reasoning_effort: this.reasoningEffort,
          response_format: { type: "json_object" },
        }),
      });

      const bodyText = await response.text();
      if (!response.ok) {
        return parseDecision(`OpenAI ${response.status}: ${bodyText}`, config.id, snapshot.cycle);
      }

      const body = JSON.parse(bodyText) as OpenAIChatResponse;
      const raw =
        extractContent(body.choices?.[0]?.message?.content) ??
        body.error?.message ??
        bodyText;

      return parseDecision(raw, config.id, snapshot.cycle);
    } catch (err) {
      return parseDecision(`OpenAI adapter error: ${(err as Error).message}`, config.id, snapshot.cycle);
    }
  }
}

function parseReasoningEffort(value: string): OpenAIReasoningEffort {
  const allowed: OpenAIReasoningEffort[] = [
    "none",
    "minimal",
    "low",
    "medium",
    "high",
    "xhigh",
  ];
  return allowed.includes(value as OpenAIReasoningEffort)
    ? (value as OpenAIReasoningEffort)
    : "low";
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

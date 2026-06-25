/**
 * AnthropicModelAdapter — STUB.
 *
 * TODO (Yug):
 *  - `npm i @anthropic-ai/sdk` and import Anthropic.
 *  - Read ANTHROPIC_API_KEY from env (never hardcode — CLAUDE.md).
 *  - messages.create({ model: config.modelId, system: config.systemPrompt,
 *      messages: [{ role: "user", content: buildUserPrompt(snapshot) }] }).
 *  - Pass the text reply through parseDecision(). Default model: claude-opus-4-8.
 *  - Wrap in try/catch; on failure return an all-FLAT decision (see parseDecision("")).
 */

import type { CycleDecision } from "@ai-trading/shared";
import type { DecisionRequest, ModelAdapter } from "../adapter.js";
import { buildUserPrompt, parseDecision } from "../prompt.js";

export class AnthropicModelAdapter implements ModelAdapter {
  readonly provider = "anthropic";

  constructor(private readonly apiKey = process.env.ANTHROPIC_API_KEY ?? "") {}

  async decide({ config, snapshot }: DecisionRequest): Promise<CycleDecision> {
    void this.apiKey;
    void buildUserPrompt(snapshot);
    // Not wired yet: return safe all-FLAT so the cycle never crashes.
    return parseDecision("", config.id, snapshot.cycle);
  }
}

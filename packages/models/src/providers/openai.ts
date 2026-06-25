/**
 * OpenAIModelAdapter — STUB.
 *
 * TODO (Yug):
 *  - `npm i openai`, read OPENAI_API_KEY from env.
 *  - chat.completions.create({ model: config.modelId,
 *      messages: [{role:"system",content:config.systemPrompt},
 *                 {role:"user",content:buildUserPrompt(snapshot)}],
 *      response_format: { type: "json_object" } }).
 *  - Pass reply through parseDecision(). On error return all-FLAT.
 */

import type { CycleDecision } from "@ai-trading/shared";
import type { DecisionRequest, ModelAdapter } from "../adapter.js";
import { buildUserPrompt, parseDecision } from "../prompt.js";

export class OpenAIModelAdapter implements ModelAdapter {
  readonly provider = "openai";

  constructor(private readonly apiKey = process.env.OPENAI_API_KEY ?? "") {}

  async decide({ config, snapshot }: DecisionRequest): Promise<CycleDecision> {
    void this.apiKey;
    void buildUserPrompt(snapshot);
    return parseDecision("", config.id, snapshot.cycle);
  }
}

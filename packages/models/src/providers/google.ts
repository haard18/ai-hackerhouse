/**
 * GoogleModelAdapter — STUB (Gemini).
 *
 * TODO (Yug):
 *  - `npm i @google/generative-ai`, read GOOGLE_API_KEY from env.
 *  - getGenerativeModel({ model: config.modelId, systemInstruction: config.systemPrompt }).
 *  - generateContent(buildUserPrompt(snapshot)); pass text through parseDecision().
 *  - On error return all-FLAT.
 */

import type { CycleDecision } from "@ai-trading/shared";
import type { DecisionRequest, ModelAdapter } from "../adapter.js";
import { buildUserPrompt, parseDecision } from "../prompt.js";

export class GoogleModelAdapter implements ModelAdapter {
  readonly provider = "google";

  constructor(private readonly apiKey = process.env.GOOGLE_API_KEY ?? "") {}

  async decide({ config, snapshot }: DecisionRequest): Promise<CycleDecision> {
    void this.apiKey;
    void buildUserPrompt(snapshot);
    return parseDecision("", config.id, snapshot.cycle);
  }
}

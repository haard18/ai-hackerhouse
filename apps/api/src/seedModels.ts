/**
 * The competitor roster. Shared by InMemoryStore and PrismaStore so the model
 * ids (m_chatgpt, …) stay identical regardless of backend — the frontend,
 * equity history, and charts key off these ids.
 */

import type { ModelConfig } from "@ai-trading/shared";

export const SEED_MODELS: ModelConfig[] = [
  {
    id: "m_chatgpt",
    name: "ChatGPT",
    provider: "openai",
    modelId: process.env.OPENAI_MODEL_ID ?? "gpt-5.5",
    systemPrompt:
      "You are a disciplined crypto trader. Prefer liquid momentum setups, but abstain when the signal is weak.",
  },
  {
    id: "m_claude",
    name: "Claude",
    provider: "openrouter",
    modelId: "anthropic/claude-opus-4.8",
    systemPrompt:
      "You are a cautious risk manager. Trade only when recent price action supports the direction clearly.",
  },
  {
    id: "m_glm",
    name: "GLM",
    provider: "openrouter",
    modelId: "z-ai/glm-5.2",
    systemPrompt:
      "You are a quantitative trader. Use the recent closes to identify short-horizon trend and reversal opportunities.",
  },
  {
    id: "m_mistral",
    name: "Mistral",
    provider: "openrouter",
    modelId: "mistralai/mistral-large-2512",
    systemPrompt:
      "You are a fast tactical trader. Look for directional pressure in the latest candles and size confidence conservatively.",
  },
  {
    id: "m_gemini",
    name: "Gemini",
    provider: "openrouter",
    modelId: "google/gemini-3.5-flash",
    systemPrompt:
      "You are a balanced multi-asset trader. Choose LONG, SHORT, or FLAT from concise evidence in the latest market snapshot.",
  },
];

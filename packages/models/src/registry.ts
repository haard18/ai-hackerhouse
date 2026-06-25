/**
 * Maps a ModelProvider to its adapter. The cycle runner uses this to dispatch
 * each model's inference to the right provider.
 */

import type { ModelProvider } from "@ai-trading/shared";
import type { ModelAdapter } from "./adapter.js";
import { MockModelAdapter } from "./providers/mock.js";
import { AnthropicModelAdapter } from "./providers/anthropic.js";
import { OpenAIModelAdapter } from "./providers/openai.js";
import { GoogleModelAdapter } from "./providers/google.js";

export function createAdapterRegistry(): Record<ModelProvider, ModelAdapter> {
  return {
    mock: new MockModelAdapter(),
    anthropic: new AnthropicModelAdapter(),
    openai: new OpenAIModelAdapter(),
    google: new GoogleModelAdapter(),
  };
}

export function getAdapter(
  registry: Record<ModelProvider, ModelAdapter>,
  provider: ModelProvider,
): ModelAdapter {
  return registry[provider] ?? registry.mock;
}

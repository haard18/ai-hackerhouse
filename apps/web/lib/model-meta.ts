import type { ModelProvider } from "@ai-trading/shared";

export type ModelBrand =
  | "openai"
  | "anthropic"
  | "google"
  | "zhipu"
  | "moonshot"
  | "mistral"
  | "mock";

export interface ModelVisual {
  brand: ModelBrand;
  tabClass: string;
  badgeClass: string;
  chatModelClass: string;
  chatTagClass: string;
  brandLabel: string;
  tag: string;
  icon: string;
  /** Hex accent for charts and inline styles. */
  color: string;
}

const BRAND_THEME: Record<
  ModelBrand,
  Pick<ModelVisual, "tabClass" | "badgeClass" | "chatModelClass" | "chatTagClass" | "brandLabel" | "color">
> = {
  openai: {
    tabClass: "tab-brand-openai",
    badgeClass: "badge-brand-openai",
    chatModelClass: "chat-model-brand-openai",
    chatTagClass: "chat-tag-brand-openai",
    brandLabel: "OpenAI",
    color: "#0d8a6a",
  },
  anthropic: {
    tabClass: "tab-brand-anthropic",
    badgeClass: "badge-brand-anthropic",
    chatModelClass: "chat-model-brand-anthropic",
    chatTagClass: "chat-tag-brand-anthropic",
    brandLabel: "Anthropic",
    color: "#c96442",
  },
  google: {
    tabClass: "tab-brand-google",
    badgeClass: "badge-brand-google",
    chatModelClass: "chat-model-brand-google",
    chatTagClass: "chat-tag-brand-google",
    brandLabel: "Google",
    color: "#3367d6",
  },
  zhipu: {
    tabClass: "tab-brand-zhipu",
    badgeClass: "badge-brand-zhipu",
    chatModelClass: "chat-model-brand-zhipu",
    chatTagClass: "chat-tag-brand-zhipu",
    brandLabel: "Zhipu",
    color: "#1d4ed8",
  },
  moonshot: {
    tabClass: "tab-brand-moonshot",
    badgeClass: "badge-brand-moonshot",
    chatModelClass: "chat-model-brand-moonshot",
    chatTagClass: "chat-tag-brand-moonshot",
    brandLabel: "Moonshot",
    color: "#4f46e5",
  },
  mistral: {
    tabClass: "tab-brand-mistral",
    badgeClass: "badge-brand-mistral",
    chatModelClass: "chat-model-brand-mistral",
    chatTagClass: "chat-tag-brand-mistral",
    brandLabel: "Mistral",
    color: "#e65c00",
  },
  mock: {
    tabClass: "tab-brand-mock",
    badgeClass: "badge-brand-mock",
    chatModelClass: "chat-model-brand-mock",
    chatTagClass: "chat-tag-brand-mock",
    brandLabel: "Mock",
    color: "#8a8a86",
  },
};

const BY_ID: Record<string, { brand: ModelBrand; tag?: string; icon?: string }> = {
  m_chatgpt: { brand: "openai", tag: "GPT Mode", icon: "G" },
  m_claude: { brand: "anthropic", tag: "Claude Brain", icon: "C" },
  m_gemini: { brand: "google", tag: "Gemini Pulse", icon: "✦" },
  m_glm: { brand: "zhipu", tag: "GLM Quant", icon: "Z" },
  m_kimi: { brand: "moonshot", tag: "Kimi Adaptive", icon: "K" },
  m_mistral: { brand: "mistral", tag: "Mistral Tactical", icon: "M" },
};

const PROVIDER_BRAND: Record<ModelProvider, ModelBrand> = {
  openai: "openai",
  anthropic: "anthropic",
  google: "google",
  openrouter: "mock",
  mock: "mock",
};

const PROVIDER_TAG: Record<ModelProvider, string> = {
  openai: "GPT Mode",
  anthropic: "Claude Brain",
  google: "Gemini Pulse",
  openrouter: "OpenRouter",
  mock: "Paper Trader",
};

const PROVIDER_ICON: Record<ModelProvider, string> = {
  openai: "G",
  anthropic: "C",
  google: "✦",
  openrouter: "OR",
  mock: "*",
};

function brandFor(id: string, provider: ModelProvider): ModelBrand {
  return BY_ID[id]?.brand ?? PROVIDER_BRAND[provider] ?? "mock";
}

export function modelVisual(id: string, provider: ModelProvider): ModelVisual {
  const brand = brandFor(id, provider);
  const theme = BRAND_THEME[brand];
  const byId = BY_ID[id];

  return {
    brand,
    ...theme,
    tag: byId?.tag ?? PROVIDER_TAG[provider] ?? "Baseline",
    icon: byId?.icon ?? PROVIDER_ICON[provider] ?? "*",
  };
}

export function modelBadgeClass(id: string, provider: ModelProvider): string {
  return modelVisual(id, provider).badgeClass;
}

export function modelChartColor(id: string, provider: ModelProvider): string {
  return modelVisual(id, provider).color;
}

/** @deprecated Prefer modelBadgeClass with model id for company-themed badges. */
export function providerBadgeClass(provider: ModelProvider): string {
  return BRAND_THEME[PROVIDER_BRAND[provider] ?? "mock"].badgeClass;
}

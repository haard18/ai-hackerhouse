import type { ModelProvider } from "@ai-trading/shared";

export interface ModelVisual {
  tabClass: string;
  tag: string;
  icon: string;
  chatColor: string;
}

const DEFAULT: ModelVisual = {
  tabClass: "tab-blue",
  tag: "Baseline",
  icon: "◆",
  chatColor: "#333",
};

const BY_ID: Record<string, Partial<ModelVisual>> = {
  m_momentum: { tabClass: "tab-green", tag: "Monk Mode", icon: "▲", chatColor: "#1a7f4c" },
  m_contrarian: { tabClass: "tab-pink", tag: "Situational Awareness", icon: "◉", chatColor: "#c0392b" },
};

const BY_PROVIDER: Record<ModelProvider, Partial<ModelVisual>> = {
  mock: { tabClass: "tab-yellow", tag: "Paper Trader" },
  anthropic: { tabClass: "tab-pink", tag: "Claude Brain", icon: "✦" },
  openai: { tabClass: "tab-green", tag: "GPT Mode", icon: "◎" },
  google: { tabClass: "tab-blue", tag: "Gemini Pulse", icon: "★" },
};

export function modelVisual(id: string, provider: ModelProvider): ModelVisual {
  return {
    ...DEFAULT,
    ...BY_PROVIDER[provider],
    ...BY_ID[id],
  };
}

export function providerBadgeClass(provider: ModelProvider): string {
  return `badge badge-provider-${provider}`;
}

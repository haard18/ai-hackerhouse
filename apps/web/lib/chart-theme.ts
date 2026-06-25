/** Shared chart styling — light, editorial, no neon. */
export const CHART = {
  grid: "#e5e4df",
  axis: "#8a8a86",
  line: "#1a1a1a",
  lineMuted: "#c96442",
  fill: "rgba(26, 26, 26, 0.06)",
  tooltipBg: "#ffffff",
  tooltipBorder: "#1a1a1a",
  positive: "#1a7f4c",
  negative: "#b42318",
} as const;

export const ASSET_CHART_COLORS: Record<string, string> = {
  BTC: "#1a1a1a",
  ETH: "#5c5c58",
  SOL: "#8a8a86",
  BNB: "#c96442",
  XRP: "#5c5c58",
};

/** Distinct-but-editorial palette for per-model equity lines. */
export const MODEL_CHART_COLORS = [
  "#1a7f4c", // green
  "#c96442", // terracotta
  "#3b6fb6", // blue
  "#9b59b6", // purple
  "#d4a017", // gold
  "#0e7c86", // teal
  "#b42318", // red
  "#5c5c58", // slate
] as const;

export function modelColor(index: number): string {
  return MODEL_CHART_COLORS[index % MODEL_CHART_COLORS.length]!;
}

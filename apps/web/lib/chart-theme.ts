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

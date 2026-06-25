export function formatUsd(n: number, opts?: { decimals?: number }): string {
  const decimals = opts?.decimals ?? 0;
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatPrice(asset: string, price: number): string {
  const decimals = asset === "XRP" ? 4 : asset === "ETH" || asset === "SOL" ? 2 : 0;
  return price.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function pnlClass(n: number): string {
  if (n > 0) return "pnl-positive";
  if (n < 0) return "pnl-negative";
  return "";
}

export function sideBadgeClass(side: string): string {
  if (side === "LONG") return "badge badge-long";
  if (side === "SHORT") return "badge badge-short";
  return "badge badge-flat";
}

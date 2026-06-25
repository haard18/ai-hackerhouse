"use client";

import type { AssetSymbol } from "@ai-trading/shared";
import { Sparkline } from "../charts/Sparkline";
import { formatPrice, formatPct } from "../../lib/format";
import type { MarketQuote } from "../../lib/api";

interface AssetStripProps {
  quotes: MarketQuote[];
}

export function AssetStrip({ quotes }: AssetStripProps) {
  if (!quotes.length) {
    return <div className="empty-state">Waiting for live market data…</div>;
  }

  return (
    <div className="asset-strip">
      {quotes.map((q) => {
        const asset = q.asset as AssetSymbol;
        const data = q.history.map((price, i) => ({ cycle: i, price }));
        const span = q.history.length;
        const lo = q.history.length ? Math.min(...q.history) : 0;
        const hi = q.history.length ? Math.max(...q.history) : 0;
        const range = lo ? ((hi - lo) / lo) * 100 : 0;
        return (
          <div key={q.asset} className="asset-chip hover-tip">
            <div className="asset-chip-top">
              <span className="asset-chip-symbol">{q.asset}</span>
              <span className={`asset-chip-change ${q.changePct >= 0 ? "up" : "down"}`}>
                {formatPct(q.changePct)}
              </span>
            </div>
            <div className="asset-chip-price">${formatPrice(asset, q.price)}</div>
            <Sparkline asset={asset} data={data} height={36} />
            <div className="hover-tip-content">
              {span}-candle range · {range.toFixed(2)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}

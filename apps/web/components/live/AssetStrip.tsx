"use client";

import { Sparkline } from "../charts/Sparkline";
import { formatPrice, formatPct } from "../../lib/format";
import { assetVolumeProxy } from "../../lib/chart-data";
import { priceHistory, quotesForCycle } from "../../lib/market-prices";

interface AssetStripProps {
  cycle: number;
}

export function AssetStrip({ cycle }: AssetStripProps) {
  const quotes = quotesForCycle(cycle);

  return (
    <div className="asset-strip">
      {quotes.map((q) => {
        const history = priceHistory(q.asset, cycle, 20);
        const vol = assetVolumeProxy(q.asset, cycle);
        return (
          <div key={q.asset} className="asset-chip hover-tip">
            <div className="asset-chip-top">
              <span className="asset-chip-symbol">{q.asset}</span>
              <span className={`asset-chip-change ${q.changePct >= 0 ? "up" : "down"}`}>
                {formatPct(q.changePct)}
              </span>
            </div>
            <div className="asset-chip-price">${formatPrice(q.asset, q.price)}</div>
            <Sparkline asset={q.asset} data={history} height={36} />
            <div className="hover-tip-content">
              24-cycle sparkline · vol proxy {(vol * 100).toFixed(3)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
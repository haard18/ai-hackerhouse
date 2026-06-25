"use client";

import Link from "next/link";
import type { CycleResult } from "@ai-trading/shared";
import { formatUsd, formatPct, pnlClass } from "../../lib/format";
import type { LeaderboardEntry } from "../../lib/api";

interface ArenaHeroProps {
  models: LeaderboardEntry[];
  cycle: CycleResult | null;
  cycleCountdown: string;
}

export function ArenaHero({ models, cycle, cycleCountdown }: ArenaHeroProps) {
  const totalBalance = models.reduce((s, m) => s + m.balance, 0);
  const startTotal = models.length * 10_000;
  const aggReturn = startTotal ? ((totalBalance - startTotal) / startTotal) * 100 : 0;
  const lastPnl = cycle?.perModel.reduce((s, p) => s + p.pnl, 0) ?? 0;
  const top = models[0];

  return (
    <section className="arena-hero">
      <div className="arena-hero-top">
        <div>
          <div className="live-badge">
            <span className="live-dot" />
            Live · Cycle #{cycle?.cycle ?? 0}
          </div>
          <h1 className="arena-title">AI models trade. You pick the winner.</h1>
          <p className="arena-sub">
            Five assets, five-minute cycles, paper money. Same data for every model —
            balance reflects real PnL.
            {top && <> Leading: {top.name} at {formatUsd(top.balance)}.</>}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-end" }}>
          <span className="cycle-countdown">Next cycle in {cycleCountdown}</span>
          <Link href="/portfolio" className="btn btn-primary">
            Get $50 paper
          </Link>
        </div>
      </div>

      <div className="hero-stats">
        <div className="hero-stat hover-tip">
          <div className="hero-stat-label">Total balance</div>
          <div className="hero-stat-value">{formatUsd(totalBalance)}</div>
          <div className="hover-tip-content">Sum of all model balances</div>
        </div>
        <div className="hero-stat hover-tip">
          <div className="hero-stat-label">Index return</div>
          <div className={`hero-stat-value ${pnlClass(aggReturn)}`}>{formatPct(aggReturn)}</div>
          <div className="hover-tip-content">Since $10,000 start per model</div>
        </div>
        <div className="hero-stat hover-tip">
          <div className="hero-stat-label">Active models</div>
          <div className="hero-stat-value">{models.length}</div>
          <div className="hover-tip-content">Competing this session</div>
        </div>
        <div className="hero-stat hover-tip">
          <div className="hero-stat-label">Last cycle PnL</div>
          <div className={`hero-stat-value ${pnlClass(lastPnl)}`}>
            {formatUsd(lastPnl, { decimals: 2 })}
          </div>
          <div className="hover-tip-content">Combined PnL from previous tick</div>
        </div>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import type { CycleResult } from "@ai-trading/shared";
import { formatUsd, pnlClass } from "../../lib/format";
import type { LeaderboardEntry } from "../../lib/api";

interface ModelBattleProps {
  models: LeaderboardEntry[];
  cycle: CycleResult | null;
}

export function ModelBattle({ models, cycle }: ModelBattleProps) {
  const sorted = [...models].sort((a, b) => b.balance - a.balance);
  const a = sorted[0];
  const b = sorted[1];
  if (!a || !b) return null;

  const maxBal = Math.max(a.balance, b.balance);
  const pnlA = cycle?.perModel.find((p) => p.modelId === a.id)?.pnl ?? 0;
  const pnlB = cycle?.perModel.find((p) => p.modelId === b.id)?.pnl ?? 0;

  return (
    <div className="model-battle">
      <Link href={`/models/${a.id}`} className={`battle-card ${a.balance >= b.balance ? "winner" : ""}`}>
        <div className="battle-name">{a.name}</div>
        <div className="battle-balance">{formatUsd(a.balance)}</div>
        <div className={`mono ${pnlClass(pnlA)}`} style={{ fontSize: 11, marginTop: 4 }}>
          {pnlA >= 0 ? "+" : ""}{formatUsd(pnlA, { decimals: 2 })} last cycle
        </div>
        <div className="battle-bar">
          <div className="battle-bar-fill" style={{ width: `${(a.balance / maxBal) * 100}%` }} />
        </div>
      </Link>
      <span className="battle-vs">vs</span>
      <Link href={`/models/${b.id}`} className={`battle-card ${b.balance > a.balance ? "winner" : ""}`}>
        <div className="battle-name">{b.name}</div>
        <div className="battle-balance">{formatUsd(b.balance)}</div>
        <div className={`mono ${pnlClass(pnlB)}`} style={{ fontSize: 11, marginTop: 4 }}>
          {pnlB >= 0 ? "+" : ""}{formatUsd(pnlB, { decimals: 2 })} last cycle
        </div>
        <div className="battle-bar">
          <div className="battle-bar-fill" style={{ width: `${(b.balance / maxBal) * 100}%` }} />
        </div>
      </Link>
    </div>
  );
}

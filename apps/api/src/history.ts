/**
 * CycleHistory — the model equity timeseries that powers the charts.
 *
 * Keeps an in-memory ring of per-cycle summaries (TVL, per-model balance, per-
 * model PnL) and, when a Postgres client is provided, persists each point to
 * the EquityPoint table and restores the ring on startup so charts survive
 * restarts.
 */

import type { CycleResult } from "@ai-trading/shared";
import type { PrismaClient } from "@prisma/client";

export interface HistoryPoint {
  cycle: number;
  label: string;
  timestamp: number;
  tvl: number;
  /** modelId -> balance after this cycle. */
  balances: Record<string, number>;
  /** modelId -> realized PnL this cycle. */
  pnl: Record<string, number>;
}

export class CycleHistory {
  private points: HistoryPoint[] = [];

  constructor(
    private readonly prisma: PrismaClient | null = null,
    private readonly cap = 1000,
  ) {}

  /** Restore recent history from Postgres (no-op without a DB). */
  async load(maxCycles = 500): Promise<void> {
    if (!this.prisma) return;
    // Fetch by cycle range (not a row count) so we never truncate mid-cycle and
    // under-count a cycle's TVL — works for any number of models.
    const top = await this.prisma.equityPoint.findFirst({
      orderBy: { cycle: "desc" },
      select: { cycle: true },
    });
    if (!top) return;
    const rows = await this.prisma.equityPoint.findMany({
      where: { cycle: { gt: top.cycle - maxCycles } },
      orderBy: { cycle: "asc" },
    });
    const byCycle = new Map<number, HistoryPoint>();
    for (const r of rows) {
      let p = byCycle.get(r.cycle);
      if (!p) {
        p = {
          cycle: r.cycle,
          label: `#${r.cycle}`,
          timestamp: r.timestamp.getTime(),
          tvl: 0,
          balances: {},
          pnl: {},
        };
        byCycle.set(r.cycle, p);
      }
      p.balances[r.modelId] = r.balance;
      p.pnl[r.modelId] = r.pnl;
      p.tvl += r.balance;
    }
    this.points = [...byCycle.values()]
      .sort((a, b) => a.cycle - b.cycle)
      .slice(-this.cap);
  }

  /** Record one resolved cycle into the ring (and Postgres). */
  async record(result: CycleResult): Promise<void> {
    const balances: Record<string, number> = {};
    const pnl: Record<string, number> = {};
    let tvl = 0;
    for (const m of result.perModel) {
      balances[m.modelId] = m.balanceAfter;
      pnl[m.modelId] = m.pnl;
      tvl += m.balanceAfter;
    }
    const point: HistoryPoint = {
      cycle: result.cycle,
      label: `#${result.cycle}`,
      timestamp: result.timestamp,
      tvl,
      balances,
      pnl,
    };
    const idx = this.points.findIndex((p) => p.cycle === result.cycle);
    if (idx >= 0) this.points[idx] = point;
    else this.points.push(point);
    if (this.points.length > this.cap) {
      this.points.splice(0, this.points.length - this.cap);
    }

    if (this.prisma) {
      await this.prisma.equityPoint
        .createMany({
          data: result.perModel.map((m) => ({
            cycle: result.cycle,
            modelId: m.modelId,
            balance: m.balanceAfter,
            pnl: m.pnl,
            timestamp: new Date(result.timestamp),
          })),
          skipDuplicates: true,
        })
        .catch((err) => console.error("[equity] persist failed", err));
    }
  }

  recent(points = 48): HistoryPoint[] {
    return this.points.slice(-points);
  }
}

"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatUsd } from "../../lib/format";
import { CHART } from "../../lib/chart-theme";
import type { LeaderboardEntry } from "../../lib/api";
import type { CycleResult } from "@ai-trading/shared";

interface ModelPnLChartProps {
  models: LeaderboardEntry[];
  cycle: CycleResult | null;
}

export function ModelPnLChart({ models, cycle }: ModelPnLChartProps) {
  const data = models.map((m) => {
    const outcome = cycle?.perModel.find((p) => p.modelId === m.id);
    return {
      name: m.name.split(" ")[0],
      pnl: outcome?.pnl ?? 0,
    };
  });

  return (
    <div className="chart-wrap" style={{ height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="name"
            tick={{ fill: CHART.axis, fontSize: 10, fontFamily: "monospace" }}
            axisLine={{ stroke: CHART.grid }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: CHART.axis, fontSize: 10, fontFamily: "monospace" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${v}`}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: CHART.tooltipBg,
              border: `1px solid ${CHART.tooltipBorder}`,
              borderRadius: 0,
              fontFamily: "monospace",
              fontSize: 11,
              boxShadow: "none",
            }}
            formatter={(v) => [formatUsd(Number(v ?? 0), { decimals: 2 }), "Cycle PnL"]}
          />
          <Bar dataKey="pnl" radius={0}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.pnl >= 0 ? CHART.positive : CHART.negative}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

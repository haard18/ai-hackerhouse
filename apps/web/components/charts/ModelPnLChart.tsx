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
import type { CycleResult, ModelProvider } from "@ai-trading/shared";
import { formatUsd } from "../../lib/format";
import { CHART } from "../../lib/chart-theme";
import { modelChartColor } from "../../lib/model-meta";
import type { LeaderboardEntry } from "../../lib/api";

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
      fill: modelChartColor(m.id, m.provider as ModelProvider),
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
              <Cell key={i} fill={d.fill} fillOpacity={d.pnl >= 0 ? 0.85 : 0.55} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

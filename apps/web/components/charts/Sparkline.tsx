"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import type { AssetSymbol } from "@ai-trading/shared";
import { ASSET_CHART_COLORS, CHART } from "../../lib/chart-theme";
import { formatPrice } from "../../lib/format";

interface SparklineProps {
  asset: AssetSymbol;
  data: { cycle: number; price: number }[];
  height?: number;
}

export function Sparkline({ asset, data, height = 36 }: SparklineProps) {
  const color = ASSET_CHART_COLORS[asset] ?? CHART.line;
  return (
    <div style={{ height, width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis domain={["dataMin", "dataMax"]} hide />
          <Tooltip
            contentStyle={{
              background: CHART.tooltipBg,
              border: `1px solid ${CHART.tooltipBorder}`,
              borderRadius: 0,
              fontFamily: "monospace",
              fontSize: 10,
              boxShadow: "none",
            }}
            formatter={(v) => [`$${formatPrice(asset, Number(v ?? 0))}`, asset]}
            labelFormatter={(l) => `Cycle ${l}`}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 2, fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

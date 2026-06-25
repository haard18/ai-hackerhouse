"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatUsd } from "../../lib/format";
import { CHART } from "../../lib/chart-theme";

interface IndexChartProps {
  data: { cycle: number; tvl: number; label: string }[];
}

export function IndexChart({ data }: IndexChartProps) {
  // A line needs at least two points; show a friendly placeholder until the
  // equity timeseries accumulates a few cycles.
  if (data.length < 2) {
    return (
      <div
        className="empty-state"
        style={{
          height: 220,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          opacity: 0.6,
          fontFamily: "monospace",
          fontSize: 12,
        }}
      >
        Index builds as cycles resolve — first line appears after cycle&nbsp;#1.
      </div>
    );
  }

  return (
    <div className="chart-wrap" style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="tvlGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.line} stopOpacity={0.12} />
              <stop offset="100%" stopColor={CHART.line} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: CHART.axis, fontSize: 10, fontFamily: "monospace" }}
            axisLine={{ stroke: CHART.grid }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: CHART.axis, fontSize: 10, fontFamily: "monospace" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            width={48}
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
            formatter={(v) => [formatUsd(Number(v ?? 0)), "TVL"]}
          />
          <Area
            type="monotone"
            dataKey="tvl"
            stroke={CHART.line}
            strokeWidth={1.5}
            fill="url(#tvlGrad)"
            dot={false}
            activeDot={{ r: 3, fill: CHART.line, stroke: "#fff", strokeWidth: 1 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

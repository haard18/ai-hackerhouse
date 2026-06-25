"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatUsd } from "../../lib/format";
import { CHART, modelColor } from "../../lib/chart-theme";

export interface IndexChartModel {
  id: string;
  name: string;
  /** Stable color so a model keeps its hue even when shown alone. */
  color?: string;
}

interface IndexChartProps {
  /** One row per cycle: { label, cycle, tvl, [modelId]: value }. */
  data: Array<Record<string, number | string>>;
  models: IndexChartModel[];
  /** "pct" = indexed return (aggregate); "usd" = raw balance (single model). */
  mode?: "usd" | "pct";
}

export function IndexChart({ data, models, mode = "usd" }: IndexChartProps) {
  const pct = mode === "pct";
  const fmtValue = (v: unknown) =>
    pct
      ? `${Number(v) >= 0 ? "+" : ""}${Number(v ?? 0).toFixed(2)}%`
      : formatUsd(Number(v ?? 0));
  // A line needs at least two points; show a friendly placeholder until the
  // equity timeseries accumulates a few cycles.
  if (data.length < 2 || !models.length) {
    return (
      <div
        className="empty-state"
        style={{
          height: 240,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          opacity: 0.6,
          fontFamily: "monospace",
          fontSize: 12,
        }}
      >
        Index builds as cycles resolve — first lines appear after cycle&nbsp;#1.
      </div>
    );
  }

  return (
    <div className="chart-wrap" style={{ height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: CHART.axis, fontSize: 10, fontFamily: "monospace" }}
            axisLine={{ stroke: CHART.grid }}
            tickLine={false}
          />
          <YAxis
            // Zoom to the data range so small moves are visible (a 0-based
            // axis would flatten balances that hover near $10k).
            domain={["auto", "auto"]}
            tick={{ fill: CHART.axis, fontSize: 10, fontFamily: "monospace" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) =>
              pct
                ? `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(1)}%`
                : `$${(Number(v) / 1000).toFixed(1)}k`
            }
            width={52}
          />
          {pct && <ReferenceLine y={0} stroke={CHART.grid} strokeDasharray="3 3" />}
          <Tooltip
            contentStyle={{
              background: CHART.tooltipBg,
              border: `1px solid ${CHART.tooltipBorder}`,
              borderRadius: 0,
              fontFamily: "monospace",
              fontSize: 11,
              boxShadow: "none",
            }}
            formatter={(v, name) => [fmtValue(v), String(name)]}
          />
          <Legend
            wrapperStyle={{ fontFamily: "monospace", fontSize: 10, paddingTop: 6 }}
            iconType="plainline"
          />
          {models.map((m, i) => {
            const color = m.color ?? modelColor(i);
            return (
              <Line
                key={m.id}
                type="monotone"
                dataKey={m.id}
                name={m.name}
                stroke={color}
                strokeWidth={1.75}
                dot={false}
                isAnimationActive={false}
                activeDot={{ r: 3, fill: color, stroke: "#fff", strokeWidth: 1 }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

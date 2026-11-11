"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthlyPoint } from "@/lib/analysis/evaluation";
import { monthLabel } from "@/lib/analysis/metrics";

const AXIS = { fontSize: 12, fill: "#5d687a" };

export function ActivityChart({ data, prevLabel }: { data: MonthlyPoint[]; prevLabel: string | null }) {
  const rows = data.map((d) => ({ ...d, label: monthLabel(d.month) }));
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="#e0e6e3" vertical={false} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: "#c7d0cc" }} />
          <YAxis yAxisId="l" tick={AXIS} tickLine={false} axisLine={false} width={44} />
          <YAxis yAxisId="r" orientation="right" tick={AXIS} tickLine={false} axisLine={false} width={36} />
          <Tooltip
            formatter={(v, name) => [`${Number(v).toLocaleString("ja-JP")}件`, String(name)]}
            contentStyle={{ border: "1px solid #c7d0cc", borderRadius: 6, fontSize: 12, boxShadow: "0 2px 8px rgba(22,34,58,0.08)" }}
            labelStyle={{ color: "#16223a", fontWeight: 700 }}
            cursor={{ fill: "#eef2f0" }}
          />
          <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, color: "#3f4b60" }} />
          <Bar yAxisId="l" dataKey="interest" name="興味ある（左軸）" fill="#67c59f" radius={[2, 2, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          {prevLabel && (
            <Line
              yAxisId="l"
              dataKey="prevInterest"
              name={`興味ある・${prevLabel}同月（左軸）`}
              stroke="#8a95a5"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          )}
          <Line yAxisId="r" dataKey="apply" name="応募したい（右軸）" stroke="#2b3a55" strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

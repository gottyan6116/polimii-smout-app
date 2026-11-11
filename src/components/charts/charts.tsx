"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { AXIS_TICK, INK, nf, STATUS, TOOLTIP_PROPS } from "./theme";

/** 軸ラベルは16字で省略（全文はツールチップと表で確認できる） */
const clip = (v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v);

const LEGEND_STYLE = { fontSize: 12, color: INK.secondary, paddingBottom: 6 } as const;

/* ------------------------------------------------------------------ */
/* 月次の縦棒（＋前年度同月の線）。1軸のみ                                  */
/* ------------------------------------------------------------------ */

export function MonthlyColumns({
  data,
  barName,
  lineName,
  unit = "件",
  height = 240,
}: {
  data: { label: string; value: number; prev: number | null }[];
  barName: string;
  lineName?: string;
  unit?: string;
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }} barCategoryGap="22%">
          <CartesianGrid stroke={INK.grid} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: INK.axis }} interval={0} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} />
          <Tooltip {...TOOLTIP_PROPS} formatter={(v, n) => [nf(v, unit), String(n)]} />
          <Legend verticalAlign="top" align="right" iconType="square" iconSize={9} wrapperStyle={LEGEND_STYLE} />
          <Bar dataKey="value" name={barName} fill="#4fb38a" radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={false} />
          {lineName && (
            <Line
              dataKey="prev"
              name={lineName}
              stroke={INK.context}
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 複数系列の折れ線（同一単位のみ）                                        */
/* ------------------------------------------------------------------ */

export function MultiLine({
  data,
  xKey,
  series,
  unit = "",
  height = 240,
  yDomain,
  valueFormat,
  tickFormat,
}: {
  data: Record<string, string | number | null>[];
  xKey: string;
  series: { key: string; name: string; color: string; dashed?: boolean }[];
  unit?: string;
  height?: number;
  yDomain?: [number | "auto", number | "auto"];
  valueFormat?: (v: number) => string;
  tickFormat?: (v: number) => string;
}) {
  const fmt = valueFormat ?? ((v: number) => nf(v, unit));
  const tick = tickFormat ?? ((v: number) => nf(v));
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={INK.grid} vertical={false} />
          <XAxis dataKey={xKey} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: INK.axis }} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} domain={yDomain ?? [0, "auto"]} tickFormatter={(v) => tick(Number(v))} />
          <Tooltip {...TOOLTIP_PROPS} cursor={{ stroke: INK.axis }} formatter={(v, n) => [fmt(Number(v)), String(n)]} />
          <Legend verticalAlign="top" align="right" iconType="plainline" iconSize={14} wrapperStyle={LEGEND_STYLE} />
          {series.map((s) => (
            <Line
              key={s.key}
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.dashed ? "4 3" : undefined}
              dot={{ r: 3, strokeWidth: 2, fill: "#fff" }}
              activeDot={{ r: 4.5 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ドーナツ（構成比）。凡例に値と構成比を必ず併記する                         */
/* ------------------------------------------------------------------ */

export function Donut({
  data,
  centerValue,
  centerLabel,
  unit = "",
  size = 176,
}: {
  data: { name: string; value: number; color: string }[];
  centerValue: string;
  centerLabel: string;
  unit?: string;
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip {...TOOLTIP_PROPS} formatter={(v, n) => [`${nf(v, unit)}（${((Number(v) / total) * 100).toFixed(1)}%）`, String(n)]} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="64%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke="#fff"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="tabular text-[20px] font-bold leading-6 text-fg">{centerValue}</p>
            <p className="text-[11px] leading-4 text-fg-3">{centerLabel}</p>
          </div>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-1.5 text-[12px]">
        {data.map((d) => (
          <li key={d.name} className="grid grid-cols-[10px_1fr_auto_3.2rem] items-center gap-2">
            <span className="size-2.5 rounded-[2px]" style={{ backgroundColor: d.color }} aria-hidden />
            <span className="min-w-0 leading-4 text-fg-2">{d.name}</span>
            <span className="tabular text-fg">{nf(d.value, unit)}</span>
            <span className="tabular text-right text-fg-3">{total ? ((d.value / total) * 100).toFixed(1) : "0.0"}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 達成率の横棒（100%に基準線）。状態色＋数値ラベル                          */
/* ------------------------------------------------------------------ */

export function AchievementBars({
  rows,
  height,
}: {
  rows: { name: string; rate: number | null; status: "achieved" | "not-achieved" | "undeterminable"; note: string }[];
  height?: number;
}) {
  const data = rows.map((r) => ({ ...r, value: r.rate ?? 0 }));
  const max = Math.max(120, ...data.map((d) => d.value + 10));
  return (
    <div style={{ height: height ?? rows.length * 40 + 32 }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 4 }} barCategoryGap="28%">
          <CartesianGrid stroke={INK.grid} horizontal={false} />
          <XAxis type="number" domain={[0, Math.ceil(max / 20) * 20]} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: INK.axis }} tickFormatter={(v) => `${v}%`} />
          <YAxis type="category" dataKey="name" tick={{ ...AXIS_TICK, fill: INK.secondary, fontSize: 12 }} tickLine={false} axisLine={false} width={196} tickFormatter={clip} />
          <Tooltip
            {...TOOLTIP_PROPS}
            formatter={(_v, _n, item) => {
              const p = item.payload as (typeof data)[number];
              return [p.rate === null ? "算出不可" : `${p.rate.toFixed(1)}%`, p.note];
            }}
          />
          <ReferenceLine x={100} stroke={INK.primary} strokeDasharray="3 3" label={{ value: "目標", position: "top", fontSize: 11, fill: INK.muted }} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false}>
            {data.map((d) => (
              <Cell
                key={d.name}
                fill={d.status === "achieved" ? STATUS.achieved : d.status === "not-achieved" ? STATUS.notAchieved : STATUS.undeterminable}
              />
            ))}
            <LabelList
              dataKey="rate"
              position="right"
              formatter={(v: unknown) => (v === null || v === undefined ? "データなし" : `${Number(v).toFixed(1)}%`)}
              style={{ fontSize: 11, fill: INK.secondary }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 横棒（ランキング・比較）。平均などの基準線つき                            */
/* ------------------------------------------------------------------ */

export function RankBars({
  rows,
  unit = "%",
  reference,
  highlight,
  digits = 1,
}: {
  rows: { name: string; value: number }[];
  unit?: string;
  reference?: { value: number; label: string };
  highlight?: (name: string, value: number) => boolean;
  digits?: number;
}) {
  return (
    <div style={{ height: rows.length * 36 + 36 }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 14, right: 52, bottom: 4, left: 4 }} barCategoryGap="30%">
          <CartesianGrid stroke={INK.grid} horizontal={false} />
          <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: INK.axis }} tickFormatter={(v) => `${v}${unit}`} />
          <YAxis type="category" dataKey="name" tick={{ ...AXIS_TICK, fill: INK.secondary, fontSize: 12 }} tickLine={false} axisLine={false} width={196} tickFormatter={clip} />
          <Tooltip {...TOOLTIP_PROPS} formatter={(v) => [`${Number(v).toFixed(digits)}${unit}`, ""]} />
          {reference && (
            <ReferenceLine
              x={reference.value}
              stroke={INK.primary}
              strokeDasharray="3 3"
              label={{ value: reference.label, position: "top", fontSize: 11, fill: INK.muted }}
            />
          )}
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false}>
            {rows.map((r) => (
              <Cell key={r.name} fill={highlight?.(r.name, r.value) ? INK.emphasis : INK.base} />
            ))}
            <LabelList dataKey="value" position="right" formatter={(v: unknown) => `${Number(v).toFixed(digits)}${unit}`} style={{ fontSize: 11, fill: INK.secondary }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 縦棒（カテゴリ別）。1系列は強調1本＋その他、複数系列はグループ             */
/* ------------------------------------------------------------------ */

export function Columns({
  data,
  xKey,
  series,
  unit = "",
  height = 220,
  emphasize,
  stacked,
}: {
  data: Record<string, string | number | null>[];
  xKey: string;
  series: { key: string; name: string; color: string }[];
  unit?: string;
  height?: number;
  /** 1系列のとき、強調する x の値 */
  emphasize?: string;
  stacked?: boolean;
}) {
  const single = series.length === 1;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: single ? 18 : 4, right: 4, bottom: 0, left: -12 }} barCategoryGap="24%" barGap={2}>
          <CartesianGrid stroke={INK.grid} vertical={false} />
          <XAxis dataKey={xKey} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: INK.axis }} interval={0} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} allowDecimals={false} />
          <Tooltip {...TOOLTIP_PROPS} formatter={(v, n) => [nf(v, unit), String(n)]} />
          {!single && <Legend verticalAlign="top" align="right" iconType="square" iconSize={9} wrapperStyle={LEGEND_STYLE} />}
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              fill={s.color}
              stackId={stacked ? "s" : undefined}
              radius={stacked ? (i === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]) : [4, 4, 0, 0]}
              maxBarSize={single ? 44 : 22}
              stroke={stacked ? "#fff" : undefined}
              strokeWidth={stacked ? 1 : 0}
              isAnimationActive={false}
            >
              {single &&
                data.map((d) => (
                  <Cell key={String(d[xKey])} fill={emphasize && d[xKey] === emphasize ? INK.emphasis : s.color} />
                ))}
              {single && (
                <LabelList dataKey={s.key} position="top" formatter={(v: unknown) => nf(v)} style={{ fontSize: 11, fill: INK.secondary }} />
              )}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 小さな倍数：KPIごとの年度推移（実績の縦棒＋目標の点）                      */
/* ------------------------------------------------------------------ */

export function KpiMiniChart({
  data,
  unit,
  currentLabel,
}: {
  data: { label: string; actual: number | null; target: number | null }[];
  unit: string;
  currentLabel: string;
}) {
  return (
    <div className="h-[112px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -24 }} barCategoryGap="30%">
          <CartesianGrid stroke={INK.grid} vertical={false} />
          <XAxis dataKey="label" tick={{ ...AXIS_TICK, fontSize: 10 }} tickLine={false} axisLine={{ stroke: INK.axis }} />
          <YAxis tick={{ ...AXIS_TICK, fontSize: 10 }} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
          <Tooltip {...TOOLTIP_PROPS} formatter={(v, n) => [v === null || v === undefined ? "データなし" : nf(v, unit), String(n)]} />
          <Bar dataKey="actual" name="実績" radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.label} fill={d.label === currentLabel ? INK.emphasis : INK.base} />
            ))}
          </Bar>
          <Line
            dataKey="target"
            name="目標"
            stroke="transparent"
            dot={(props: { cx?: number; cy?: number; index?: number }) =>
              props.cx === undefined || props.cy === undefined || data[props.index ?? 0]?.target === null ? (
                <g key={`t-${props.index}`} />
              ) : (
                <line key={`t-${props.index}`} x1={props.cx - 9} x2={props.cx + 9} y1={props.cy} y2={props.cy} stroke={INK.primary} strokeWidth={2} />
              )
            }
            activeDot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* スパークライン（統計タイル用。実データの月次推移）                         */
/* ------------------------------------------------------------------ */

export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const data = values.map((v, i) => ({ i, v }));
  return (
    <div className={cn("h-8 w-full", className)} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <Area dataKey="v" stroke={INK.emphasis} strokeWidth={1.5} fill="#e9f6ef" isAnimationActive={false} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

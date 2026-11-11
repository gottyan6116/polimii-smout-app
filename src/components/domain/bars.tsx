import { cn } from "@/lib/utils";

/** 横棒（HTML）。少数カテゴリの比較用。値は常に文字でも表示する */
export function BarRows({
  rows,
  max,
  format,
  highlight,
}: {
  rows: { key: string; label: string; value: number; display: string; sub?: string }[];
  max?: number;
  format?: (v: number) => string;
  highlight?: string;
}) {
  const m = max ?? Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[minmax(92px,auto)_1fr_auto] items-center gap-3 text-[13px]">
          <span className={cn("text-fg-2", highlight === r.key && "font-bold text-fg")}>{r.label}</span>
          <span className="h-3 rounded-[2px] bg-surface-3" aria-hidden>
            <span
              className={cn("block h-full rounded-[2px]", highlight === r.key ? "bg-accent-strong" : "bg-accent")}
              style={{ width: `${Math.max(0, Math.min(100, (r.value / m) * 100))}%` }}
            />
          </span>
          <span className="tabular min-w-[88px] text-right text-fg">
            {format ? format(r.value) : r.display}
            {r.sub && <span className="ml-1 text-[12px] text-fg-3">{r.sub}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export const HEAT_STEPS = [
  { min: 0, bg: "#f1f8f4", fg: "#16223a" },
  { min: 10, bg: "#d3ecdf", fg: "#16223a" },
  { min: 20, bg: "#a6d9bf", fg: "#16223a" },
  { min: 30, bg: "#67c59f", fg: "#16223a" },
  { min: 40, bg: "#1f7a57", fg: "#ffffff" },
] as const;

export function heatStyle(share: number) {
  const step = [...HEAT_STEPS].reverse().find((s) => share >= s.min) ?? HEAT_STEPS[0];
  return { backgroundColor: step.bg, color: step.fg };
}

export function HeatLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px] text-fg-3" aria-label="色の凡例">
      <span>選択率</span>
      {HEAT_STEPS.map((s, i) => (
        <span key={s.min} className="inline-flex items-center gap-1">
          <span className="inline-block size-3 rounded-[2px] border border-border" style={{ backgroundColor: s.bg }} aria-hidden />
          {i === HEAT_STEPS.length - 1 ? `${s.min}%以上` : `${s.min}〜${HEAT_STEPS[i + 1].min}%`}
        </span>
      ))}
    </div>
  );
}

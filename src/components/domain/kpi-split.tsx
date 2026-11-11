import { cn } from "@/lib/utils";

/** 自治体KPIの判定内訳（達成／未達成／判断不能）を1本の帯で示す。値は実データの件数 */
export function KpiSplit({
  achieved,
  notAchieved,
  undeterminable,
  className,
}: {
  achieved: number;
  notAchieved: number;
  undeterminable: number;
  className?: string;
}) {
  const total = achieved + notAchieved + undeterminable;
  const parts = [
    { label: "達成", n: achieved, cls: "bg-accent" },
    { label: "未達成", n: notAchieved, cls: "bg-danger/80" },
    { label: "判断不能", n: undeterminable, cls: "bg-chart-muted" },
  ];
  return (
    <div className={className}>
      <div
        className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-surface-3"
        role="img"
        aria-label={parts.map((p) => `${p.label}${p.n}項目`).join("、")}
      >
        {total > 0 &&
          parts.map((p) => (p.n > 0 ? <span key={p.label} className={cn("h-full", p.cls)} style={{ width: `${(p.n / total) * 100}%` }} /> : null))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-fg-2">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-1.5">
            <span aria-hidden className={cn("size-2 rounded-full", p.cls)} />
            {p.label}
            <span className="tabular font-bold text-fg">{p.n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

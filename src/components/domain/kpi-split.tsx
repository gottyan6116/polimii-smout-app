import { cn } from "@/lib/utils";

/**
 * 自治体KPIの判定内訳（達成／未達成／判断不能）を1本の積み上げ横棒で示す。
 * 各区分のブロックに件数を印字し、凡例は名前のみ。値は実データの件数。
 */
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
    { label: "達成", n: achieved, cls: "bg-[#1f7a57] text-white" },
    { label: "未達成", n: notAchieved, cls: "bg-[#c2412f] text-white" },
    { label: "判断不能", n: undeterminable, cls: "bg-[#a9b4c2] text-fg" },
  ];
  return (
    <div className={className}>
      <div className="flex h-6 w-full gap-[2px]" role="img" aria-label={parts.map((p) => `${p.label}${p.n}項目`).join("、")}>
        {total > 0 &&
          parts.map((p, i) =>
            p.n > 0 ? (
              <span
                key={p.label}
                className={cn(
                  "flex h-full items-center px-2 text-[12px] font-bold tabular-nums",
                  p.cls,
                  i === 0 && "rounded-l-[3px]",
                  i === parts.length - 1 && "rounded-r-[3px]",
                  // 表示上の最後のブロックにも右端の角を付ける
                  parts.slice(i + 1).every((q) => q.n === 0) && "rounded-r-[3px]",
                  parts.slice(0, i).every((q) => q.n === 0) && "rounded-l-[3px]",
                )}
                style={{ width: `${(p.n / total) * 100}%` }}
              >
                {p.n}
              </span>
            ) : null,
          )}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-fg-2">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-1.5">
            <span aria-hidden className={cn("size-2.5 rounded-[2px]", p.cls)} />
            {p.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

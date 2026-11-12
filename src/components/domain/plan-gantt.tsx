import type { PlannedMeasure } from "@/lib/planning/plan";

const MONTHS = ["4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月", "1月", "2月", "3月"];

/** 年度共通の節目（縦の点線）。月の位置は 4月=0 */
const MILESTONES = [
  { month: 5, label: "中間確認" },
  { month: 11, label: "成果取りまとめ" },
];

/** 四半期の選択から、連続する月の区間を作る */
function segments(quarters: PlannedMeasure["quarters"]): { start: number; end: number }[] {
  const months = Array.from({ length: 12 }, (_, m) => quarters[Math.floor(m / 3)]);
  const out: { start: number; end: number }[] = [];
  months.forEach((on, m) => {
    if (!on) return;
    const last = out[out.length - 1];
    if (last && last.end === m - 1) last.end = m;
    else out.push({ start: m, end: m });
  });
  return out;
}

/**
 * 担当課ごとのスイムレーンに、施策の実施期間を月単位で並べるガントチャート。
 * 色は「四半期ごとの実施施策数」のグラフと同じ施策ごとの色。
 */
export function PlanGantt({ items, colorOf, yearLabel }: { items: PlannedMeasure[]; colorOf: (id: string) => string; yearLabel: string }) {
  const lanes = [...new Set(items.map((x) => x.department))];
  const col = (m: number) => `${(m / 12) * 100}%`;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        {/* 月の見出し */}
        <div className="grid grid-cols-[9rem_minmax(0,1fr)] border-b border-border bg-surface-2 text-[11px] text-fg-3">
          <div className="px-3 py-2 font-medium">担当課 / 施策</div>
          <div className="relative grid grid-cols-12">
            {MONTHS.map((m, i) => (
              <div key={m} className={i > 0 ? "border-l border-border/70 py-2 text-center" : "py-2 text-center"}>
                {m}
              </div>
            ))}
          </div>
        </div>

        {lanes.map((lane) => {
          const rows = items.filter((x) => x.department === lane);
          return (
            <div key={lane} className="grid grid-cols-[9rem_minmax(0,1fr)] border-b border-border last:border-b-0">
              <div className="border-r border-border bg-surface-2/60 px-3 py-2 text-[12px] font-bold text-fg">{lane}</div>
              <div className="relative">
                {/* 月の罫線と節目 */}
                <div aria-hidden className="pointer-events-none absolute inset-0 grid grid-cols-12">
                  {MONTHS.map((m, i) => (
                    <div key={m} className={i > 0 ? "border-l border-border/60" : ""} />
                  ))}
                </div>
                {MILESTONES.map((ms) => (
                  <div
                    key={ms.label}
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 border-l border-dashed border-navy/50"
                    style={{ left: col(ms.month + 1) }}
                  />
                ))}
                <ul className="relative space-y-1.5 py-2">
                  {rows.map((x) => (
                    <li key={x.id} className="relative h-8">
                      {segments(x.quarters).map((s, si) => (
                        <div
                          key={si}
                          className="absolute top-0 flex h-8 items-center overflow-hidden rounded-[3px] px-2 text-[11px] font-medium text-white"
                          style={{ left: `calc(${col(s.start)} + 2px)`, width: `calc(${col(s.end - s.start + 1)} - 4px)`, backgroundColor: colorOf(x.id) }}
                          title={`${x.title}：${MONTHS[s.start]}〜${MONTHS[s.end]}`}
                        >
                          <span className="truncate">{si === 0 ? x.title : ""}</span>
                        </div>
                      ))}
                      {segments(x.quarters).length === 0 && (
                        <span className="absolute left-2 top-1.5 text-[11px] text-warn">実施時期が未設定</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-3 py-2 text-[11px] text-fg-3">
          <span>{yearLabel}（4月〜翌3月）</span>
          {MILESTONES.map((ms) => (
            <span key={ms.label} className="flex items-center gap-1.5">
              <span aria-hidden className="h-3 border-l border-dashed border-navy/60" />
              {MONTHS[ms.month]}末：{ms.label}
            </span>
          ))}
          <span>バーは施策の「実施する四半期」から作成。編集すると即時に反映されます。</span>
        </div>
      </div>
    </div>
  );
}

import { ArrowDown } from "lucide-react";
import type { KpiRow } from "@/lib/analysis/evaluation";
import { cn } from "@/lib/utils";

function Terminal({ label, n, tone }: { label: string; n: number; tone: "ok" | "ng" | "na" }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-[12px] leading-4",
        tone === "ok" && "border-transparent bg-accent-soft text-accent-ink",
        tone === "ng" && "border-danger-border bg-danger-soft text-danger",
        tone === "na" && "border-transparent bg-neutral-soft text-fg-2",
      )}
    >
      <span className="font-medium">{label}</span>
      <span className="tabular shrink-0 whitespace-nowrap font-bold">{n}項目</span>
    </div>
  );
}

/**
 * 判定ルールの分岐フロー。各終点に、今年度その判定になったKPIの件数を示す。
 * ルールは lib/analysis/metrics.ts の judge() と同じ順序。
 */
export function JudgementFlow({ kpis, isPartial }: { kpis: KpiRow[]; isPartial: boolean }) {
  const count = (pred: (k: KpiRow) => boolean) => kpis.filter(pred).length;
  const steps = [
    {
      q: "実績データはあるか",
      noLabel: "判断不能（未集計）",
      noCount: count((k) => k.actual === null),
    },
    {
      q: "目標は設定されているか",
      noLabel: "判断不能（目標未設定）",
      noCount: count((k) => k.actual !== null && k.target === null),
    },
    {
      q: "年度は終わっているか",
      noLabel: "判断不能（年度途中・進捗率のみ）",
      noCount: isPartial ? count((k) => k.actual !== null && k.target !== null) : 0,
    },
  ];
  const achieved = count((k) => k.judgement.status === "achieved");
  const notAchieved = count((k) => k.judgement.status === "not-achieved");


  return (
    <ol className="space-y-1.5" aria-label="判定ルール">
      {steps.map((s, i) => (
        <li key={s.q}>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1.1fr)] items-center gap-2">
            <div className="rounded-md border border-navy/30 bg-bg px-3 py-2 text-[13px] font-medium text-fg">
              <span className="tabular mr-1.5 text-fg-3">Q{i + 1}</span>
              {s.q}
            </div>
            <span className="flex items-center gap-1 text-[11px] text-fg-3">
              いいえ
              <span aria-hidden className="h-px w-4 bg-border-strong" />
            </span>
            <Terminal label={s.noLabel} n={s.noCount} tone="na" />
          </div>
          <p className="flex items-center gap-1 py-0.5 pl-4 text-[11px] text-fg-3">
            <ArrowDown className="size-3" aria-hidden />
            はい
          </p>
        </li>
      ))}
      <li>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1.1fr)] items-start gap-2">
          <div className="rounded-md border border-navy/30 bg-bg px-3 py-2 text-[13px] font-medium text-fg">
            <span className="tabular mr-1.5 text-fg-3">Q4</span>
            実績 ≧ 目標か
          </div>
          <span aria-hidden className="mt-4 h-px w-4 bg-border-strong" />
          <div className="space-y-1.5">
            <Terminal label="はい：達成" n={achieved} tone="ok" />
            <Terminal label="いいえ：未達成" n={notAchieved} tone="ng" />
          </div>
        </div>
      </li>
    </ol>
  );
}

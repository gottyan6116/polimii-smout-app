import type { KpiRow, ProjectRow } from "@/lib/analysis/evaluation";
import { fmtNum, fmtPct } from "@/lib/analysis/metrics";
import type { Municipality } from "@/lib/data/types";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./analysis";

/**
 * 施策体系図（政策目標 → 自治体KPI → 施策）。
 * 自治体の総合戦略で使われる「目標・指標・事業」の階層をそのまま木構造で示す。
 */
export function PolicyTree({ municipality, kpis, projects }: { municipality: Municipality; kpis: KpiRow[]; projects: ProjectRow[] }) {
  return (
    <div className="space-y-5">
      <div className="hidden grid-cols-[15rem_17rem_minmax(0,1fr)] gap-6 text-[12px] font-medium text-fg-3 lg:grid">
        <span>政策目標</span>
        <span>自治体KPI（判定）</span>
        <span>施策（SMOUT掲載プロジェクト）</span>
      </div>
      {municipality.policyGoals.map((goal, gi) => {
        const goalKpis = kpis.filter((k) => k.kpi.goalIndex === gi);
        return (
          <div key={goal} className="grid gap-3 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-6">
            <div className="relative">
              <div className="rounded-md border border-navy/25 bg-navy/[0.04] px-3 py-2.5">
                <p className="text-[11px] font-medium text-fg-3">目標 {gi + 1}</p>
                <p className="text-[13px] font-bold leading-5 text-fg">{goal}</p>
              </div>
              {goalKpis.length > 0 && <span aria-hidden className="absolute -right-6 top-6 hidden h-px w-6 bg-border-strong lg:block" />}
            </div>

            {goalKpis.length === 0 ? (
              <p className="self-center text-[12px] text-fg-3">この目標に対応づけたKPIはありません。</p>
            ) : (
              <ul className="relative space-y-2 border-l border-border-strong pl-5 lg:ml-0">
                {goalKpis.map((k) => {
                  const linked = projects.filter((p) => p.project.kpiIds.includes(k.kpi.id));
                  return (
                    <li key={k.kpi.id} className="relative grid gap-2 md:grid-cols-[17rem_minmax(0,1fr)] md:gap-6">
                      <span aria-hidden className="absolute -left-5 top-6 h-px w-5 bg-border-strong" />
                      <div
                        className={cn(
                          "relative rounded-md border bg-bg px-3 py-2",
                          k.judgement.status === "not-achieved" ? "border-danger-border" : "border-border",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[13px] font-medium leading-5 text-fg">{k.kpi.name}</span>
                          <StatusBadge judgement={k.judgement} />
                        </div>
                        <p className="tabular mt-0.5 text-[12px] text-fg-3">
                          {fmtNum(k.actual, k.kpi.unit)} / 目標 {fmtNum(k.target, k.kpi.unit)}
                          {k.judgement.rate !== null && `（${fmtPct(k.judgement.rate)}）`}
                        </p>
                        {linked.length > 0 && <span aria-hidden className="absolute -right-6 top-6 hidden h-px w-6 bg-border-strong md:block" />}
                      </div>
                      <div className={cn("min-w-0", linked.length > 0 && "md:border-l md:border-border-strong md:pl-5")}>
                        {linked.length === 0 ? (
                          <p className="pt-2 text-[12px] text-fg-3">
                            {municipality.usesSmout ? "対応づけたSMOUT掲載施策なし" : "SMOUT未利用のため施策の反応データなし"}
                          </p>
                        ) : (
                          <ul className="space-y-1.5">
                            {linked.map((p) => (
                              <li key={p.project.id} className="relative flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-surface-2 px-3 py-1.5 text-[12px]">
                                <span aria-hidden className="absolute -left-5 top-1/2 hidden h-px w-5 bg-border-strong md:block" />
                                <span className="font-medium text-fg">{p.project.name}</span>
                                {p.totals ? (
                                  <span className="tabular text-fg-3">
                                    応募したい {fmtNum(p.totals.apply, "件")} / 目標 {fmtNum(p.targetApply, "件")}
                                  </span>
                                ) : (
                                  <span className="text-fg-3">この年度の活動データなし</span>
                                )}
                                {p.totals && <StatusBadge judgement={p.applyJudgement} />}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

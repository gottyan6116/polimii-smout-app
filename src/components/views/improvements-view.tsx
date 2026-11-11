"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FINDING_LABEL, type Finding, type FindingKind } from "@/lib/analysis/findings";
import { analyzeImprovements, type Issue, type Level } from "@/lib/analysis/improvements";
import type { FiscalYearId } from "@/lib/data/types";
import { updatePlan, usePlan, useWorkContext } from "@/lib/store/local-store";
import { cn } from "@/lib/utils";
import { SourceNote } from "@/components/domain/analysis";
import { Columns } from "@/components/charts/charts";
import { INK } from "@/components/charts/theme";
import { CreateDocButton } from "@/components/domain/create-doc-button";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, PageHeader, Panel } from "@/components/ui/primitives";

const AREAS: (Issue["area"] | "すべて")[] = ["すべて", "施策実績", "自治体KPI", "関心・属性", "データ"];

const KIND_MARK: Record<FindingKind, string> = {
  fact: "bg-navy",
  hypothesis: "bg-warn",
  action: "bg-accent-strong",
  verify: "bg-fg-3",
};

const IMPACTS: Level[] = ["高", "中", "低"];
const DIFFICULTIES: Level[] = ["低", "中", "高"];

function FindingCell({ finding, kind }: { finding: Finding | null; kind: FindingKind }) {
  return (
    <div className="bg-bg px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[12px] font-bold text-fg-2">
        <span aria-hidden className={cn("size-2 rounded-[2px]", KIND_MARK[kind])} />
        {FINDING_LABEL[kind]}
      </p>
      {finding ? (
        <>
          <p className="mt-1 text-[13px] leading-6 text-fg">{finding.text}</p>
          {finding.basis && <p className="mt-1 text-[12px] leading-5 text-fg-3">根拠・前提：{finding.basis}</p>}
        </>
      ) : (
        <p className="mt-1 text-[13px] text-fg-3">該当なし</p>
      )}
    </div>
  );
}

function LevelBadge({ level, kind }: { level: Level; kind: "impact" | "difficulty" }) {
  const good = kind === "impact" ? level === "高" : level === "低";
  return <Badge tone={good ? "accent" : "neutral"}>{level}</Badge>;
}

export function ImprovementsView() {
  const ctx = useWorkContext();
  return <ImprovementsInner key={`${ctx.municipalityId}-${ctx.fiscalYearId}`} municipalityId={ctx.municipalityId} fiscalYearId={ctx.fiscalYearId} />;
}

function ImprovementsInner({ municipalityId, fiscalYearId }: { municipalityId: string; fiscalYearId: FiscalYearId }) {
  const router = useRouter();
  const r = useMemo(() => analyzeImprovements(municipalityId, fiscalYearId), [municipalityId, fiscalYearId]);
  const [area, setArea] = useState<(typeof AREAS)[number]>("すべて");
  const plan = usePlan(municipalityId);
  const [draft, setDraft] = useState<string[] | null>(null);
  const chosen = (draft ?? plan.selected).filter((id) => r.measures.some((x) => x.id === id));
  const setChosen = (fn: (c: string[]) => string[]) => setDraft(fn(chosen));
  const m = r.evaluation.municipality;
  const fy = r.evaluation.fiscalYear;
  const issues = area === "すべて" ? r.issues : r.issues.filter((i) => i.area === area);
  const verifyItems = [...new Map(r.issues.flatMap((i) => (i.verify ? [[i.verify.text, i.verify] as const] : []))).values()];

  const toggle = (id: string) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const reflect = () => {
    const ordered = r.measures.filter((x) => chosen.includes(x.id)).map((x) => x.id);
    updatePlan(municipalityId, (p) => ({ ...p, selected: ordered }));
    router.push("/planning");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="課題分析・改善提案"
        description={`${m.name}・${fy.label}の施策評価と関心分析から、改善の余地と改善施策の候補を整理します。`}
        actions={<CreateDocButton type="improvement-proposal" label="改善提案書を作成する" variant="secondary" />}
      />

      <div className="grid gap-5 lg:grid-cols-12">
        <Panel
          className="lg:col-span-8"
          title="優先度マトリクス"
          description="縦＝想定される効果、横＝実現難易度。左上ほど先に取り組む候補です。施策名を押すと採用／解除できます。"
        >
          <div className="grid grid-cols-[2.5rem_repeat(3,minmax(0,1fr))] gap-1.5 text-[12px]">
            <span />
            {DIFFICULTIES.map((d) => (
              <span key={d} className="pb-1 text-center font-medium text-fg-3">
                難易度 {d}
              </span>
            ))}
            {IMPACTS.map((imp) => (
              <div key={imp} className="contents">
                <span className="grid place-items-center font-medium text-fg-3 [writing-mode:vertical-rl]">効果 {imp}</span>
                {DIFFICULTIES.map((dif) => {
                  const cell = r.measures.filter((x) => x.impact === imp && x.difficulty === dif);
                  const best = imp === "高" && dif === "低";
                  const good = (imp === "高" && dif === "中") || (imp === "中" && dif === "低");
                  return (
                    <div
                      key={dif}
                      className={cn(
                        "min-h-[84px] rounded-md p-2",
                        best ? "bg-accent-soft" : good ? "bg-accent-soft/45" : "bg-surface-2",
                      )}
                    >
                      <div className="flex flex-wrap gap-1">
                        {cell.map((x) => {
                          const on = chosen.includes(x.id);
                          return (
                            <button
                              key={x.id}
                              type="button"
                              aria-pressed={on}
                              onClick={() => toggle(x.id)}
                              title={x.title}
                              className={cn(
                                "max-w-full truncate rounded-[5px] border px-1.5 py-0.5 text-left text-[11px] leading-4 transition-colors duration-150",
                                on
                                  ? "border-accent-strong bg-accent-strong text-white"
                                  : "border-border-strong bg-bg text-fg-2 hover:border-fg-3 hover:text-fg",
                              )}
                            >
                              {x.title}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="lg:col-span-4" title="課題の区分別件数" description={`検出された課題 ${r.issues.length}件の内訳`}>
          <Columns
            data={(["施策実績", "自治体KPI", "関心・属性", "データ"] as const).map((a) => ({
              area: a,
              count: r.issues.filter((i) => i.area === a).length,
            }))}
            xKey="area"
            series={[{ key: "count", name: "件数", color: INK.base }]}
            unit="件"
            emphasize={
              (["施策実績", "自治体KPI", "関心・属性", "データ"] as const)
                .map((a) => ({ a, n: r.issues.filter((i) => i.area === a).length }))
                .sort((x, y) => y.n - x.n)[0]?.a
            }
            height={200}
          />
        </Panel>
      </div>

      <Panel
        title={`検出された課題（${r.issues.length}件）`}
        description="各課題を「確認できた事実」「考えられる仮説」「推奨するアクション」「検証が必要な事項」に分けて示します。"
        actions={
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="分析対象">
            {AREAS.map((a) => {
              const count = a === "すべて" ? r.issues.length : r.issues.filter((i) => i.area === a).length;
              return (
                <button
                  key={a}
                  type="button"
                  role="tab"
                  aria-selected={area === a}
                  onClick={() => setArea(a)}
                  disabled={count === 0}
                  className={cn(
                    "h-8 rounded-md border px-2.5 text-[12px] font-medium transition-colors disabled:opacity-40",
                    area === a ? "border-navy bg-navy text-white" : "border-border-strong bg-bg text-fg-2 hover:bg-surface-2",
                  )}
                >
                  {a} <span className="tabular">{count}</span>
                </button>
              );
            })}
          </div>
        }
        bodyClassName="p-0"
      >
        {issues.length === 0 ? (
          <div className="p-4">
            <EmptyState title="この区分の課題は検出されませんでした" />
          </div>
        ) : (
          <ol className="divide-y divide-border">
            {issues.map((i, n) => (
              <li key={i.id} className="px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tabular text-[13px] font-bold text-fg-3">{n + 1}</span>
                  <h3 className="text-[15px] font-bold text-fg">{i.title}</h3>
                  <Badge tone="outline">{i.area}</Badge>
                </div>
                <div className="mt-3 grid gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-2 xl:grid-cols-4">
                  <FindingCell finding={i.fact} kind="fact" />
                  <FindingCell finding={i.hypothesis} kind="hypothesis" />
                  <FindingCell finding={i.action} kind="action" />
                  <FindingCell finding={i.verify} kind="verify" />
                </div>
                {i.fact.sourceIds.length > 0 && <SourceNote sourceIds={i.fact.sourceIds} className="mt-2" />}
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <Panel
        id="measures"
        title="改善施策の候補と優先順位"
        description="優先度は「想定される効果」と「実現難易度」から算出しています（効果×2＋容易さ）。採用する施策を選んで次年度計画に反映します。"
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-[13px]">
            <caption className="sr-only">改善施策の候補</caption>
            <thead className="bg-surface-2">
              <tr className="border-b border-border text-[12px] text-fg-3">
                <th className="w-16 px-3 py-2 text-left font-medium" scope="col">採用</th>
                <th className="px-3 py-2 text-left font-medium" scope="col">施策案・対象・内容</th>
                <th className="px-3 py-2 text-left font-medium" scope="col">実行時期</th>
                <th className="px-3 py-2 text-left font-medium" scope="col">KPI案</th>
                <th className="px-3 py-2 text-left font-medium" scope="col">効果</th>
                <th className="px-3 py-2 text-left font-medium" scope="col">難易度</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {r.measures.map((x, idx) => {
                const on = chosen.includes(x.id);
                return (
                  <tr key={x.id} className={cn(on && "bg-accent-soft/60")}>
                    <td className="px-3 py-3 align-top">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggle(x.id)}
                          className="size-4 accent-[var(--accent-strong)]"
                          aria-label={`${x.title}を採用`}
                        />
                        <span className="tabular text-[12px] text-fg-3">{idx + 1}位</span>
                      </label>
                    </td>
                    <td className="max-w-[420px] px-3 py-3 align-top">
                      <p className="font-medium text-fg">{x.title}</p>
                      <p className="mt-0.5 text-[12px] text-fg-3">対象：{x.target}</p>
                      <p className="mt-1 text-[13px] leading-6 text-fg-2">{x.content}</p>
                      <p className="mt-1 text-[12px] text-fg-3">担当案：{x.department}</p>
                    </td>
                    <td className="px-3 py-3 align-top text-[12px] text-fg-2">{x.timing}</td>
                    <td className="max-w-[260px] px-3 py-3 align-top text-[12px] leading-5">
                      <p className="font-medium text-fg">{x.kpi.name}</p>
                      <p className="text-fg-2">現状：{x.kpi.baseline}</p>
                      <p className="text-fg-2">
                        目標案：{x.kpi.proposal ?? <Badge tone="warn">要設定</Badge>}
                      </p>
                      <p className="mt-0.5 text-fg-3">根拠：{x.kpi.basis}</p>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <LevelBadge level={x.impact} kind="impact" />
                    </td>
                    <td className="px-3 py-3 align-top">
                      <LevelBadge level={x.difficulty} kind="difficulty" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-fg-2" aria-live="polite">
            {chosen.length ? `${chosen.length}件を選択中` : "採用する施策を選択してください"}
          </p>
          <Button variant="primary" onClick={reflect} disabled={chosen.length === 0}>
            次年度計画に反映する
          </Button>
        </div>
      </Panel>

      <Panel title="必要な追加データ・検証事項" description="現状のデータでは判断できない点です。次年度の計画・データ提供協議で扱います。">
        <ul className="space-y-1.5 text-[13px] leading-6">
          {verifyItems.map((v, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-fg-3">・</span>
              <span>{v.text}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

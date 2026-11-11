"use client";

import { ChevronDown, RotateCcw } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { PLAN_TARGET_LABEL } from "@/lib/data/demo/dataset";
import { analyzeImprovements, type Measure } from "@/lib/analysis/improvements";
import { fmtNum, fmtPct } from "@/lib/analysis/metrics";
import { applyEdits, type MeasureEdit, QUARTER_LABELS } from "@/lib/planning/plan";
import { updatePlan, usePlan, useWorkContext } from "@/lib/store/local-store";
import { cn } from "@/lib/utils";
import { SourceNote, StatusBadge } from "@/components/domain/analysis";
import { CreateDocButton } from "@/components/domain/create-doc-button";
import { Button } from "@/components/ui/button";
import { Badge, Meta, PageHeader, Panel } from "@/components/ui/primitives";

const inputCls =
  "w-full rounded-md border border-border-strong bg-bg px-2.5 py-1.5 text-[13px] leading-6 text-fg placeholder:text-fg-3 hover:border-fg-3";

function Field({ label, children, hint }: { label: string; children: (id: string) => React.ReactNode; hint?: string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[12px] font-medium text-fg-3">
        {label}
      </label>
      {children(id)}
      {hint && <p className="text-[12px] leading-5 text-fg-3">{hint}</p>}
    </div>
  );
}

function MeasureEditor({
  measure,
  edit,
  selected,
  onToggle,
  onEdit,
  onReset,
}: {
  measure: Measure;
  edit: MeasureEdit | undefined;
  selected: boolean;
  onToggle: () => void;
  onEdit: (patch: MeasureEdit) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const x = applyEdits(measure, edit);
  const panelId = useId();

  return (
    <li className={cn("rounded-md border bg-bg", selected ? "border-accent-strong" : "border-border")}>
      <div className="flex items-start gap-3 px-3 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`${x.title}を計画に含める`}
          className="mt-1 size-4 shrink-0 accent-[var(--accent-strong)]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-fg">{x.title}</p>
            {x.edited && <Badge tone="outline">編集済み</Badge>}
          </div>
          <p className="mt-0.5 text-[12px] text-fg-3">
            対象：{x.target}／時期：{x.timing}／担当：{x.department}
          </p>
          <p className="mt-0.5 text-[12px] text-fg-3">
            KPI：{x.kpi.name}（現状 {x.kpi.baseline}／目標案 {x.kpi.proposal ?? "要設定"}）
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-fg-2 hover:bg-surface-3"
        >
          編集
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
      </div>
      {open && (
        <div id={panelId} className="grid gap-3 border-t border-border bg-surface-2 px-3 py-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="施策名">{(id) => <input id={id} className={inputCls} value={x.title} onChange={(e) => onEdit({ title: e.target.value })} />}</Field>
          </div>
          <Field label="目的">{(id) => <input id={id} className={inputCls} value={x.purpose} onChange={(e) => onEdit({ purpose: e.target.value })} />}</Field>
          <Field label="対象者">{(id) => <input id={id} className={inputCls} value={x.target} onChange={(e) => onEdit({ target: e.target.value })} />}</Field>
          <div className="sm:col-span-2">
            <Field label="具体的な実施内容">
              {(id) => <textarea id={id} rows={3} className={inputCls} value={x.content} onChange={(e) => onEdit({ content: e.target.value })} />}
            </Field>
          </div>
          <Field label="実行時期（説明）">{(id) => <input id={id} className={inputCls} value={x.timing} onChange={(e) => onEdit({ timing: e.target.value })} />}</Field>
          <Field label="担当部署案">{(id) => <input id={id} className={inputCls} value={x.department} onChange={(e) => onEdit({ department: e.target.value })} />}</Field>
          <fieldset className="sm:col-span-2">
            <legend className="mb-1 text-[12px] font-medium text-fg-3">実施する四半期</legend>
            <div className="flex flex-wrap gap-3">
              {QUARTER_LABELS.map((q, i) => (
                <label key={q} className="inline-flex items-center gap-1.5 text-[13px]">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--accent-strong)]"
                    checked={x.quarters[i]}
                    onChange={() => {
                      const next = [...x.quarters] as Measure["quarters"];
                      next[i] = !next[i];
                      onEdit({ quarters: next });
                    }}
                  />
                  {q}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="sm:col-span-2">
            <Field label={`KPI目標案（${x.kpi.name}）`} hint={`算出：${x.kpi.formula}／根拠：${x.kpi.basis}`}>
              {(id) => (
                <input
                  id={id}
                  className={inputCls}
                  value={edit?.kpiProposal ?? measure.kpi.proposal ?? ""}
                  placeholder="根拠を確認のうえ入力（空欄は「要設定」）"
                  onChange={(e) => onEdit({ kpiProposal: e.target.value })}
                />
              )}
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Button size="sm" variant="ghost" onClick={onReset} disabled={!x.edited}>
              <RotateCcw aria-hidden />
              提案時の内容に戻す
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

export function PlanningView() {
  const ctx = useWorkContext();
  const r = useMemo(() => analyzeImprovements(ctx.municipalityId, ctx.fiscalYearId), [ctx.municipalityId, ctx.fiscalYearId]);
  const plan = usePlan(ctx.municipalityId);
  const ev = r.evaluation;
  const ins = r.insights;
  const m = ev.municipality;
  const fy = ev.fiscalYear;
  const topAge = ins.available ? [...ins.ageRows].sort((a, b) => b.count - a.count)[0] : null;
  const suggestedTarget = topAge ? `${topAge.age}を中心とする、「${ins.themes[0].theme}」「${ins.themes[1].theme}」に関心のある移住検討者` : "";
  const selected = plan.selected.filter((id) => r.measures.some((x) => x.id === id));
  const planned = r.measures.filter((x) => selected.includes(x.id)).map((x) => applyEdits(x, plan.edits[x.id]));

  const toggle = (id: string) =>
    updatePlan(m.id, (p) => {
      const has = p.selected.includes(id);
      const next = has ? p.selected.filter((x) => x !== id) : [...p.selected, id];
      return { ...p, selected: r.measures.filter((x) => next.includes(x.id)).map((x) => x.id) };
    });
  const edit = (id: string, patch: MeasureEdit) =>
    updatePlan(m.id, (p) => ({ ...p, edits: { ...p.edits, [id]: { ...p.edits[id], ...patch } } }));
  const reset = (id: string) =>
    updatePlan(m.id, (p) => {
      const edits = { ...p.edits };
      delete edits[id];
      return { ...p, edits };
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="次年度の施策立案"
        description={`${fy.label}の分析結果を根拠に、${PLAN_TARGET_LABEL}の重点ターゲット・施策・KPI・スケジュールを検討します。編集内容はこの端末に自動保存されます。`}
        actions={
          <>
            <CreateDocButton type="improvement-proposal" label="改善提案書を作成する" variant="secondary" />
            <CreateDocButton type="annual-plan" label="次年度事業計画書を作成する" />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* 左：分析根拠 */}
        <div className="min-w-0 space-y-4 lg:col-span-5">
          <Panel title="分析の根拠" description="計画案の前提になっているデータ">
            <dl className="space-y-1">
              <Meta label="対象自治体">{m.name}（{m.note}）</Meta>
              <Meta label="基準年度">{fy.label}（{fy.periodLabel}）</Meta>
              <Meta label="計画対象">{PLAN_TARGET_LABEL}</Meta>
              <Meta label="所管">{m.department}</Meta>
            </dl>
            <h3 className="mt-4 text-[12px] font-medium text-fg-3">現行の政策目標</h3>
            <ul className="mt-1 space-y-0.5 text-[13px]">
              {m.policyGoals.map((g) => (
                <li key={g}>・{g}</li>
              ))}
            </ul>
          </Panel>

          <Panel title={`${fy.label}の主要な成果・課題`} bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {ev.kpis.map((k) => (
                <li key={k.kpi.id} className="flex items-start justify-between gap-3 px-4 py-2.5 text-[13px]">
                  <span className="min-w-0">
                    <span className="block text-fg">{k.kpi.name}</span>
                    <span className="tabular block text-[12px] text-fg-3">
                      目標 {fmtNum(k.target, k.kpi.unit)}／実績 {fmtNum(k.actual, k.kpi.unit)}
                    </span>
                  </span>
                  <StatusBadge judgement={k.judgement} />
                </li>
              ))}
            </ul>
            <div className="border-t border-border px-4 py-3">
              <h3 className="text-[12px] font-medium text-fg-3">検出された課題</h3>
              <ul className="mt-1 space-y-1 text-[13px]">
                {r.issues.map((i) => (
                  <li key={i.id}>・{i.title}</li>
                ))}
              </ul>
            </div>
          </Panel>

          <Panel title="関心テーマ・ターゲット属性">
            {ins.available && topAge ? (
              <>
                <p className="text-[13px] leading-6">
                  {ins.filters.scope === "own" ? `${m.name}の反応者` : `参考集計（${ins.filters.region}）`}で最も多い年代は
                  <strong className="font-bold">{topAge.age}</strong>（{fmtPct(topAge.share)}）。
                </p>
                <ol className="mt-2 space-y-1 text-[13px]">
                  {ins.themes.slice(0, 4).map((t, i) => (
                    <li key={t.theme} className="flex justify-between gap-3">
                      <span>
                        <span className="tabular mr-2 text-fg-3">{i + 1}</span>
                        {t.theme}
                      </span>
                      <span className="tabular text-fg-2">{fmtPct(t.share)}</span>
                    </li>
                  ))}
                </ol>
                <SourceNote sourceIds={ins.sourceIds} className="mt-3" />
              </>
            ) : (
              <p className="text-[13px] text-fg-3">{ins.unavailableReason}</p>
            )}
          </Panel>
        </div>

        {/* 右：施策計画案 */}
        <div className="min-w-0 space-y-4 lg:col-span-7">
          <Panel title="推奨する重点ターゲット" description="分析結果からの推奨です。所管課の判断で編集してください。">
            <label htmlFor="focus" className="sr-only">
              重点ターゲット
            </label>
            <textarea
              id="focus"
              rows={2}
              className={inputCls}
              value={plan.focusTarget ?? suggestedTarget}
              onChange={(e) => updatePlan(m.id, (p) => ({ ...p, focusTarget: e.target.value }))}
            />
            {plan.focusTarget !== undefined && plan.focusTarget !== suggestedTarget && (
              <button
                type="button"
                className="mt-1 text-[12px] text-accent-ink underline underline-offset-4"
                onClick={() => updatePlan(m.id, (p) => ({ ...p, focusTarget: undefined }))}
              >
                推奨内容に戻す
              </button>
            )}
          </Panel>

          <Panel
            title="重点施策"
            description={`チェックした施策が計画書に入ります（${selected.length}件選択中）。「編集」で内容・時期・KPI目標案を修正できます。`}
          >
            <ul className="space-y-2">
              {r.measures.map((x) => (
                <MeasureEditor
                  key={x.id}
                  measure={x}
                  edit={plan.edits[x.id]}
                  selected={selected.includes(x.id)}
                  onToggle={() => toggle(x.id)}
                  onEdit={(patch) => edit(x.id, patch)}
                  onReset={() => reset(x.id)}
                />
              ))}
            </ul>
          </Panel>

          <Panel title="実行スケジュール" bodyClassName="p-0">
            {planned.length === 0 ? (
              <p className="px-4 py-4 text-[13px] text-fg-3">施策を選択すると、四半期ごとのスケジュールが表示されます。</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-[13px]">
                  <thead className="bg-surface-2">
                    <tr className="border-b border-border text-[12px] text-fg-3">
                      <th className="px-3 py-2 text-left font-medium" scope="col">施策</th>
                      {QUARTER_LABELS.map((q) => (
                        <th key={q} className="w-[13%] px-2 py-2 text-center font-medium" scope="col">
                          {q}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {planned.map((x) => (
                      <tr key={x.id}>
                        <th scope="row" className="px-3 py-2 text-left font-normal">
                          {x.title}
                        </th>
                        {x.quarters.map((q, i) => (
                          <td key={i} className="px-1.5 py-2">
                            <span
                              className={cn("block h-5 rounded-[3px]", q ? "bg-accent" : "bg-surface-3")}
                              aria-label={q ? `${QUARTER_LABELS[i]} 実施` : `${QUARTER_LABELS[i]} なし`}
                              role="img"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="KPI案と注意事項" bodyClassName="p-0">
            {planned.length === 0 ? (
              <p className="px-4 py-4 text-[13px] text-fg-3">施策を選択すると、KPI案と根拠が表示されます。</p>
            ) : (
              <ul className="divide-y divide-border">
                {planned.map((x) => (
                  <li key={x.id} className="px-4 py-3 text-[13px]">
                    <p className="font-medium text-fg">{x.kpi.name}</p>
                    <p className="tabular text-fg-2">
                      現状 {x.kpi.baseline} → 目標案 {x.kpi.proposal ?? <Badge tone="warn">要設定</Badge>}
                    </p>
                    <p className="text-[12px] leading-5 text-fg-3">根拠：{x.kpi.basis}</p>
                    <p className="text-[12px] leading-5 text-fg-3">注意：{x.cautions}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <div className="flex flex-col gap-3 rounded-[10px] border border-border bg-bg p-5 shadow-raised">
            <p className="font-bold text-fg">計画案から文書を作成する</p>
            <p className="text-[13px] text-fg-2">
              選択した施策・編集内容・KPI案をそのまま反映します。施策が未選択の場合は、優先度の高い3件を「仮」として掲載し、要確認として表示します。
            </p>
            <div className="flex flex-wrap gap-2">
              <CreateDocButton type="annual-plan" label="次年度事業計画書を作成する" />
              <CreateDocButton type="improvement-proposal" label="改善提案書を作成する" variant="secondary" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

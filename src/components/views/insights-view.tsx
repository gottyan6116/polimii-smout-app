"use client";

import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { AGE_BANDS, REGIONS, THEMES } from "@/lib/data/demo/dataset";
import { dataSource } from "@/lib/data/adapter";
import type { AgeBand, Municipality, RegionId } from "@/lib/data/types";
import { analyzeInsights, defaultFilters, type InsightFilters } from "@/lib/analysis/insights";
import { FORMULAS, fmtNum, fmtPct, fmtPt } from "@/lib/analysis/metrics";
import { useWorkContext } from "@/lib/store/local-store";
import { cn } from "@/lib/utils";
import { BarRows, HeatLegend, heatStyle } from "@/components/domain/bars";
import { FindingGroups, SourceNote } from "@/components/domain/analysis";
import { CreateDocButton } from "@/components/domain/create-doc-button";
import { ButtonLink } from "@/components/ui/button";
import { Badge, EmptyState, PageHeader, Panel, SelectField } from "@/components/ui/primitives";

const STAGE_COLORS = ["#d3ecdf", "#8fcfb1", "#3f9f78", "#1f5f45"];

export function InsightsView() {
  const ctx = useWorkContext();
  const m = dataSource.getMunicipality(ctx.municipalityId)!;
  // 自治体が変わったらフィルターを初期化する
  return <InsightsInner key={m.id} m={m} fiscalYearId={ctx.fiscalYearId} />;
}

function InsightsInner({ m, fiscalYearId }: { m: Municipality; fiscalYearId: ReturnType<typeof useWorkContext>["fiscalYearId"] }) {
  const [filters, setFilters] = useState<InsightFilters>(() => defaultFilters(m));
  const r = useMemo(() => analyzeInsights(m.id, fiscalYearId, filters), [m.id, fiscalYearId, filters]);
  const fy = dataSource.getFiscalYear(fiscalYearId);

  const toggleAge = (a: AgeBand) =>
    setFilters((f) => ({ ...f, ages: f.ages.includes(a) ? f.ages.filter((x) => x !== a) : [...f.ages, a] }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="地域・人材・関心分析"
        description="どの年代・移住検討段階の人が、どのテーマに関心を持っているかを把握し、施策の対象を検討します。"
        actions={<CreateDocButton type="insight-report" label="分析レポートを作成する" variant="secondary" />}
      />

      <section aria-label="分析条件" className="rounded-lg border border-border bg-surface-2 p-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <fieldset>
            <legend className="mb-1 text-[12px] font-medium text-fg-3">データの範囲</legend>
            <div className="inline-flex rounded-md border border-border-strong bg-bg p-0.5" role="radiogroup">
              {(
                [
                  { v: "own", label: `${m.name}の反応者`, disabled: !m.usesSmout },
                  { v: "reference", label: "参考集計（地域別）", disabled: false },
                ] as const
              ).map((o) => (
                <button
                  key={o.v}
                  type="button"
                  role="radio"
                  aria-checked={filters.scope === o.v}
                  disabled={o.disabled}
                  onClick={() => setFilters((f) => ({ ...f, scope: o.v }))}
                  className={cn(
                    "h-8 rounded-[5px] px-3 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:text-fg-3/60",
                    filters.scope === o.v ? "bg-accent-strong text-white" : "text-fg-2 hover:bg-surface-3",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </fieldset>
          <SelectField
            id="region"
            label="地域ブロック（参考集計）"
            value={filters.region}
            onChange={(v) => setFilters((f) => ({ ...f, region: v as RegionId }))}
            options={REGIONS.map((x) => ({ value: x, label: x === m.prefectureArea ? `${x}（${m.name}の所在地域）` : x }))}
            className={cn("w-60", filters.scope === "own" && "opacity-50")}
          />
          <fieldset>
            <legend className="mb-1 text-[12px] font-medium text-fg-3">年代（未選択＝全年代）</legend>
            <div className="flex flex-wrap gap-1.5">
              {AGE_BANDS.map((a) => {
                const on = filters.ages.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleAge(a)}
                    className={cn(
                      "h-8 rounded-md border px-2.5 text-[13px] transition-colors",
                      on ? "border-accent-strong bg-accent-soft font-medium text-accent-ink" : "border-border-strong bg-bg text-fg-2 hover:bg-surface-3",
                    )}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="text-[12px] leading-5 text-fg-3">
            期間：{fy.periodLabel}
            <br />
            （年度は画面上部で変更）
          </div>
        </div>
        {!m.usesSmout && (
          <p className="mt-3 text-[12px] text-fg-3">
            {m.name}はSMOUT未利用のため、自自治体の反応者データはありません。地域ブロック別の参考集計を表示しています。
          </p>
        )}
      </section>

      {!r.available ? (
        <EmptyState title="この条件のデータはありません">{r.unavailableReason}</EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-fg-2">
            <span>
              対象：{filters.scope === "own" ? `${m.name}のプロジェクトに反応した利用者` : `参考集計（${filters.region}・自治体横断）`}
            </span>
            <Badge tone="outline">ユニーク人数 {fmtNum(r.totalUnique, "人")}</Badge>
            {filters.ages.length > 0 && <Badge tone="accent">年代で絞り込み中：{filters.ages.join("・")}</Badge>}
            {filters.scope === "reference" && <Badge tone="warn">提供可否 未確認</Badge>}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="年代別の構成" description="期間内に反応した人のユニーク人数（全年代）">
              <BarRows
                rows={r.ageRows.map((a) => ({
                  key: a.age,
                  label: a.age,
                  value: a.count,
                  display: fmtNum(a.count, "人"),
                  sub: fmtPct(a.share),
                }))}
                highlight={[...r.ageRows].sort((a, b) => b.count - a.count)[0]?.age}
              />
            </Panel>

            <Panel title="移住検討段階" description="利用者がプロフィールで選んだ移住ステップ（ユニーク人数）">
              <div className="flex h-7 w-full overflow-hidden rounded-[3px]" role="img" aria-label={r.stageRows.map((s) => `${s.stage} ${fmtPct(s.share)}`).join("、")}>
                {r.stageRows.map((s, i) => (
                  <span key={s.stage} style={{ width: `${s.share}%`, backgroundColor: STAGE_COLORS[i] }} className="h-full" />
                ))}
              </div>
              <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
                {r.stageRows.map((s, i) => (
                  <li key={s.stage} className="flex items-center gap-2">
                    <span className="size-3 shrink-0 rounded-[2px]" style={{ backgroundColor: STAGE_COLORS[i] }} aria-hidden />
                    <span className="flex-1 text-fg-2">{s.stage}</span>
                    <span className="tabular text-fg">{fmtNum(s.count, "人")}</span>
                    <span className="tabular w-12 text-right text-fg-3">{fmtPct(s.share)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12px] text-fg-3">段階は利用者の自己申告で、実際の移住の有無を示すものではありません。</p>
            </Panel>
          </div>

          <Panel
            title="関心テーマのランキング"
            description={`${FORMULAS.themeShare}${filters.ages.length ? "（選択した年代のみ）" : ""}`}
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-[13px]">
                <thead className="bg-surface-2">
                  <tr className="border-b border-border text-[12px] text-fg-3">
                    <th className="w-12 px-3 py-2 text-left font-medium">順位</th>
                    <th className="px-3 py-2 text-left font-medium">テーマ</th>
                    <th className="w-[34%] px-3 py-2 text-left font-medium">選択率</th>
                    <th className="px-3 py-2 text-right font-medium">人数</th>
                    <th className="px-3 py-2 text-right font-medium">前年度差</th>
                    {m.usesSmout && <th className="px-3 py-2 text-left font-medium">対応する現行施策</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {r.themes.map((t, i) => (
                    <tr key={t.theme}>
                      <td className="tabular px-3 py-2 text-fg-3">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">{t.theme}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 flex-1 rounded-[2px] bg-surface-3" aria-hidden>
                            <span className="block h-full rounded-[2px] bg-accent" style={{ width: `${Math.min(100, (t.share / Math.max(r.themes[0].share, 1)) * 100)}%` }} />
                          </span>
                          <span className="tabular w-12 text-right">{fmtPct(t.share)}</span>
                        </div>
                      </td>
                      <td className="tabular px-3 py-2 text-right">{fmtNum(t.count, "人")}</td>
                      <td className={cn("tabular px-3 py-2 text-right", t.shareDiff !== null && t.shareDiff >= 1.5 ? "font-bold text-accent-ink" : "text-fg-2")}>
                        {fmtPt(t.shareDiff)}
                      </td>
                      {m.usesSmout && (
                        <td className="px-3 py-2 text-[12px]">
                          {t.coveredBy.length ? <span className="text-fg-2">{t.coveredBy.join("、")}</span> : <Badge tone="warn">該当なし</Badge>}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel
            id="heatmap"
            title="年代×関心テーマ"
            description="各年代のうち、そのテーマを選んだ人の割合（複数選択）。濃いほど選択率が高い。"
            actions={<HeatLegend />}
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-[12px]">
                <thead>
                  <tr className="border-b border-border bg-surface-2">
                    <th className="px-3 py-2 text-left font-medium text-fg-3" scope="col">
                      年代
                    </th>
                    {THEMES.map((t) => (
                      <th key={t} className="px-2 py-2 text-center font-medium text-fg-3" scope="col">
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {r.heat.map((row) => (
                    <tr key={row.age} className="border-b border-bg">
                      <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-medium text-fg">
                        {row.age}
                      </th>
                      {row.values.map((v) => (
                        <td key={v.theme} className="tabular border-l-2 border-bg px-2 py-2 text-center" style={heatStyle(v.share)}>
                          {fmtPct(v.share, 0)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-border px-4 py-2.5 text-[12px] text-fg-3">
              クロス集計はSMOUTからの提供可否が未確認の項目です。関心の分布を示すもので、施策の成果を示すものではありません。
            </p>
          </Panel>

          <Panel
            title="地域別の関心傾向（参考集計）"
            description="地域ブロックごとのテーマ選択率。自治体横断データの提供可否は未確認のため、構想段階の表示です。"
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-[12px]">
                <thead>
                  <tr className="border-b border-border bg-surface-2">
                    <th className="px-3 py-2 text-left font-medium text-fg-3" scope="col">
                      地域ブロック
                    </th>
                    {THEMES.map((t) => (
                      <th key={t} className="px-2 py-2 text-center font-medium text-fg-3" scope="col">
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {r.regionCompare.map((row) => {
                    const current = row.region === (filters.scope === "reference" ? filters.region : m.prefectureArea);
                    return (
                      <tr key={row.region} className={cn("border-b border-bg", current && "outline outline-2 -outline-offset-2 outline-navy")}>
                        <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-medium text-fg">
                          {row.region}
                          {current && <span className="ml-1 text-[11px] font-normal text-fg-3">（表示中）</span>}
                        </th>
                        {THEMES.map((t) => (
                          <td key={t} className="tabular border-l-2 border-bg px-2 py-2 text-center" style={heatStyle(row.values[t] ?? 0)}>
                            {fmtPct(row.values[t], 0)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="施策検討への示唆" description="関心の傾向から導いた示唆です。施策の効果（因果）を示すものではありません。">
            <FindingGroups findings={r.findings} />
            <SourceNote sourceIds={r.sourceIds} className="mt-4 border-t border-border pt-3" />
          </Panel>

          <div className="flex flex-col gap-4 rounded-lg border border-border-strong bg-surface-2 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-fg">この分析から次年度施策を検討する</p>
              <p className="mt-0.5 text-[13px] text-fg-2">重点ターゲットと関心テーマを、課題分析・施策立案に引き継ぎます。</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/improvements">課題と改善施策を確認</ButtonLink>
              <ButtonLink href="/planning" variant="primary">
                次年度施策を検討する
                <ArrowRight aria-hidden />
              </ButtonLink>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

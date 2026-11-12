"use client";

import { useMemo } from "react";
import { evaluate } from "@/lib/analysis/evaluation";
import { changeRate, FORMULAS, fmtNum, fmtPct, fmtSignedPct } from "@/lib/analysis/metrics";
import { useWorkContext } from "@/lib/store/local-store";
import { dataSource } from "@/lib/data/adapter";
import { monthLabel } from "@/lib/analysis/metrics";
import { AchievementBars, Donut, KpiMiniChart, MonthlyColumns, MultiLine, RankBars, Sparkline } from "@/components/charts/charts";
import { SERIES } from "@/components/charts/theme";
import { FindingGroups, SourceNote, StatusBadge } from "@/components/domain/analysis";
import { CreateDocButton } from "@/components/domain/create-doc-button";
import { Stat, StatStrip } from "@/components/domain/stat";
import { JudgementFlow } from "@/components/domain/judgement-flow";
import { PolicyTree } from "@/components/domain/policy-tree";
import { ButtonLink } from "@/components/ui/button";
import { Badge, EmptyState, PageHeader, Panel } from "@/components/ui/primitives";

const th = "px-3 py-2 text-left text-[12px] font-medium text-fg-3 whitespace-nowrap";
const td = "px-3 py-2.5 align-top";

export function EvaluationView() {
  const ctx = useWorkContext();
  const r = useMemo(() => evaluate(ctx.municipalityId, ctx.fiscalYearId), [ctx.municipalityId, ctx.fiscalYearId]);
  const { municipality: m, fiscalYear: fy, totals, prevTotals } = r;
  const rateLabel = fy.isPartial ? "進捗率" : "達成率";
  const years = dataSource.listFiscalYears();
  const yearShort = (label: string) => label.replace("令和", "R").replace("年度", "").replace("（上期）", "上期");

  const achievementRows = r.kpis.map((k) => ({
    name: k.kpi.name,
    rate: k.judgement.rate,
    status: k.judgement.status,
    note: `${fmtNum(k.actual, k.kpi.unit)} / 目標 ${fmtNum(k.target, k.kpi.unit)}（${k.judgement.reason}）`,
  }));
  const allProjects = r.projects.map((p) => p.project.id);
  const donut = r.projects
    .filter((p) => p.totals)
    .map((p) => ({ name: p.project.name, value: p.totals!.interest, color: SERIES[allProjects.indexOf(p.project.id) % SERIES.length] }));
  const monthlyInterest = r.monthly.map((p) => ({ label: monthLabel(p.month), value: p.interest, prev: p.prevInterest }));
  const monthlyApply = r.monthly.map((p) => ({ label: monthLabel(p.month), apply: p.apply, replied: p.replied }));
  const conversion = r.projects
    .filter((p) => p.totals?.applyRate !== null && p.totals?.applyRate !== undefined)
    .map((p) => ({ name: p.project.name, value: p.totals!.applyRate! }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      <PageHeader
        title="施策評価・成果報告"
        description={`${m.name}・${fy.label}（${fy.periodLabel}）の政策目標に対する実績と達成状況`}
        actions={<CreateDocButton type="performance-report" label="成果報告書を作成する" />}
      />

      {fy.isPartial && (
        <p className="rounded-md border border-warn-border bg-warn-soft px-4 py-2.5 text-[13px] text-warn" role="status">
          {fy.label}は年度途中です。達成・未達成は判定せず「判断不能」とし、数値は年間目標に対する進捗率で表示しています。
        </p>
      )}

      <StatStrip>
        <Stat
          label="自治体KPIの判定"
          value={
            <span className="grid grid-cols-3 gap-2">
              {(
                [
                  ["達成", r.summary.achieved],
                  ["未達成", r.summary.notAchieved],
                  ["判断不能", r.summary.undeterminable],
                ] as const
              ).map(([l, v]) => (
                <span key={l} className="flex flex-col leading-6">
                  {v}
                  <span className="whitespace-nowrap text-[11px] font-medium leading-4 text-fg-3">{l}</span>
                </span>
              ))}
            </span>
          }
          sub={
            <span className="mt-1.5 flex h-2.5 w-full gap-[2px] overflow-hidden rounded-[2px]" aria-hidden>
              <span className="bg-accent" style={{ flexGrow: r.summary.achieved }} />
              <span className="bg-danger/80" style={{ flexGrow: r.summary.notAchieved }} />
              <span className="bg-chart-muted" style={{ flexGrow: r.summary.undeterminable }} />
            </span>
          }
        />
        {r.hasSmout && totals ? (
          <>
            <Stat
              label="興味ある（件）"
              value={fmtNum(totals.interest)}
              sub={
                <>
                  前年度同期間比 {fmtSignedPct(changeRate(totals.interest, prevTotals?.interest))}
                  <Sparkline values={r.monthly.map((p) => p.interest)} className="mt-1" />
                </>
              }
            />
            <Stat
              label="応募したい（件）"
              value={fmtNum(totals.apply)}
              sub={
                <>
                  前年度同期間比 {fmtSignedPct(changeRate(totals.apply, prevTotals?.apply))}
                  <Sparkline values={r.monthly.map((p) => p.apply)} className="mt-1" />
                </>
              }
            />
            <Stat label="応募転換率" value={fmtPct(totals.applyRate)} sub="応募したい÷興味ある" />
            <Stat label="返信率" value={fmtPct(totals.replyRate)} sub="返信あり÷（応募したい＋スカウト）" />
          </>
        ) : (
          <>
            <Stat label="興味ある（件）" value="データなし" sub="SMOUT未利用" muted />
            <Stat label="応募したい（件）" value="データなし" sub="SMOUT未利用" muted />
            <Stat label="応募転換率" value="算出不可" sub="SMOUT未利用" muted />
            <Stat label="返信率" value="算出不可" sub="SMOUT未利用" muted />
          </>
        )}
      </StatStrip>

      <div className="grid gap-5 lg:grid-cols-12">
        <Panel
          className="lg:col-span-7"
          title={`自治体KPIの${rateLabel}`}
          description={`点線が目標（100%）。${fy.isPartial ? "年度途中のため判定はせず進捗率を表示。" : "緑＝達成、赤＝未達成、灰＝判断不能。"}`}
        >
          <AchievementBars rows={achievementRows} />
        </Panel>
        <Panel
          className="lg:col-span-5"
          title="判定のしかた"
          description={`各KPIは次の順に判定しています。右の件数は${fy.label}の内訳です。`}
        >
          <JudgementFlow kpis={r.kpis} isPartial={fy.isPartial} />
        </Panel>
      </div>

      <Panel
        id="tree"
        title="施策体系図"
        description="政策目標 → 自治体KPI → 施策 のつながり。未達成のKPIがどの目標・施策に関わるかを確認できます。"
      >
        <PolicyTree municipality={m} kpis={r.kpis} projects={r.projects} />
      </Panel>

      <Panel
        id="kpis"
        title="政策目標と自治体KPI"
        description="自治体が集計した実績。件数・人数・世帯数の区別と定義を確認してください。"
        bodyClassName="p-0"
      >
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-[12px] font-medium text-fg-3">政策目標</h3>
          <ul className="mt-1 grid gap-x-6 gap-y-0.5 text-[13px] text-fg md:grid-cols-2">
            {m.policyGoals.map((g) => (
              <li key={g}>・{g}</li>
            ))}
          </ul>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-[13px]">
            <caption className="sr-only">自治体KPIの目標・実績・判定</caption>
            <thead className="bg-surface-2">
              <tr className="border-b border-border">
                <th className={th} scope="col">区分</th>
                <th className={th} scope="col">指標と定義</th>
                <th className={`${th} text-right`} scope="col">目標</th>
                <th className={`${th} text-right`} scope="col">実績</th>
                <th className={`${th} text-right`} scope="col">{rateLabel}</th>
                <th className={th} scope="col">判定</th>
                <th className={`${th} text-right`} scope="col">前年度実績</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {r.kpis.map((k) => (
                <tr key={k.kpi.id}>
                  <td className={`${td} whitespace-nowrap text-fg-2`}>{k.group}</td>
                  <td className={td}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-fg">{k.kpi.name}</span>
                      <Badge tone="outline">{k.kpi.countType}</Badge>
                    </div>
                    <p className="mt-0.5 max-w-[46ch] text-[12px] leading-5 text-fg-3">{k.kpi.definition}</p>
                  </td>
                  <td className={`${td} tabular text-right`}>{fmtNum(k.target, k.kpi.unit)}</td>
                  <td className={`${td} tabular text-right font-medium`}>{fmtNum(k.actual, k.kpi.unit)}</td>
                  <td className={`${td} tabular text-right`}>{fmtPct(k.judgement.rate)}</td>
                  <td className={td}>
                    <StatusBadge judgement={k.judgement} showReason />
                  </td>
                  <td className={`${td} tabular text-right text-fg-2`}>{fmtNum(k.prevActual, k.kpi.unit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-4 py-3">
          <p className="text-[12px] text-fg-3">
            {FORMULAS.achievementRate}。{fy.isPartial ? FORMULAS.progressRate : "実績が目標以上を「達成」とします。"}「データなし」は未集計（欠損）で、0とは区別しています。
          </p>
          <SourceNote sourceIds={[r.kpis[0]?.kpi.sourceId ?? ""]} className="mt-2" />
        </div>
      </Panel>

      <Panel
        title="自治体KPIの年度推移"
        description="KPIごとの実績（縦棒）と目標（横線）。濃い棒が選択中の年度。単位が違うため、KPIごとに別のグラフにしています。"
      >
        <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
          {r.kpis.map((k) => (
            <figure key={k.kpi.id} className="min-w-0">
              <figcaption className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[12px] font-medium text-fg">{k.kpi.name}</span>
                <span className="shrink-0 text-[11px] text-fg-3">{k.kpi.unit}</span>
              </figcaption>
              <KpiMiniChart
                unit={k.kpi.unit}
                currentLabel={yearShort(fy.label)}
                data={years.map((y) => ({
                  label: yearShort(y.label),
                  actual: k.kpi.values[y.id]?.actual ?? null,
                  target: k.kpi.values[y.id]?.target ?? null,
                }))}
              />
            </figure>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-fg-3">棒がない年度は「データなし」（未集計）。0 の実績は高さ0の棒として表示されます。</p>
      </Panel>

      <Panel
        id="activity"
        title="SMOUT上の活動実績の推移"
        description={r.hasSmout ? "掲載プロジェクト合計の月次件数（延べ）。縦軸が違う2つの指標は、別々のグラフに分けています。" : undefined}
      >
        {r.hasSmout && totals ? (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
              <figure className="min-w-0">
                <figcaption className="mb-1 text-[13px] font-medium text-fg">「興味ある」件数（月次）</figcaption>
                <MonthlyColumns
                  data={monthlyInterest}
                  barName={fy.label}
                  lineName={r.prevFiscalYear ? `${r.prevFiscalYear.label}（同月）` : undefined}
                />
              </figure>
              <figure className="min-w-0">
                <figcaption className="mb-1 text-[13px] font-medium text-fg">「応募したい」と「返信あり」（月次）</figcaption>
                <MultiLine
                  data={monthlyApply}
                  xKey="label"
                  unit="件"
                  series={[
                    { key: "apply", name: "応募したい", color: SERIES[1] },
                    { key: "replied", name: "返信あり", color: SERIES[2] },
                  ]}
                />
              </figure>
            </div>
            <details className="mt-3 text-[13px]">
              <summary className="cursor-pointer text-fg-2 hover:text-fg">月次の数値を表で見る</summary>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[560px] text-[12px]">
                  <thead className="bg-surface-2">
                    <tr>
                      <th className={th}>月</th>
                      <th className={`${th} text-right`}>興味ある</th>
                      <th className={`${th} text-right`}>応募したい</th>
                      <th className={`${th} text-right`}>返信あり</th>
                      <th className={`${th} text-right`}>前年度同月の興味ある</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {r.monthly.map((p) => (
                      <tr key={p.month}>
                        <td className="px-3 py-1.5">{p.month}</td>
                        <td className="tabular px-3 py-1.5 text-right">{fmtNum(p.interest)}</td>
                        <td className="tabular px-3 py-1.5 text-right">{fmtNum(p.apply)}</td>
                        <td className="tabular px-3 py-1.5 text-right">{fmtNum(p.replied)}</td>
                        <td className="tabular px-3 py-1.5 text-right">{fmtNum(p.prevInterest)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <SourceNote sourceIds={["src-smout-activity"]} className="mt-3" />
          </>
        ) : (
          <EmptyState title={`${m.name}のSMOUT活動実績はありません`}>
            {m.name}はSMOUTを利用していないため、「興味ある」「応募したい」等の実績は存在しません。架空の実績は表示しません。地域ごとの関心傾向は参考集計で確認できます。
            <div className="mt-3">
              <ButtonLink href="/insights" size="sm">
                地域・関心分析を開く
              </ButtonLink>
            </div>
          </EmptyState>
        )}
      </Panel>

      {r.hasSmout && (
        <Panel
          id="projects"
          title="施策・プロジェクト別の成果"
          description="SMOUT掲載プロジェクトごとの目標・実績（件数）と転換率"
          bodyClassName="p-0"
        >
          <div className="grid gap-6 border-b border-border px-4 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <div className="min-w-0">
            <p className="mb-1 text-[13px] font-medium text-fg">施策別の応募転換率</p>
            <p className="mb-2 text-[12px] text-fg-3">点線は掲載施策全体の応募転換率。濃い棒は全体を上回る施策。</p>
            <RankBars
              rows={conversion}
              reference={totals?.applyRate !== null && totals?.applyRate !== undefined ? { value: totals.applyRate, label: `全体 ${fmtPct(totals.applyRate)}` } : undefined}
              highlight={(_n, v) => totals?.applyRate !== null && totals?.applyRate !== undefined && v >= totals.applyRate}
            />
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-[13px] font-medium text-fg">「興味ある」の施策別構成</p>
              <p className="mb-3 text-[12px] text-fg-3">{fy.periodLabel}・延べ件数</p>
              <Donut data={donut} centerValue={fmtNum(totals?.interest)} centerLabel="興味ある（件）" unit="件" size={150} stacked />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-[13px]">
              <caption className="sr-only">施策別の目標・実績</caption>
              <thead className="bg-surface-2">
                <tr className="border-b border-border">
                  <th className={th} scope="col">施策</th>
                  <th className={`${th} text-right`} scope="col">興味ある 実績／目標</th>
                  <th className={th} scope="col">判定</th>
                  <th className={`${th} text-right`} scope="col">応募したい 実績／目標</th>
                  <th className={th} scope="col">判定</th>
                  <th className={`${th} text-right`} scope="col">応募転換率</th>
                  <th className={`${th} text-right`} scope="col">返信率</th>
                  <th className={`${th} text-right`} scope="col">興味ある 前年度同期間比</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {r.projects.map((p) => (
                  <tr key={p.project.id}>
                    <td className={td}>
                      <p className="font-medium text-fg">{p.project.name}</p>
                      <p className="text-[12px] text-fg-3">
                        {p.project.category}・想定：{p.project.intendedTarget}
                      </p>
                    </td>
                    {p.totals ? (
                      <>
                        <td className={`${td} tabular text-right`}>
                          {fmtNum(p.totals.interest)} <span className="text-fg-3">／ {fmtNum(p.targetInterest)}</span>
                        </td>
                        <td className={td}>
                          <StatusBadge judgement={p.interestJudgement} />
                        </td>
                        <td className={`${td} tabular text-right`}>
                          {fmtNum(p.totals.apply)} <span className="text-fg-3">／ {fmtNum(p.targetApply)}</span>
                        </td>
                        <td className={td}>
                          <StatusBadge judgement={p.applyJudgement} />
                        </td>
                        <td className={`${td} tabular text-right`}>{fmtPct(p.totals.applyRate)}</td>
                        <td className={`${td} tabular text-right`}>{fmtPct(p.totals.replyRate)}</td>
                        <td className={`${td} tabular text-right`}>{fmtSignedPct(changeRate(p.totals.interest, p.prevTotals?.interest))}</td>
                      </>
                    ) : (
                      <td className={`${td} text-fg-3`} colSpan={7}>
                        {fy.label}の活動データなし（この年度は未掲載）
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border px-4 py-3 text-[12px] leading-5 text-fg-3">
            <p>{FORMULAS.applyRate}／{FORMULAS.replyRate}</p>
            <p>件数は利用者の操作回数の延べ数で、人数ではありません。前年度比は同じ月数の期間で比較しています。</p>
          </div>
        </Panel>
      )}

      <Panel id="findings" title="分析コメント" description="データから確認できた事実と、そこからの仮説・検証事項を区別して示します。">
        <FindingGroups findings={r.findings} />
      </Panel>

      <div className="flex flex-col gap-4 rounded-[10px] border border-border bg-bg p-5 shadow-raised sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold text-fg">この評価結果から成果報告書の下書きを作成します</p>
          <p className="mt-0.5 text-[13px] text-fg-2">KPIの判定・施策別の成果・分析コメントを反映します。作成後に編集し、Word・PDFで出力できます。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/improvements">
            課題分析へ進む
          </ButtonLink>
          <CreateDocButton type="performance-report" label="成果報告書を作成する" />
        </div>
      </div>
    </div>
  );
}

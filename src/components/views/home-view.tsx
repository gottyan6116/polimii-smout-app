"use client";

import { CalendarRange, ChevronRight, ClipboardCheck, FileText } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { analyzeImprovements } from "@/lib/analysis/improvements";
import { fmtNum, fmtPct } from "@/lib/analysis/metrics";
import { dataSource } from "@/lib/data/adapter";
import type { SourceRef } from "@/lib/data/types";
import { templateOf } from "@/lib/documents/types";
import { useHydrated } from "@/lib/hooks";
import { useDocuments, usePlan, useWorkContext } from "@/lib/store/local-store";
import { cn, formatDateTime } from "@/lib/utils";
import { AvailabilityBadge } from "@/components/domain/analysis";
import { KpiSplit } from "@/components/domain/kpi-split";
import { RankBars, Sparkline } from "@/components/charts/charts";
import { ButtonLink } from "@/components/ui/button";
import { Badge, EmptyState, Panel } from "@/components/ui/primitives";

export function HomeView() {
  const ctx = useWorkContext();
  const docs = useDocuments();
  const plan = usePlan(ctx.municipalityId);
  const hydrated = useHydrated();
  const r = useMemo(() => analyzeImprovements(ctx.municipalityId, ctx.fiscalYearId), [ctx.municipalityId, ctx.fiscalYearId]);
  const ev = r.evaluation;
  const ins = r.insights;
  const muni = ev.municipality;
  const fy = ev.fiscalYear;
  const src = (id: string) => dataSource.getSource(id) as SourceRef;

  const muniDocs = docs.filter((d) => d.municipalityId === muni.id);
  const selectedCount = plan.selected.filter((id) => r.measures.some((m) => m.id === id)).length;
  const topAge = ins.available ? [...ins.ageRows].sort((a, b) => b.count - a.count)[0] : null;
  const notAchieved = ev.kpis.filter((k) => k.judgement.status === "not-achieved");

  const catalog = [
    { label: "SMOUT 活動実績（施策別・月次）", source: src("src-smout-activity"), available: muni.usesSmout },
    { label: "SMOUT 反応者の年代・移住検討段階", source: src("src-smout-audience"), available: muni.usesSmout },
    { label: "年代×関心テーマ クロス集計", source: src("src-smout-cross"), available: muni.usesSmout },
    { label: "参考集計（地域別・自治体横断）", source: src("src-reference"), available: true },
    { label: "自治体の政策目標・実績KPI", source: src(muni.usesSmout ? "src-muni-a" : "src-muni-b"), available: true },
  ];

  const stages = [
    {
      href: "/evaluation",
      name: "施策評価",
      main: `KPI ${ev.kpis.length}項目`,
      sub: `達成${ev.summary.achieved}・未達成${ev.summary.notAchieved}・判断不能${ev.summary.undeterminable}`,
      state: null as string | null,
    },
    {
      href: "/insights",
      name: "関心分析",
      main: topAge ? `最多は${topAge.age}` : "データなし",
      sub: ins.available ? `上位テーマ「${ins.themes[0].theme}」` : "参考集計を選択",
      state: null,
    },
    {
      href: "/improvements",
      name: "課題整理",
      main: `課題 ${r.issues.length}件`,
      sub: `改善施策の候補 ${r.measures.length}件`,
      state: null,
    },
    {
      href: "/planning",
      name: "次年度計画",
      main: hydrated && selectedCount > 0 ? `採用 ${selectedCount}件` : "施策は未選択",
      sub: hydrated && plan.updatedAt ? `更新 ${formatDateTime(plan.updatedAt)}` : "候補から採用して編集",
      state: hydrated && selectedCount > 0 ? "進行中" : "未着手",
    },
    {
      href: "/documents",
      name: "行政文書",
      main: hydrated && muniDocs.length > 0 ? `${muniDocs.length}件作成` : "未作成",
      sub: hydrated && muniDocs[0] ? `最新：${templateOf(muniDocs[0].type).label}` : "5種のテンプレート",
      state: hydrated && muniDocs.length > 0 ? "作成済み" : "未着手",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="max-w-3xl">
        <h1 className="text-[26px] font-bold leading-10 text-fg">移住・関係人口施策の評価から、次年度計画の策定まで。</h1>
        <p className="mt-1.5 text-[14px] leading-7 text-fg-2">
          地域の関心データと自治体の政策情報をもとに、施策の成果評価、改善提案、行政文書の作成を支援します。
        </p>
      </div>

      {/* 主要な2つのアクション。中身は現在の自治体・年度の実データ */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="flex flex-col rounded-xl border border-border bg-bg p-5 shadow-raised sm:p-6" aria-labelledby="flow-a">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="flow-a" className="flex items-center gap-2 text-[18px] font-bold leading-7">
                <ClipboardCheck className="size-5 text-accent-strong" strokeWidth={1.75} aria-hidden />
                施策成果を評価・報告する
              </h2>
              <p className="mt-1 text-[13px] leading-6 text-fg-2">目標・実績・達成率を確認し、成果報告書の下書きまで作成します。</p>
            </div>
            <Badge tone="outline">{fy.label}</Badge>
          </div>

          <div className="mt-5 rounded-lg bg-surface-2 p-4">
            <p className="text-[12px] font-medium text-fg-3">{muni.name}の自治体KPI（{ev.kpis.length}項目）</p>
            <KpiSplit className="mt-2" achieved={ev.summary.achieved} notAchieved={ev.summary.notAchieved} undeterminable={ev.summary.undeterminable} />
            {notAchieved.length > 0 && (
              <ul className="mt-3 divide-y divide-border border-t border-border text-[13px]">
                {notAchieved.slice(0, 3).map((k) => (
                  <li key={k.kpi.id} className="flex items-center justify-between gap-3 py-1.5">
                    <span className="truncate text-fg">{k.kpi.name}</span>
                    <span className="tabular shrink-0 text-fg-2">
                      {fmtNum(k.actual, k.kpi.unit)} / {fmtNum(k.target, k.kpi.unit)}
                      <span className="ml-2 text-danger">{fmtPct(k.judgement.rate)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {fy.isPartial && <p className="mt-2 text-[12px] text-fg-3">年度途中のため達成判定はしていません。</p>}
            {ev.hasSmout && ev.totals && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="flex items-baseline justify-between text-[12px] text-fg-3">
                  <span>SMOUT「興味ある」月次推移</span>
                  <span className="tabular font-bold text-fg">{fmtNum(ev.totals.interest, "件")}</span>
                </p>
                <Sparkline values={ev.monthly.map((p) => p.interest)} className="mt-1 h-10" />
              </div>
            )}
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
            <ButtonLink href="/evaluation" variant="primary">
              施策評価を始める
            </ButtonLink>
            {!muni.usesSmout && <span className="text-[12px] text-fg-3">SMOUT未利用のため自治体KPIのみで評価</span>}
          </div>
        </section>

        <section className="flex flex-col rounded-xl border border-border bg-bg p-5 shadow-raised sm:p-6" aria-labelledby="flow-b">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="flow-b" className="flex items-center gap-2 text-[18px] font-bold leading-7">
                <CalendarRange className="size-5 text-accent-strong" strokeWidth={1.75} aria-hidden />
                次年度の施策を立案する
              </h2>
              <p className="mt-1 text-[13px] leading-6 text-fg-2">関心の傾向と課題から、重点ターゲット・施策・KPI案を組み立てます。</p>
            </div>
            <Badge tone={ins.filters.scope === "own" ? "outline" : "warn"}>{ins.filters.scope === "own" ? "自自治体の反応者" : "参考集計"}</Badge>
          </div>

          <div className="mt-5 rounded-lg bg-surface-2 p-4">
            {ins.available && topAge ? (
              <>
                <p className="text-[12px] font-medium text-fg-3">
                  最も多い年代は <span className="font-bold text-fg">{topAge.age}</span>（{fmtPct(topAge.share)}）・関心テーマの選択率
                </p>
                <RankBars
                  rows={ins.themes.slice(0, 4).map((t) => ({ name: t.theme, value: t.share }))}
                  highlight={(n) => n === ins.themes[0].theme}
                  labelWidth={112}
                  barSize={16}
                />
              </>
            ) : (
              <p className="text-[13px] text-fg-3">{ins.unavailableReason}</p>
            )}
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
            <ButtonLink href="/insights" variant="primary">
              関心分析から始める
            </ButtonLink>
            <ButtonLink href="/planning" variant="ghost">
              計画の編集へ
            </ButtonLink>
          </div>
        </section>
      </div>

      {/* 政策サイクル：各段階の現在の状態（実データ） */}
      <section aria-labelledby="cycle" className="rounded-[10px] border border-border bg-bg shadow-panel">
        <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
          <h2 id="cycle" className="text-[15px] font-bold">
            政策サイクルの進み具合
          </h2>
          <p className="text-[12px] text-fg-3">
            {muni.name}・{fy.label}の状態。各段階をクリックすると画面を開きます。
          </p>
        </header>
        <ol className="grid divide-y divide-border sm:grid-cols-5 sm:divide-x sm:divide-y-0">
          {stages.map((s, i) => (
            <li key={s.href} className="relative">
              <Link href={s.href} className="group flex h-full flex-col gap-1 px-4 py-4 transition-colors duration-150 hover:bg-surface-2">
                <span className="flex items-center justify-between gap-2 text-[12px] font-medium text-fg-3">
                  {s.name}
                  {s.state && (
                    <span
                      className={cn(
                        "rounded-[4px] px-1.5 text-[11px] leading-5",
                        s.state === "未着手" ? "bg-surface-3 text-fg-3" : "bg-accent-soft text-accent-ink",
                      )}
                    >
                      {s.state}
                    </span>
                  )}
                </span>
                <span className="tabular text-[16px] font-bold leading-6 text-fg">{s.main}</span>
                <span className="text-[12px] leading-5 text-fg-2">{s.sub}</span>
              </Link>
              {i < stages.length - 1 && (
                <span
                  aria-hidden
                  className="absolute -right-2.5 top-1/2 z-10 hidden size-5 -translate-y-1/2 place-items-center rounded-full border border-border bg-bg text-fg-3 sm:grid"
                >
                  <ChevronRight className="size-3" />
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <Panel
          className="lg:col-span-7"
          title="直近作成した文書"
          description="この端末のブラウザに保存された下書きです。"
          actions={
            <ButtonLink href="/documents" size="sm" variant="ghost">
              すべて表示
            </ButtonLink>
          }
          bodyClassName="p-0"
        >
          {!hydrated ? (
            <div className="h-24 animate-pulse bg-surface-2" aria-label="読み込み中" />
          ) : docs.length === 0 ? (
            <div className="p-4">
              <EmptyState title="まだ文書はありません">
                施策評価・次年度の施策立案の画面から「成果報告書を作成する」「次年度事業計画書を作成する」を選ぶと、分析結果を反映した下書きがここに表示されます。
              </EmptyState>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {docs.slice(0, 5).map((d) => {
                const dm = dataSource.getMunicipality(d.municipalityId);
                return (
                  <li key={d.id}>
                    <Link href={`/documents/${d.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-surface-2">
                      <FileText className="size-4 shrink-0 text-fg-3" strokeWidth={1.75} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-fg">{d.title}</span>
                        <span className="block truncate text-[12px] text-fg-3">
                          {templateOf(d.type).label}・{dm?.name}・更新 {formatDateTime(d.updatedAt)}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-fg-3" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel
          className="lg:col-span-5"
          title="利用可能なデータ"
          description={`${muni.name}で参照できるデータ（いずれもデモ用の架空データ）`}
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border">
            {catalog.map((c) => (
              <li key={c.label} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[13px] font-medium text-fg">{c.label}</span>
                  {c.available ? <Badge tone="accent">利用可</Badge> : <Badge tone="neutral">データなし</Badge>}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-fg-3">
                  {c.available ? (
                    <>
                      <span>更新 {c.source.updatedAt}</span>
                      <AvailabilityBadge source={c.source} />
                    </>
                  ) : (
                    <span>SMOUT未利用のため、自自治体の活動実績はありません</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

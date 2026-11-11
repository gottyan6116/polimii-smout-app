"use client";

import { ArrowRight, ClipboardCheck, CalendarRange, FileText } from "lucide-react";
import Link from "next/link";
import { dataSource } from "@/lib/data/adapter";
import type { SourceRef } from "@/lib/data/types";
import { templateOf } from "@/lib/documents/types";
import { useDocuments, useWorkContext } from "@/lib/store/local-store";
import { formatDateTime } from "@/lib/utils";
import { AvailabilityBadge } from "@/components/domain/analysis";
import { ButtonLink } from "@/components/ui/button";
import { Badge, EmptyState, Panel } from "@/components/ui/primitives";

function FlowPanel({
  icon: Icon,
  title,
  lead,
  steps,
  href,
  cta,
  note,
}: {
  icon: typeof ClipboardCheck;
  title: string;
  lead: string;
  steps: string[];
  href: string;
  cta: string;
  note?: string;
}) {
  return (
    <section className="flex flex-col rounded-lg border border-border-strong bg-bg p-5 sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-md bg-accent-soft text-accent-strong">
          <Icon className="size-[18px]" aria-hidden />
        </span>
        <h2 className="text-[18px] font-bold leading-7">{title}</h2>
      </div>
      <p className="mt-2 text-[13px] leading-6 text-fg-2">{lead}</p>
      <ol className="mt-4 grid gap-px overflow-hidden rounded-md border border-border bg-border text-[13px] sm:grid-cols-2">
        {steps.map((s, i) => (
          <li key={s} className="flex gap-2 bg-bg px-3 py-2.5">
            <span className="tabular w-4 shrink-0 font-bold text-accent-strong">{i + 1}</span>
            <span className="text-fg">{s}</span>
          </li>
        ))}
      </ol>
      {note && <p className="mt-3 text-[12px] leading-5 text-fg-3">{note}</p>}
      <div className="mt-auto pt-5">
        <ButtonLink href={href} variant="primary" className="w-full sm:w-auto">
          {cta}
          <ArrowRight aria-hidden />
        </ButtonLink>
      </div>
    </section>
  );
}

export function HomeView() {
  const ctx = useWorkContext();
  const docs = useDocuments();
  const muni = dataSource.getMunicipality(ctx.municipalityId)!;
  const fy = dataSource.getFiscalYear(ctx.fiscalYearId);
  const src = (id: string) => dataSource.getSource(id) as SourceRef;

  const catalog = [
    { label: "SMOUT 活動実績（施策別・月次）", source: src("src-smout-activity"), available: muni.usesSmout },
    { label: "SMOUT 反応者の年代・移住検討段階", source: src("src-smout-audience"), available: muni.usesSmout },
    { label: "年代×関心テーマ クロス集計", source: src("src-smout-cross"), available: muni.usesSmout },
    { label: "参考集計（地域別・自治体横断）", source: src("src-reference"), available: true },
    { label: "自治体の政策目標・実績KPI", source: src(muni.usesSmout ? "src-muni-a" : "src-muni-b"), available: true },
  ];

  return (
    <div className="space-y-8">
      <div className="max-w-3xl">
        <h1 className="text-[24px] font-bold leading-9 text-fg sm:text-[26px]">
          移住・関係人口施策の評価から、次年度計画の策定まで。
        </h1>
        <p className="mt-2 text-sm leading-7 text-fg-2">
          地域の関心データと自治体の政策情報をもとに、施策の成果評価、改善提案、行政文書の作成を支援します。
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FlowPanel
          icon={ClipboardCheck}
          title="施策成果を評価・報告する"
          lead={`${fy.label}の目標と実績を確認し、達成状況と課題を整理して成果報告書を作成します。`}
          steps={["目標・実績・達成率を確認", "施策別の成果を比較", "分析コメントと課題を確認", "成果報告書を作成・出力"]}
          href="/evaluation"
          cta="施策評価を始める"
          note={muni.usesSmout ? undefined : `${muni.name}はSMOUT未利用のため、自治体KPIのみで評価します。`}
        />
        <FlowPanel
          icon={CalendarRange}
          title="次年度の施策を立案する"
          lead="年代・関心テーマ・移住検討段階を分析し、重点ターゲットと改善施策から次年度計画を作成します。"
          steps={["関心・属性の傾向を確認", "課題と改善施策を整理", "施策・KPI・時期を選択・編集", "事業計画書を作成・出力"]}
          href="/insights"
          cta="関心分析から始める"
          note={muni.usesSmout ? undefined : "自自治体のSMOUTデータがないため、参考集計（提供可否未確認）を使います。"}
        />
      </div>

      <nav aria-label="主な分析機能" className="flex flex-wrap items-center gap-x-1 gap-y-2 border-y border-border py-3 text-[13px]">
        <span className="mr-2 text-fg-3">主な分析機能</span>
        {[
          { href: "/evaluation#projects", label: "施策・プロジェクト別の成果比較" },
          { href: "/insights#heatmap", label: "年代×関心テーマ" },
          { href: "/improvements", label: "課題と改善施策の候補" },
          { href: "/planning", label: "次年度計画の編集" },
          { href: "/documents", label: "文書テンプレート" },
        ].map((l) => (
          <Link key={l.href} href={l.href} className="rounded-md px-2 py-1 font-medium text-accent-ink underline-offset-4 hover:bg-accent-soft hover:underline">
            {l.label}
          </Link>
        ))}
      </nav>

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
          {docs.length === 0 ? (
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
                    <Link href={`/documents/${d.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                      <FileText className="size-4 shrink-0 text-fg-3" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-fg">{d.title}</span>
                        <span className="block text-[12px] text-fg-3">
                          {templateOf(d.type).label}・{dm?.name}・更新 {formatDateTime(d.updatedAt)}
                        </span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-fg-3" aria-hidden />
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

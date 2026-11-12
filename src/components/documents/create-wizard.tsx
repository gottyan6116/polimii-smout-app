"use client";
// avoid-ai-design-ignore-file: I3 — Check は完了した手順を示す記号として使う（装飾ではない）

import { Check, FilePlus2, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { analyzeImprovements } from "@/lib/analysis/improvements";
import { dataSource } from "@/lib/data/adapter";
import type { FiscalYearId } from "@/lib/data/types";
import { type DocumentType, TEMPLATES, templateOf } from "@/lib/documents/types";
import { useCreateDocument } from "@/lib/documents/use-create-document";
import { resolvePlan } from "@/lib/planning/plan";
import { contextStore, usePlan, useWorkContext } from "@/lib/store/local-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge, SelectField } from "@/components/ui/primitives";

const STEPS = ["文書の種類", "対象と範囲", "反映内容の確認"] as const;

/** 文書作成のステップフォーム：種類 → 対象 → 反映内容の確認 → 作成 */
export function CreateWizard() {
  const ctx = useWorkContext();
  const plan = usePlan(ctx.municipalityId);
  const { create, pending } = useCreateDocument();
  const [step, setStep] = useState(0);
  const [type, setType] = useState<DocumentType | null>(null);

  const r = useMemo(() => analyzeImprovements(ctx.municipalityId, ctx.fiscalYearId), [ctx.municipalityId, ctx.fiscalYearId]);
  const muni = r.evaluation.municipality;
  const fy = r.evaluation.fiscalYear;
  const { items: planned, provisional } = resolvePlan(r.measures, plan);
  const usesPlan = type === "annual-plan" || type === "improvement-proposal";

  const reflected: { label: string; value: string; warn?: boolean }[] = !type
    ? []
    : [
        { label: "自治体KPI", value: `${r.evaluation.kpis.length}項目（達成${r.evaluation.summary.achieved}・未達成${r.evaluation.summary.notAchieved}・判断不能${r.evaluation.summary.undeterminable}）` },
        {
          label: "SMOUT活動実績",
          value: r.evaluation.hasSmout ? `掲載${r.evaluation.projects.length}施策の月次件数` : "なし（SMOUT未利用。架空の実績は入れません）",
          warn: !r.evaluation.hasSmout,
        },
        {
          label: "関心・属性",
          value: r.insights.available
            ? r.insights.filters.scope === "own"
              ? "自自治体の反応者の年代・段階・テーマ"
              : `参考集計（${r.insights.filters.region}・提供可否未確認）`
            : "なし",
          warn: r.insights.filters.scope === "reference",
        },
        { label: "課題", value: `${r.issues.length}件（事実・仮説・推奨・要検証）` },
        ...(usesPlan
          ? [
              {
                label: "施策",
                value: provisional ? `未選択のため優先度上位${planned.length}件を「仮」で掲載` : `採用済み ${planned.length}件（編集内容を反映）`,
                warn: provisional,
              },
            ]
          : []),
      ];

  return (
    <div>
      {/* ステップ表示 */}
      <ol className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3" aria-label="作成の手順">
        {STEPS.map((s, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={s} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden className={cn("h-px w-8", i <= step ? "bg-accent-strong" : "bg-border-strong")} />}
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full border text-[11px] font-bold",
                  done && "border-accent-strong bg-accent-strong text-white",
                  current && "border-accent-strong text-accent-strong ring-4 ring-accent-soft",
                  !done && !current && "border-border-strong text-fg-3",
                )}
                aria-current={current ? "step" : undefined}
              >
                {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
              </span>
              <span className={cn("text-[13px]", current ? "font-bold text-fg" : "text-fg-3")}>{s}</span>
            </li>
          );
        })}
      </ol>

      <div className="px-4 py-4">
        {step === 0 && (
          <fieldset>
            <legend className="mb-3 text-[13px] text-fg-2">作成する文書を1つ選んでください。</legend>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3" role="radiogroup">
              {TEMPLATES.map((t) => {
                const on = type === t.type;
                return (
                  <button
                    key={t.type}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setType(t.type)}
                    className={cn(
                      "flex flex-col items-start rounded-md border px-3 py-2.5 text-left transition-colors duration-150",
                      on ? "border-accent-strong bg-accent-soft/60 ring-1 ring-accent-strong" : "border-border-strong bg-bg hover:border-fg-3",
                    )}
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className="font-medium text-fg">{t.label}</span>
                      <span
                        aria-hidden
                        className={cn("grid size-4 place-items-center rounded-full border", on ? "border-accent-strong bg-accent-strong" : "border-border-strong")}
                      >
                        {on && <span className="size-1.5 rounded-full bg-white" />}
                      </span>
                    </span>
                    <span className="mt-0.5 text-[12px] leading-5 text-fg-2">{t.description}</span>
                    <span className="mt-1 text-[11px] text-fg-3">基にする分析：{t.basedOn}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {step === 1 && type && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <SelectField
                id="wiz-muni"
                label="対象自治体"
                value={ctx.municipalityId}
                onChange={(v) => contextStore.set((p) => ({ ...p, municipalityId: v }))}
                options={dataSource.listMunicipalities().map((m) => ({ value: m.id, label: `${m.name}（${m.usesSmout ? "SMOUT利用あり" : "SMOUT未利用"}）` }))}
                className="w-72"
              />
              <SelectField
                id="wiz-fy"
                label="対象年度（分析の基準）"
                value={ctx.fiscalYearId}
                onChange={(v) => contextStore.set((p) => ({ ...p, fiscalYearId: v as FiscalYearId }))}
                options={dataSource.listFiscalYears().map((f) => ({ value: f.id, label: f.label }))}
                className="w-56"
              />
            </div>
            {fy.isPartial && <p className="text-[12px] text-warn">{fy.label}は年度途中です。KPIは判定せず進捗率で記載します。</p>}
            {usesPlan && (
              <div className="rounded-md border border-border bg-surface-2 px-3 py-2.5 text-[13px]">
                <p className="font-medium text-fg">反映する施策</p>
                {provisional ? (
                  <p className="mt-0.5 text-warn">
                    施策が未選択です。優先度の高い3件を「仮」として掲載します。
                    <Link href="/planning" className="ml-1 underline underline-offset-4">
                      次年度の施策立案で選ぶ
                    </Link>
                  </p>
                ) : (
                  <ul className="mt-1 space-y-0.5 text-fg-2">
                    {planned.map((x) => (
                      <li key={x.id}>・{x.title}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {step === 2 && type && (
          <div className="space-y-3">
            <p className="text-[13px] text-fg-2">
              <span className="font-bold text-fg">{templateOf(type).label}</span>を、{muni.name}・{fy.label}のデータで作成します。次の内容を反映します。
            </p>
            <dl className="divide-y divide-border rounded-md border border-border">
              {reflected.map((x) => (
                <div key={x.label} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 px-3 py-2 text-[13px]">
                  <dt className="text-fg-3">{x.label}</dt>
                  <dd className={cn("min-w-0", x.warn ? "text-warn" : "text-fg")}>{x.value}</dd>
                </div>
              ))}
            </dl>
            <p className="flex flex-wrap items-center gap-2 text-[12px] text-fg-3">
              <Badge tone="warn">デモ用の架空データ</Badge>
              予算額・体制など、データから決められない箇所は【要確認】として本文に残します。
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
        <Button size="sm" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          戻る
        </Button>
        {step < 2 ? (
          <Button size="sm" variant="primary" onClick={() => setStep((s) => s + 1)} disabled={!type}>
            次へ
          </Button>
        ) : (
          <Button size="sm" variant="primary" onClick={() => type && create(type)} disabled={!type || pending !== null}>
            {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <FilePlus2 aria-hidden />}
            {pending ? "作成中…" : "下書きを作成"}
          </Button>
        )}
      </div>
    </div>
  );
}

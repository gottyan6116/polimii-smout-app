"use client";

import { CircleCheck, Circle } from "lucide-react";
import Link from "next/link";
import { type DocumentType, templateOf } from "@/lib/documents/types";
import { useHydrated } from "@/lib/hooks";
import { useDocuments } from "@/lib/store/local-store";
import { cn } from "@/lib/utils";

/**
 * 次年度計画に関わる年間スケジュール（一般的な市町村の予算編成の流れの例）。
 * 実際の日程は自治体ごとに異なるため「要確認」と明示する。
 * 各月に必要な文書の作成状況（この端末に保存された文書）を示す。
 */
const CALENDAR: { ym: string; month: string; title: string; detail: string; docs: DocumentType[] }[] = [
  { ym: "2026-10", month: "10月", title: "前年度施策の評価", detail: "事務事業評価・決算の取りまとめ", docs: ["performance-report"] },
  { ym: "2026-11", month: "11月", title: "事業計画・予算要求", detail: "次年度の重点施策とKPIを決める", docs: ["annual-plan", "improvement-proposal"] },
  { ym: "2026-12", month: "12月", title: "予算査定", detail: "財政担当へのヒアリング", docs: ["briefing"] },
  { ym: "2027-01", month: "1月", title: "予算内示・計画修正", detail: "査定結果を事業計画に反映", docs: [] },
  { ym: "2027-02", month: "2月", title: "当初予算案の議会提出", detail: "議会・委員会での説明", docs: ["briefing"] },
  { ym: "2027-03", month: "3月", title: "議決・事業準備", detail: "募集内容・体制の準備", docs: [] },
  { ym: "2027-04", month: "4月", title: "令和9年度 事業開始", detail: "計画に沿って実施・月次で確認", docs: [] },
];

function currentYm(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function BudgetCalendar({ municipalityId }: { municipalityId: string }) {
  const hydrated = useHydrated();
  const docs = useDocuments().filter((d) => d.municipalityId === municipalityId);
  const now = hydrated ? currentYm() : "";

  return (
    <div className="md:overflow-x-auto">
      <ol className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-border bg-border md:min-w-[880px] md:grid-cols-7">
        {CALENDAR.map((c) => {
          const isNow = c.ym === now;
          const isPast = now !== "" && c.ym < now;
          return (
            <li key={c.ym} className={cn("flex flex-col bg-bg p-3 md:min-h-[148px]", isNow && "bg-accent-soft/60", isPast && "bg-surface-2")}>
              <div className="flex items-center justify-between">
                <span className={cn("text-[13px] font-bold", isNow ? "text-accent-ink" : "text-fg")}>
                  {c.ym.slice(0, 4)}年{c.month}
                </span>
                {isNow && <span className="rounded-[4px] bg-accent-strong px-1.5 text-[11px] font-medium leading-5 text-white">今月</span>}
              </div>
              <p className={cn("mt-2 text-[13px] font-medium leading-5", isPast ? "text-fg-2" : "text-fg")}>{c.title}</p>
              <p className="mt-0.5 text-[12px] leading-5 text-fg-3">{c.detail}</p>
              {c.docs.length > 0 && (
                <ul className="mt-auto space-y-1 pt-3">
                  {c.docs.map((t) => {
                    const made = hydrated && docs.some((d) => d.type === t);
                    return (
                      <li key={t}>
                        <Link
                          href="/documents"
                          className={cn(
                            "flex items-center gap-1.5 rounded-[4px] px-1.5 py-0.5 text-[11px] leading-4 hover:bg-surface-3",
                            made ? "text-accent-ink" : "text-fg-2",
                          )}
                        >
                          {made ? <CircleCheck className="size-3.5 shrink-0" aria-hidden /> : <Circle className="size-3.5 shrink-0 text-fg-3" aria-hidden />}
                          <span className="truncate">{templateOf(t).label}</span>
                          <span className="sr-only">{made ? "作成済み" : "未作成"}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

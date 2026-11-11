"use client";

import {
  CalendarRange,
  ClipboardCheck,
  FileText,
  House,
  Menu,
  SearchCheck,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, Suspense, useState } from "react";
import { dataSource } from "@/lib/data/adapter";
import type { FiscalYearId } from "@/lib/data/types";
import { contextStore, useWorkContext } from "@/lib/store/local-store";
import { cn } from "@/lib/utils";
import { SelectField } from "@/components/ui/primitives";

export const NAV = [
  { href: "/", label: "ホーム", icon: House },
  { href: "/evaluation", label: "施策評価・成果報告", icon: ClipboardCheck },
  { href: "/insights", label: "地域・人材・関心分析", icon: UsersRound },
  { href: "/improvements", label: "課題分析・改善提案", icon: SearchCheck },
  { href: "/planning", label: "次年度の施策立案", icon: CalendarRange },
  { href: "/documents", label: "行政文書の作成・編集", icon: FileText },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return <NavItems pathname={pathname} onNavigate={onNavigate} />;
}

function NavItems({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <ul className="space-y-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors",
                active ? "bg-bg text-fg shadow-[0_0_0_1px_var(--border)]" : "text-fg-2 hover:bg-surface-3 hover:text-fg",
              )}
            >
              {active && <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent-strong" />}
              <Icon aria-hidden className={cn("size-4", active ? "text-accent-strong" : "text-fg-3")} />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="border-b border-border px-4 pb-4 pt-5">
        <Link href="/" onClick={onNavigate} className="block rounded-sm">
          <span className="flex items-center gap-2">
            <span aria-hidden className="grid size-7 place-items-center rounded-md bg-accent-strong text-[13px] font-bold text-white">
              移
            </span>
            <span className="text-[15px] font-bold leading-5 text-fg">
              移住・関係人口
              <br />
              政策支援
            </span>
          </span>
        </Link>
        <p className="mt-3 text-[12px] leading-5 text-fg-3">
          SMOUTデータ活用構想
          <br />
          共同サービス検討用デモ（非公式）
        </p>
      </div>
      <nav aria-label="主要メニュー" className="flex-1 px-2 py-3">
        <Suspense fallback={<NavItems pathname="" onNavigate={onNavigate} />}>
          <NavList onNavigate={onNavigate} />
        </Suspense>
      </nav>
      <div className="border-t border-border px-4 py-3 text-[12px] leading-5 text-fg-3">
        Qommons ONE 搭載アプリ構想
        <br />
        データ最終更新 2026-10-15（架空）
      </div>
    </>
  );
}

function ContextBar() {
  const ctx = useWorkContext();
  const muni = dataSource.getMunicipality(ctx.municipalityId);
  return (
    <div className="flex flex-wrap items-end gap-3">
      <SelectField
        id="ctx-muni"
        label="対象自治体"
        value={ctx.municipalityId}
        onChange={(v) => contextStore.set((p) => ({ ...p, municipalityId: v }))}
        options={dataSource.listMunicipalities().map((m) => ({ value: m.id, label: `${m.name}（${m.usesSmout ? "SMOUT利用あり" : "SMOUT未利用"}）` }))}
        className="w-[min(100%,280px)]"
      />
      <SelectField
        id="ctx-fy"
        label="対象年度"
        value={ctx.fiscalYearId}
        onChange={(v) => contextStore.set((p) => ({ ...p, fiscalYearId: v as FiscalYearId }))}
        options={dataSource.listFiscalYears().map((f) => ({ value: f.id, label: f.label }))}
        className="w-[min(100%,190px)]"
      />
      {muni && (
        <p className="hidden pb-2 text-[12px] leading-5 text-fg-3 md:block">
          {muni.note}・人口 {muni.population.toLocaleString("ja-JP")}人・{muni.department}
        </p>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-bg focus:px-3 focus:py-2 focus:shadow"
      >
        本文へ移動
      </a>

      <div className="hidden w-60 shrink-0 border-r border-border bg-surface-2 lg:block print:hidden">
        <aside className="sticky top-0 flex h-dvh flex-col">
          <SidebarContent />
        </aside>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden print:hidden" role="dialog" aria-modal="true" aria-label="メニュー">
          <button type="button" aria-label="メニューを閉じる" className="absolute inset-0 bg-fg/40" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-border bg-surface-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="メニューを閉じる"
              className="absolute right-2 top-3 grid size-10 place-items-center rounded-md text-fg-2 hover:bg-surface-3"
            >
              <X className="size-5" aria-hidden />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-warn-border bg-warn-soft px-4 py-1.5 text-[12px] leading-5 text-warn sm:px-6 print:hidden" role="note">
          <strong className="font-bold">デモ用の架空データ</strong>
          を表示しています。実在の自治体・SMOUTの実データではありません。分析と文書はルールベースのデモエンジンで作成しています（生成AIは使用していません）。
        </div>
        <header className="z-30 md:sticky md:top-0 border-b border-border bg-bg/95 px-4 py-2.5 backdrop-blur-[2px] sm:px-6 print:hidden">
          <div className="flex items-end gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="メニューを開く"
              className="mb-0.5 grid size-10 shrink-0 place-items-center rounded-md border border-border-strong text-fg-2 hover:bg-surface-2 lg:hidden"
            >
              <Menu className="size-5" aria-hidden />
            </button>
            <ContextBar />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 sm:px-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

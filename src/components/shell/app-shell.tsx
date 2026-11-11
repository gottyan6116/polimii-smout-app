"use client";

import {
  CalendarRange,
  ChevronsUpDown,
  ClipboardCheck,
  FileText,
  House,
  LogOut,
  Menu,
  SearchCheck,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, Suspense, useState } from "react";
import { dataSource } from "@/lib/data/adapter";
import type { FiscalYearId } from "@/lib/data/types";
import { useHydrated } from "@/lib/hooks";
import { contextStore, useDocuments, usePlan, useWorkContext } from "@/lib/store/local-store";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: typeof House; count?: "plan" | "docs" };

export const NAV_GROUPS: { label: string | null; items: NavItem[] }[] = [
  { label: null, items: [{ href: "/", label: "ホーム", icon: House }] },
  {
    label: "分析",
    items: [
      { href: "/evaluation", label: "施策評価・成果報告", icon: ClipboardCheck },
      { href: "/insights", label: "地域・人材・関心分析", icon: UsersRound },
      { href: "/improvements", label: "課題分析・改善提案", icon: SearchCheck },
    ],
  },
  {
    label: "計画・文書",
    items: [
      { href: "/planning", label: "次年度の施策立案", icon: CalendarRange, count: "plan" },
      { href: "/documents", label: "行政文書の作成・編集", icon: FileText, count: "docs" },
    ],
  },
];

const ALL_NAV = NAV_GROUPS.flatMap((g) => g.items);

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/* ---------------- サイドバー ---------------- */

function WorkspaceSwitcher() {
  const ctx = useWorkContext();
  const muni = dataSource.getMunicipality(ctx.municipalityId)!;
  return (
    <div className="relative">
      <label htmlFor="ctx-muni" className="sr-only">
        対象自治体（ワークスペース）
      </label>
      <div
        aria-hidden
        className="pointer-events-none flex items-center gap-2.5 rounded-lg border border-border bg-bg px-2.5 py-2 shadow-panel"
      >
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-md text-[13px] font-bold text-white",
            muni.usesSmout ? "bg-accent-strong" : "bg-navy",
          )}
        >
          {muni.name.replace("サンプル", "").slice(0, 1)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-bold leading-5 text-fg">{muni.name}</span>
          <span className="block truncate text-[12px] leading-4 text-fg-3">
            {muni.usesSmout ? "SMOUT利用あり" : "SMOUT未利用"}・架空
          </span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-fg-3" />
      </div>
      <select
        id="ctx-muni"
        value={ctx.municipalityId}
        onChange={(e) => contextStore.set((p) => ({ ...p, municipalityId: e.target.value }))}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {dataSource.listMunicipalities().map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}（{m.usesSmout ? "SMOUT利用あり" : "SMOUT未利用"}）
          </option>
        ))}
      </select>
    </div>
  );
}

function NavCounts({ kind }: { kind: "plan" | "docs" }) {
  const ctx = useWorkContext();
  const plan = usePlan(ctx.municipalityId);
  const docs = useDocuments();
  const hydrated = useHydrated();
  if (!hydrated) return null;
  const n = kind === "plan" ? plan.selected.length : docs.filter((d) => d.municipalityId === ctx.municipalityId).length;
  if (n === 0) return null;
  return (
    <span
      className="tabular ml-auto rounded-[4px] bg-surface-3 px-1.5 text-[11px] font-medium leading-5 text-fg-2"
      aria-label={kind === "plan" ? `採用施策 ${n}件` : `文書 ${n}件`}
    >
      {n}
    </span>
  );
}

function NavItems({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="space-y-4">
      {NAV_GROUPS.map((g, gi) => (
        <div key={gi}>
          {g.label && <p className="mb-1 px-2.5 text-[12px] font-medium text-fg-3">{g.label}</p>}
          <ul className="space-y-0.5">
            {g.items.map(({ href, label, icon: Icon, count }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors duration-150",
                      active ? "bg-bg text-fg shadow-panel ring-1 ring-border" : "text-fg-2 hover:bg-bg/70 hover:text-fg",
                    )}
                  >
                    <Icon aria-hidden className={cn("size-4 shrink-0", active ? "text-accent-strong" : "text-fg-3")} strokeWidth={1.75} />
                    <span className="truncate">{label}</span>
                    {count && <NavCounts kind={count} />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return <NavItems pathname={pathname} onNavigate={onNavigate} />;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="px-3 pb-3 pt-4">
        <Link href="/" onClick={onNavigate} className="mb-4 flex items-center gap-2 rounded-sm px-1">
          <svg aria-hidden viewBox="0 0 20 20" className="size-5 text-accent-strong">
            <circle cx="10" cy="10" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 2.75v3.5M10 13.75v3.5M2.75 10h3.5M13.75 10h3.5" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="10" cy="10" r="2" fill="var(--accent)" />
          </svg>
          <span className="text-[14px] font-bold leading-5 text-fg">移住・関係人口 政策支援</span>
        </Link>
        <WorkspaceSwitcher />
      </div>
      <nav aria-label="主要メニュー" className="flex-1 overflow-y-auto px-3 py-2">
        <Suspense fallback={<NavItems pathname="" onNavigate={onNavigate} />}>
          <NavList onNavigate={onNavigate} />
        </Suspense>
      </nav>
      <div className="mx-3 mb-3 rounded-lg border border-border bg-bg/60 px-3 py-2.5 text-[12px] leading-5 text-fg-3">
        <p className="font-medium text-fg-2">共同サービス検討用デモ（非公式）</p>
        <p>SMOUTデータ活用構想・Qommons ONE 搭載アプリ案</p>
        <p className="mt-1 flex items-center gap-1.5">
          <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          データ更新 2026-10-15（架空）
        </p>
      </div>
      <LogoutButton />
    </>
  );
}

function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <div className="px-3 pb-3">
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
          router.replace("/login");
          router.refresh();
        }}
        className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium text-fg-2 transition-colors duration-150 hover:bg-bg/70 hover:text-fg disabled:opacity-60"
      >
        <LogOut className="size-4 text-fg-3" strokeWidth={1.75} aria-hidden />
        {pending ? "ログアウトしています…" : "ログアウト"}
      </button>
    </div>
  );
}

/* ---------------- 上部バー ---------------- */

function Breadcrumb() {
  const pathname = usePathname();
  return <BreadcrumbView pathname={pathname} />;
}

function BreadcrumbView({ pathname }: { pathname: string }) {
  const ctx = useWorkContext();
  const muni = dataSource.getMunicipality(ctx.municipalityId);
  const current = [...ALL_NAV].reverse().find((n) => isActive(pathname, n.href));
  const isDoc = pathname.startsWith("/documents/");
  return (
    <nav aria-label="現在地" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-[13px]">
        <li className="hidden truncate text-fg-3 sm:block">{muni?.name}</li>
        <li aria-hidden className="hidden text-border-strong sm:block">
          /
        </li>
        {isDoc ? (
          <>
            <li className="truncate">
              <Link href="/documents" className="text-fg-3 hover:text-fg">
                行政文書
              </Link>
            </li>
            <li aria-hidden className="text-border-strong">
              /
            </li>
            <li className="truncate font-medium text-fg">編集</li>
          </>
        ) : (
          <li className="truncate font-medium text-fg">{current?.label ?? "ホーム"}</li>
        )}
      </ol>
    </nav>
  );
}

function YearSwitch() {
  const ctx = useWorkContext();
  const years = dataSource.listFiscalYears();
  return (
    <div role="radiogroup" aria-label="対象年度" className="flex shrink-0 rounded-md border border-border-strong bg-surface-2 p-0.5">
      {years.map((f) => {
        const on = f.id === ctx.fiscalYearId;
        return (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={on}
            data-fy={f.id}
            onClick={() => contextStore.set((p) => ({ ...p, fiscalYearId: f.id as FiscalYearId }))}
            className={cn(
              "h-7 rounded-[5px] px-2 text-[12px] font-medium whitespace-nowrap transition-colors duration-150 sm:px-2.5",
              on ? "bg-bg text-fg shadow-panel ring-1 ring-border" : "text-fg-3 hover:text-fg",
            )}
          >
            <span className="sm:hidden">
              R{f.startYear - 2018}
              {f.isPartial ? "上期" : ""}
            </span>
            <span className="hidden sm:inline">{f.label}</span>
          </button>
        );
      })}
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

      <div className="hidden w-64 shrink-0 border-r border-border bg-sidebar lg:block print:hidden">
        <aside className="sticky top-0 flex h-dvh flex-col">
          <SidebarContent />
        </aside>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden print:hidden" role="dialog" aria-modal="true" aria-label="メニュー">
          <button type="button" aria-label="メニューを閉じる" className="absolute inset-0 bg-fg/40" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-border bg-sidebar">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="メニューを閉じる"
              className="absolute right-2 top-2 z-10 grid size-10 place-items-center rounded-md text-fg-2 hover:bg-surface-3"
            >
              <X className="size-5" aria-hidden />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-30 border-b border-border bg-bg md:sticky md:top-0 print:hidden">
          <div className="flex h-12 items-center gap-3 px-3 sm:px-6">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="メニューを開く"
              className="grid size-9 shrink-0 place-items-center rounded-md text-fg-2 hover:bg-surface-2 lg:hidden"
            >
              <Menu className="size-5" aria-hidden />
            </button>
            <div className="min-w-0 flex-1">
              <Suspense fallback={<BreadcrumbView pathname="" />}>
                <Breadcrumb />
              </Suspense>
            </div>
            <YearSwitch />
          </div>
          <p className="border-t border-warn-border bg-warn-soft px-3 py-1 text-[12px] leading-5 text-warn sm:px-6" role="note">
            <strong className="font-bold">デモ用の架空データ</strong>
            です。実在の自治体・SMOUTの実データではありません。分析と文書はルールベースのデモエンジンで作成しています（生成AIは不使用）。
          </p>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 sm:px-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

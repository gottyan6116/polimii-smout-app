import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "ログイン" };

/**
 * ログイン画面。ガラス調はCEO指定（Qommons系のログイン画面に合わせる）。
 * avoid-ai-design-ignore: K3
 * 背景は地域の等高線（移住・地域のモチーフ）とブランドの緑・ネイビーの面で構成し、
 * ガラスはその上に重なるカード1枚だけに使う。
 */
export default function LoginPage() {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-[#e9f1ed] text-fg">
      {/* 背景：ブランド色の面 */}
      <div aria-hidden className="absolute inset-0 -z-20">
        <div className="absolute -left-[12%] -top-[18%] size-[62vmax] rounded-full bg-[radial-gradient(circle_at_center,#67c59f_0%,rgba(103,197,159,0.45)_38%,rgba(103,197,159,0)_70%)]" />
        <div className="absolute -bottom-[28%] -right-[10%] size-[66vmax] rounded-full bg-[radial-gradient(circle_at_center,rgba(43,58,85,0.55)_0%,rgba(43,58,85,0.18)_42%,rgba(43,58,85,0)_70%)]" />
        <div className="absolute left-[38%] top-[42%] size-[34vmax] rounded-full bg-[radial-gradient(circle_at_center,rgba(31,122,87,0.35)_0%,rgba(31,122,87,0)_68%)]" />
      </div>
      {/* 背景：等高線 */}
      <svg aria-hidden className="absolute inset-0 -z-10 h-full w-full opacity-[0.55]" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 800">
        <g fill="none" stroke="#ffffff" strokeWidth="1.1">
          {Array.from({ length: 11 }, (_, i) => {
            const s = 1 + i * 0.16;
            return (
              <path
                key={i}
                transform={`translate(${330 - 330 * s} ${300 - 300 * s}) scale(${s})`}
                d="M330 120c90-10 170 40 196 110 24 66-6 122-70 152-70 33-150 30-214-6-60-34-92-96-70-160 22-62 82-90 158-96z"
                opacity={1 - i * 0.07}
              />
            );
          })}
          {Array.from({ length: 8 }, (_, i) => {
            const s = 1 + i * 0.2;
            return (
              <path
                key={`b${i}`}
                transform={`translate(${920 - 920 * s} ${560 - 560 * s}) scale(${s})`}
                d="M920 470c70 4 128 46 132 100 4 52-44 92-112 98-72 6-140-26-150-82-10-58 52-120 130-116z"
                opacity={0.9 - i * 0.08}
              />
            );
          })}
        </g>
      </svg>

      <header className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-8 sm:pt-7">
        <span className="flex items-center gap-2">
          <svg aria-hidden viewBox="0 0 20 20" className="size-6 text-accent-strong">
            <circle cx="10" cy="10" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 2.75v3.5M10 13.75v3.5M2.75 10h3.5M13.75 10h3.5" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="10" cy="10" r="2" fill="#67c59f" />
          </svg>
          <span className="whitespace-nowrap text-[15px] font-bold">移住・関係人口 政策支援</span>
        </span>
        <span className="rounded-full border border-white/70 bg-white/45 px-3 py-1 text-[12px] font-medium text-fg-2 backdrop-blur-md whitespace-nowrap">
          <span className="sm:hidden">デモ（非公式）</span>
          <span className="hidden sm:inline">共同サービス検討用デモ（非公式）</span>
        </span>
      </header>

      <main className="mx-auto grid w-full max-w-[1080px] flex-1 items-center gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_420px] lg:gap-16">
        <section className="hidden lg:block">
          <h1 className="text-[34px] font-bold leading-[1.35] tracking-[0.01em] text-fg">
            施策の評価から、
            <br />
            次年度計画と行政文書まで。
          </h1>
          <p className="mt-4 max-w-[30rem] text-[15px] leading-8 text-fg-2">
            SMOUTの地域・関心データと自治体の政策情報をもとに、移住・関係人口施策の成果評価、改善提案、事業計画書の作成を支援する
            Qommons ONE 搭載アプリの構想デモです。
          </p>
          <dl className="mt-8 grid max-w-[30rem] grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/70 bg-white/40 text-[12px] backdrop-blur-md">
            {[
              ["評価", "目標・実績・達成率"],
              ["分析", "年代・関心・移住段階"],
              ["文書", "Word・PDFで出力"],
            ].map(([k, v]) => (
              <div key={k} className="bg-white/35 px-3.5 py-3">
                <dt className="font-bold text-fg">{k}</dt>
                <dd className="mt-0.5 text-fg-2">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          aria-labelledby="login-title"
          className="w-full rounded-[20px] border border-white/70 bg-white/50 p-6 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_24px_60px_-24px_rgba(22,34,58,0.35)] backdrop-blur-2xl backdrop-saturate-150 sm:p-8"
        >
          <h2 id="login-title" className="text-[22px] font-bold leading-8">
            ログイン
          </h2>
          <p className="mb-6 mt-1 text-[13px] leading-6 text-fg-2">配布されたIDとパスワードを入力してください。</p>
          <Suspense fallback={<div className="h-[248px]" />}>
            <LoginForm />
          </Suspense>
          <p className="mt-5 border-t border-white/70 pt-4 text-[12px] leading-5 text-fg-3">
            このデモに表示されるデータはすべて架空です。実在の自治体・SMOUTの実データは含みません。
          </p>
        </section>
      </main>

      <footer className="px-5 pb-5 text-center text-[12px] text-fg-3 sm:px-8">
        SMOUTデータ活用構想・Qommons ONE 搭載アプリ案（構想段階）
      </footer>
    </div>
  );
}

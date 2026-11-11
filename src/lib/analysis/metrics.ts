/**
 * 指標の算出式と判定ルール。画面・文書の両方がここを使うため、数値は常に一致する。
 */
import type { MonthlyActivity } from "../data/types";

export const FORMULAS = {
  achievementRate: "達成率 ＝ 実績 ÷ 目標 × 100",
  progressRate: "進捗率 ＝ 年度途中の実績 ÷ 年間目標 × 100（達成判定には使わない）",
  applyRate: "応募転換率 ＝「応募したい」件数 ÷「興味ある」件数 × 100（件数ベース）",
  replyRate: "返信率 ＝ 返信あり件数 ÷（「応募したい」件数 ＋ スカウト件数）× 100",
  yoy: "前年度比 ＝（当年度 − 前年度同期間）÷ 前年度同期間 × 100",
  themeShare: "選択率 ＝ そのテーマを選んだ人数 ÷ 期間内のユニーク人数 × 100（複数選択のため合計は100%を超える）",
} as const;

export type JudgementStatus = "achieved" | "not-achieved" | "undeterminable";

export interface Judgement {
  status: JudgementStatus;
  /** 達成率（年度途中は進捗率）。算出できない場合は null */
  rate: number | null;
  /** 判定理由 */
  reason: string;
}

export const STATUS_LABEL: Record<JudgementStatus, string> = {
  achieved: "達成",
  "not-achieved": "未達成",
  undeterminable: "判断不能",
};

export function judge(target: number | null | undefined, actual: number | null | undefined, isPartial: boolean): Judgement {
  if (actual === null || actual === undefined) {
    return { status: "undeterminable", rate: null, reason: "実績データなし（未集計）" };
  }
  if (target === null || target === undefined) {
    return { status: "undeterminable", rate: null, reason: "目標が未設定" };
  }
  if (target === 0) {
    return { status: "undeterminable", rate: null, reason: "目標が0のため達成率を算出できない" };
  }
  const rate = (actual / target) * 100;
  if (isPartial) {
    return { status: "undeterminable", rate, reason: "年度途中のため達成判定をしない（数値は進捗率）" };
  }
  return actual >= target
    ? { status: "achieved", rate, reason: "実績が目標以上" }
    : { status: "not-achieved", rate, reason: "実績が目標未満" };
}

export interface ActivityTotals {
  interest: number;
  apply: number;
  scout: number;
  replied: number;
  /** 応募転換率（%）。興味あるが0件なら null */
  applyRate: number | null;
  /** 返信率（%）。母数0なら null */
  replyRate: number | null;
}

export function sumActivity(rows: MonthlyActivity[]): ActivityTotals | null {
  if (rows.length === 0) return null;
  const t = rows.reduce(
    (acc, r) => ({
      interest: acc.interest + r.interest,
      apply: acc.apply + r.apply,
      scout: acc.scout + r.scout,
      replied: acc.replied + r.replied,
    }),
    { interest: 0, apply: 0, scout: 0, replied: 0 },
  );
  return {
    ...t,
    applyRate: t.interest > 0 ? (t.apply / t.interest) * 100 : null,
    replyRate: t.apply + t.scout > 0 ? (t.replied / (t.apply + t.scout)) * 100 : null,
  };
}

export function changeRate(current: number | null | undefined, previous: number | null | undefined): number | null {
  if (current === null || current === undefined || previous === null || previous === undefined || previous === 0) {
    return null;
  }
  return ((current - previous) / previous) * 100;
}

/* ------------------------------------------------------------------ */
/* 表示用フォーマット                                                    */
/* ------------------------------------------------------------------ */

export const NO_DATA = "データなし";

export function fmtNum(n: number | null | undefined, unit = ""): string {
  if (n === null || n === undefined || Number.isNaN(n)) return NO_DATA;
  return `${Math.round(n).toLocaleString("ja-JP")}${unit}`;
}

export function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return NO_DATA;
  return `${n.toFixed(digits)}%`;
}

export function fmtSignedPct(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "比較不可";
  const s = n.toFixed(digits);
  return n > 0 ? `+${s}%` : `${s}%`;
}

export function fmtPt(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "比較不可";
  const s = n.toFixed(digits);
  return n > 0 ? `+${s}pt` : `${s}pt`;
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${y.slice(2)}/${Number(m)}月`;
}

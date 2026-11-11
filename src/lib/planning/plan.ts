/**
 * 次年度計画の状態（職員が選択・編集した内容）。自治体ごとに保存する。
 */
import type { Measure } from "../analysis/improvements";

export type MeasureEdit = Partial<
  Pick<Measure, "title" | "target" | "content" | "timing" | "department" | "quarters" | "purpose">
> & { kpiProposal?: string };

export interface PlanState {
  /** 採用した施策ID（表示順） */
  selected: string[];
  edits: Record<string, MeasureEdit>;
  /** 重点ターゲット（職員が編集可能） */
  focusTarget?: string;
  updatedAt?: string;
}

export const EMPTY_PLAN: PlanState = { selected: [], edits: {} };

export interface PlannedMeasure extends Measure {
  edited: boolean;
}

export function applyEdits(measure: Measure, edit: MeasureEdit | undefined): PlannedMeasure {
  if (!edit) return { ...measure, edited: false };
  const { kpiProposal, ...rest } = edit;
  return {
    ...measure,
    ...rest,
    kpi: kpiProposal !== undefined ? { ...measure.kpi, proposal: kpiProposal.trim() === "" ? null : kpiProposal } : measure.kpi,
    edited: true,
  };
}

/** 採用施策を返す。未選択の場合は優先度上位3件を「仮」として返す */
export function resolvePlan(measures: Measure[], plan: PlanState): { items: PlannedMeasure[]; provisional: boolean } {
  const valid = plan.selected.filter((id) => measures.some((m) => m.id === id));
  if (valid.length === 0) {
    return { items: measures.slice(0, 3).map((m) => applyEdits(m, plan.edits[m.id])), provisional: true };
  }
  return {
    items: valid.map((id) => applyEdits(measures.find((m) => m.id === id)!, plan.edits[id])),
    provisional: false,
  };
}

export const QUARTER_LABELS = ["4〜6月", "7〜9月", "10〜12月", "1〜3月"] as const;

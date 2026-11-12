import type { FiscalYearId } from "../data/types";

export type DocumentType = "performance-report" | "annual-plan" | "improvement-proposal" | "insight-report" | "briefing";

export interface DocumentTemplate {
  type: DocumentType;
  label: string;
  description: string;
  /** 主に使う分析 */
  basedOn: string;
}

export const TEMPLATES: DocumentTemplate[] = [
  {
    type: "performance-report",
    label: "成果報告書",
    description: "年度の移住・関係人口施策について、目標・実績・達成状況と課題をまとめる。",
    basedOn: "施策評価",
  },
  {
    type: "annual-plan",
    label: "次年度事業計画書",
    description: "重点ターゲット・重点施策・スケジュール・KPI案をまとめる。",
    basedOn: "次年度の施策立案",
  },
  {
    type: "improvement-proposal",
    label: "施策改善提案書",
    description: "検出された課題と根拠、改善施策の優先順位をまとめる。",
    basedOn: "課題分析・改善提案",
  },
  {
    type: "insight-report",
    label: "地域・関心分析レポート",
    description: "年代・移住検討段階・関心テーマの分布と、施策検討への示唆をまとめる。",
    basedOn: "地域・人材・関心分析",
  },
  {
    type: "briefing",
    label: "庁内・議会向け説明資料（原稿）",
    description: "成果・課題・次年度方針の要旨と、想定問答をまとめる。",
    basedOn: "施策評価・改善提案",
  },
];

export function templateOf(type: DocumentType): DocumentTemplate {
  return TEMPLATES.find((t) => t.type === type)!;
}

export interface DocSection {
  id: string;
  heading: string;
  body: string;
}

/** 文書に引用した数値。本文から消えていないかを検証する */
export interface DocFigure {
  id: string;
  label: string;
  value: string;
  sourceId: string;
}

export interface DocumentRecord {
  id: string;
  type: DocumentType;
  title: string;
  municipalityId: string;
  fiscalYearId: FiscalYearId;
  createdAt: string;
  updatedAt: string;
  sections: DocSection[];
  figures: DocFigure[];
  /** 最終確認チェックリストの状態 */
  checklist: Record<string, boolean>;
  /** 生成に使ったエンジン */
  engine: string;
  /** 庁内の確認・決裁の進み具合（デモ：この端末内の記録） */
  approval?: ApprovalState;
}

/** 0=起案（担当者が作成中） 1=係長確認中 2=課長決裁待ち 3=決裁済み */
export type ApprovalStage = 0 | 1 | 2 | 3;

export interface ApprovalEvent {
  stage: ApprovalStage;
  action: "submit" | "approve" | "return" | "reopen";
  at: string;
  note?: string;
}

export interface ApprovalState {
  stage: ApprovalStage;
  history: ApprovalEvent[];
}

export const APPROVAL_STEPS: { label: string; role: string }[] = [
  { label: "起案", role: "担当者" },
  { label: "係長確認", role: "係長" },
  { label: "課長決裁", role: "課長" },
  { label: "決裁済み", role: "" },
];

export function approvalOf(doc: DocumentRecord): ApprovalState {
  return doc.approval ?? { stage: 0, history: [] };
}

export const CHECKLIST_ITEMS: { id: string; label: string }[] = [
  { id: "numbers", label: "引用した数値を出典データと照合した" },
  { id: "placeholders", label: "【要確認】の箇所をすべて確定した" },
  { id: "causality", label: "前年比などの増減を、施策の効果と断定していない" },
  { id: "units", label: "件数と人数、延べと実人数を区別して記載した" },
  { id: "demo", label: "デモ用の架空データを含む場合、その旨を明記した" },
  { id: "approval", label: "所管課内の確認・決裁の手順を確認した" },
];

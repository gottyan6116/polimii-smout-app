/** 分析結果の分類。UI上でも「事実／仮説／推奨アクション／要検証」を区別して表示する */
export type FindingKind = "fact" | "hypothesis" | "action" | "verify";

export const FINDING_LABEL: Record<FindingKind, string> = {
  fact: "確認できた事実",
  hypothesis: "考えられる仮説",
  action: "推奨するアクション",
  verify: "検証が必要な事項",
};

export interface Finding {
  kind: FindingKind;
  text: string;
  /** 根拠となる数値・算出の説明 */
  basis?: string;
  sourceIds: string[];
}

/**
 * ドメイン型定義。
 * 画面はこの型だけに依存し、データの取得元（デモ／CSVバッチ／API）は
 * `PolicyDataSource`（adapter.ts）の実装で差し替える。
 */

/** 年度ID。会計年度（4月始まり）。例: "FY2025" = 令和7年度 */
export type FiscalYearId = "FY2024" | "FY2025" | "FY2026";

export interface FiscalYear {
  id: FiscalYearId;
  /** 表示名 例: 令和7年度 */
  label: string;
  /** 西暦開始年 */
  startYear: number;
  /** 集計対象の月（YYYY-MM）。期間途中の年度は経過月のみ */
  months: string[];
  /** 年度が終わっていない（期間途中）か */
  isPartial: boolean;
  /** 期間の説明 例: 2025年4月〜2026年3月 */
  periodLabel: string;
}

/** データの出典。全数値はいずれかの SourceRef を持つ */
export interface SourceRef {
  id: string;
  /** 表示名 */
  name: string;
  /** 提供元 */
  provider: string;
  /** 利用範囲・注意 */
  scope: string;
  /** 最終更新日 YYYY-MM-DD */
  updatedAt: string;
  /**
   * 実データでの提供状況。
   * - item-public: 項目自体はSMOUTの公開ヘルプで確認できる。Polimillへの提供方法・粒度は未確定（値はデモ用の架空）
   * - unconfirmed: 項目の存在・提供可否とも未確認（交渉事項。値はデモ用の架空）
   * - municipal: 自治体側が保有するデータ（値はデモ用の架空）
   */
  availability: "item-public" | "unconfirmed" | "municipal";
}

export interface Municipality {
  id: string;
  name: string;
  /** 架空であることを示す補足 */
  note: string;
  prefectureArea: RegionId;
  population: number;
  /** SMOUTの利用有無。false の場合、自自治体の活動実績は存在しない */
  usesSmout: boolean;
  /** 移住・関係人口施策の所管課 */
  department: string;
  /** 総合戦略等の政策目標（文章） */
  policyGoals: string[];
}

export type ProjectCategory = "住まい" | "仕事" | "体験・交流" | "相談" | "継業";

/** 自治体の施策・SMOUT掲載プロジェクト */
export interface Project {
  id: string;
  municipalityId: string;
  name: string;
  category: ProjectCategory;
  /** 主な関心テーマ（ThemeId） */
  themes: ThemeId[];
  /** 想定ターゲット */
  intendedTarget: string;
  /** 施策の担当課 */
  owner: string;
  /** この施策が主に寄与する自治体KPI（施策体系図に使う） */
  kpiIds: string[];
}

/** SMOUT上の月次活動実績（件数。人数ではない） */
export interface MonthlyActivity {
  projectId: string;
  month: string; // YYYY-MM
  /** 「興味ある」件数 */
  interest: number;
  /** 「応募したい」件数 */
  apply: number;
  /** スカウト送信件数 */
  scout: number;
  /** 返信あり件数 */
  replied: number;
}

/** 施策ごとの年度目標（SMOUT活動の件数目標） */
export interface ProjectTarget {
  projectId: string;
  fiscalYear: FiscalYearId;
  interest: number | null;
  apply: number | null;
}

export type KpiGroup = "移住" | "関係人口" | "体験・相談";

/** 自治体独自の実績KPI（自治体提供） */
export interface MunicipalKpi {
  id: string;
  municipalityId: string;
  group: KpiGroup;
  name: string;
  unit: "人" | "件" | "組" | "世帯";
  /** 件数か人数か（混同防止のため明示） */
  countType: "人数" | "件数" | "世帯数";
  definition: string;
  /** 対応する政策目標（Municipality.policyGoals の添字） */
  goalIndex: number;
  /** 年度ごとの目標と実績。null はデータなし（欠損）。0 は実績ゼロ */
  values: Partial<Record<FiscalYearId, { target: number | null; actual: number | null }>>;
  sourceId: string;
}

export type AgeBand = "20代以下" | "30代" | "40代" | "50代" | "60代以上";
export type MigrationStage = "情報収集中" | "検討中" | "具体的に準備中" | "移住済み・二拠点";
export type ThemeId =
  | "空き家・住まい"
  | "地域おこし協力隊"
  | "農林漁業"
  | "子育て・教育"
  | "起業・継業"
  | "ワーケーション"
  | "宿泊・観光"
  | "まちづくり";
export type RegionId = "北海道・東北" | "関東" | "中部" | "近畿" | "中国・四国" | "九州・沖縄";

/**
 * 属性別の集計。
 * - scope "own": 自自治体のプロジェクトに反応した利用者（ユニーク人数、期間内）
 * - scope "reference": 参考集計（地域別、自治体横断）。提供可否は未確認
 */
export interface AudienceAggregate {
  scope: "own" | "reference";
  /** own の場合は municipalityId、reference の場合は RegionId */
  key: string;
  fiscalYear: FiscalYearId;
  /** 年代×テーマのクロス集計（人数）。テーマは複数選択のため合計は実人数と一致しない */
  ageTheme: Record<AgeBand, Record<ThemeId, number>>;
  /** 年代別のユニーク人数 */
  ageUnique: Record<AgeBand, number>;
  /** 移住検討段階別のユニーク人数 */
  stage: Record<MigrationStage, number>;
  sourceId: string;
}

export interface DataCatalogEntry {
  id: string;
  label: string;
  description: string;
  sourceId: string;
  /** その自治体で利用可能か */
  available: boolean;
  unavailableReason?: string;
}

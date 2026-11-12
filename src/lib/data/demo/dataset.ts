/**
 * デモ用の架空データセット。
 *
 * - 実在の自治体・実際のSMOUTデータではない。
 * - 乱数は固定シードで生成するため、毎回同じ値になる（画面間・文書間で数値が一致する）。
 * - 実データ連携時はこのファイルではなく adapter.ts の実装を差し替える。
 */
import type {
  AgeBand,
  AudienceAggregate,
  FiscalYear,
  FiscalYearId,
  MigrationStage,
  MonthlyActivity,
  Municipality,
  MunicipalKpi,
  Project,
  ProjectTarget,
  RegionId,
  SourceRef,
  ThemeId,
} from "../types";

/* ------------------------------------------------------------------ */
/* 乱数（固定シード）                                                     */
/* ------------------------------------------------------------------ */

function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rand(seed: string): number {
  let t = hashSeed(seed) + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** 0.9〜1.1 の揺らぎ */
function jitter(seed: string, amplitude = 0.1): number {
  return 1 - amplitude + rand(seed) * amplitude * 2;
}

/* ------------------------------------------------------------------ */
/* 基本マスタ                                                            */
/* ------------------------------------------------------------------ */

function monthsOf(startYear: number, count: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const m = 4 + i;
    const year = m > 12 ? startYear + 1 : startYear;
    const month = m > 12 ? m - 12 : m;
    out.push(`${year}-${String(month).padStart(2, "0")}`);
  }
  return out;
}

export const DATA_UPDATED_AT = "2026-10-15";

export const fiscalYears: FiscalYear[] = [
  {
    id: "FY2024",
    label: "令和6年度",
    startYear: 2024,
    months: monthsOf(2024, 12),
    isPartial: false,
    periodLabel: "2024年4月〜2025年3月",
  },
  {
    id: "FY2025",
    label: "令和7年度",
    startYear: 2025,
    months: monthsOf(2025, 12),
    isPartial: false,
    periodLabel: "2025年4月〜2026年3月",
  },
  {
    id: "FY2026",
    label: "令和8年度（上期）",
    startYear: 2026,
    months: monthsOf(2026, 6),
    isPartial: true,
    periodLabel: "2026年4月〜2026年9月（年度途中）",
  },
];

/** 次年度計画の対象年度 */
export const PLAN_TARGET_LABEL = "令和9年度";

export const sources: SourceRef[] = [
  {
    id: "src-smout-activity",
    name: "SMOUT 活動実績（プロジェクト別・月次）",
    provider: "株式会社カヤック（提供を想定）",
    scope:
      "興味ある・応募したい・スカウト・返信ありの件数。項目はSMOUT管理画面の公開ヘルプで確認できるが、Polimillへの提供方法・粒度は未確定。値はデモ用の架空データ。",
    updatedAt: DATA_UPDATED_AT,
    availability: "item-public",
  },
  {
    id: "src-smout-audience",
    name: "SMOUT 反応者の属性（年代・移住検討段階）",
    provider: "株式会社カヤック（提供を想定）",
    scope:
      "自自治体のプロジェクトに反応した利用者の年代・移住ステップ（ユニーク人数）。管理画面では直近3か月の表示が公開ヘルプで確認できる。年度単位の提供可否は未確認。値はデモ用の架空データ。",
    updatedAt: DATA_UPDATED_AT,
    availability: "item-public",
  },
  {
    id: "src-smout-cross",
    name: "SMOUT 年代×関心テーマ クロス集計",
    provider: "株式会社カヤック（提供可否は未確認）",
    scope:
      "年代と関心テーマの組み合わせ別の人数。提供可否・集計粒度とも未確認の交渉事項。値はデモ用の架空データ。",
    updatedAt: DATA_UPDATED_AT,
    availability: "unconfirmed",
  },
  {
    id: "src-reference",
    name: "参考集計（地域別・自治体横断）",
    provider: "株式会社カヤック（提供可否は未確認）",
    scope:
      "地域ブロック別の関心テーマ・年代・移住検討段階の集計。自治体横断データを受領できるかは未確認。値はデモ用の架空データで、実際の傾向を示すものではない。",
    updatedAt: DATA_UPDATED_AT,
    availability: "unconfirmed",
  },
  {
    id: "src-muni-a",
    name: "サンプルA町 移住定住施策 実績KPI",
    provider: "サンプルA町 企画課（架空）",
    scope: "町が集計する移住相談件数・転入者数等。値はデモ用の架空データ。",
    updatedAt: "2026-10-01",
    availability: "municipal",
  },
  {
    id: "src-muni-b",
    name: "サンプルB市 移住定住施策 実績KPI",
    provider: "サンプルB市 地域振興課（架空）",
    scope: "市が集計する移住相談件数・転入世帯数等。値はデモ用の架空データ。",
    updatedAt: "2026-10-01",
    availability: "municipal",
  },
];

export const municipalities: Municipality[] = [
  {
    id: "muni-a",
    name: "サンプルA町",
    note: "架空の自治体（SMOUT利用あり）",
    prefectureArea: "中国・四国",
    population: 8200,
    usesSmout: true,
    department: "企画課 移住定住推進係",
    policyGoals: [
      "第2期総合戦略：移住支援制度を利用した転入者 年25人",
      "空き家の利活用による住まいの確保（お試し住宅の稼働率向上）",
      "町外から継続的に関わる関係人口の拡大",
    ],
  },
  {
    id: "muni-b",
    name: "サンプルB市",
    note: "架空の自治体（SMOUT未利用）",
    prefectureArea: "九州・沖縄",
    population: 31000,
    usesSmout: false,
    department: "地域振興課 移住交流係",
    policyGoals: [
      "総合戦略：移住支援金等を活用した転入 年40世帯",
      "子育て世帯の移住相談の拡充",
      "ふるさと納税等を通じた関係人口の拡大",
    ],
  },
];

export const projects: Project[] = [
  {
    id: "a-p1",
    municipalityId: "muni-a",
    name: "空き家バンク・お試し住宅",
    category: "住まい",
    themes: ["空き家・住まい"],
    intendedTarget: "30〜40代の移住検討者",
    owner: "企画課",
    kpiIds: ["a-k3","a-k2"],
  },
  {
    id: "a-p2",
    municipalityId: "muni-a",
    name: "地域おこし協力隊（観光・農業）募集",
    category: "仕事",
    themes: ["地域おこし協力隊", "農林漁業"],
    intendedTarget: "20〜30代",
    owner: "企画課",
    kpiIds: ["a-k5"],
  },
  {
    id: "a-p3",
    municipalityId: "muni-a",
    name: "農業体験ワーケーション",
    category: "体験・交流",
    themes: ["ワーケーション", "農林漁業"],
    intendedTarget: "都市部の30代会社員",
    owner: "産業振興課",
    kpiIds: ["a-k4"],
  },
  {
    id: "a-p4",
    municipalityId: "muni-a",
    name: "子育て世帯向けオンライン移住相談",
    category: "相談",
    themes: ["子育て・教育"],
    intendedTarget: "未就学児のいる30代世帯",
    owner: "企画課",
    kpiIds: ["a-k1"],
  },
  {
    id: "a-p5",
    municipalityId: "muni-a",
    name: "商店の継業マッチング",
    category: "継業",
    themes: ["起業・継業"],
    intendedTarget: "起業・継業に関心のある40〜50代",
    owner: "商工観光課",
    kpiIds: ["a-k6"],
  },
];

/* ------------------------------------------------------------------ */
/* SMOUT 月次活動（サンプルA町のみ）                                        */
/* ------------------------------------------------------------------ */

interface ProjectProfile {
  /** 月あたり「興味ある」の基準件数 */
  interest: number;
  /** 応募したい ÷ 興味ある */
  applyRatio: number;
  /** 月あたりスカウト件数 */
  scout: number;
  /** 返信あり ÷ (応募したい＋スカウト) */
  replyRatio: number;
  /** 掲載開始年度 */
  since: FiscalYearId;
}

const profiles: Record<string, ProjectProfile> = {
  "a-p1": { interest: 62, applyRatio: 0.075, scout: 6, replyRatio: 0.31, since: "FY2024" },
  "a-p2": { interest: 44, applyRatio: 0.12, scout: 12, replyRatio: 0.34, since: "FY2024" },
  "a-p3": { interest: 31, applyRatio: 0.045, scout: 5, replyRatio: 0.12, since: "FY2024" },
  "a-p4": { interest: 19, applyRatio: 0.06, scout: 3, replyRatio: 0.26, since: "FY2024" },
  "a-p5": { interest: 14, applyRatio: 0.11, scout: 4, replyRatio: 0.4, since: "FY2025" },
};

/** 4月〜3月の季節変動（平均≒1.0）。1〜2月は移住フェア期で高い想定 */
const SEASON = [1.15, 1.0, 0.9, 0.85, 0.95, 0.9, 1.0, 1.0, 0.85, 1.2, 1.25, 0.95];
const GROWTH: Record<FiscalYearId, number> = { FY2024: 1.0, FY2025: 1.15, FY2026: 1.22 };
const FY_ORDER: FiscalYearId[] = ["FY2024", "FY2025", "FY2026"];

function buildActivity(): MonthlyActivity[] {
  const rows: MonthlyActivity[] = [];
  for (const fy of fiscalYears) {
    for (const [projectId, p] of Object.entries(profiles)) {
      if (FY_ORDER.indexOf(fy.id) < FY_ORDER.indexOf(p.since)) continue;
      fy.months.forEach((month, i) => {
        const seed = `${projectId}-${month}`;
        const interest = Math.round(p.interest * GROWTH[fy.id] * SEASON[i] * jitter(seed + "i"));
        const apply = Math.round(interest * p.applyRatio * jitter(seed + "a", 0.25));
        const scout = Math.round(p.scout * jitter(seed + "s", 0.3));
        const replied = Math.round((apply + scout) * p.replyRatio * jitter(seed + "r", 0.3));
        rows.push({ projectId, month, interest, apply, scout, replied });
      });
    }
  }
  return rows;
}

export const monthlyActivity: MonthlyActivity[] = buildActivity();

/** 目標係数：年間想定件数（基準×12×成長）に対する目標の倍率 */
const TARGET_FACTORS: Record<FiscalYearId, Record<string, [number, number]>> = {
  FY2024: { "a-p1": [0.95, 0.95], "a-p2": [1.0, 1.12], "a-p3": [0.9, 1.0], "a-p4": [1.1, 1.2] },
  FY2025: {
    "a-p1": [1.0, 0.9],
    "a-p2": [1.04, 1.25],
    "a-p3": [0.95, 1.45],
    "a-p4": [1.22, 1.0],
    "a-p5": [0.9, 0.9],
  },
  FY2026: {
    "a-p1": [1.0, 1.0],
    "a-p2": [1.0, 1.1],
    "a-p3": [1.0, 1.2],
    "a-p4": [1.0, 1.0],
    "a-p5": [1.0, 1.0],
  },
};

function buildTargets(): ProjectTarget[] {
  const out: ProjectTarget[] = [];
  for (const fy of FY_ORDER) {
    for (const [projectId, [fi, fa]] of Object.entries(TARGET_FACTORS[fy])) {
      const p = profiles[projectId];
      const annualInterest = p.interest * 12 * GROWTH[fy];
      out.push({
        projectId,
        fiscalYear: fy,
        interest: Math.round((annualInterest * fi) / 10) * 10,
        apply: Math.max(1, Math.round(annualInterest * p.applyRatio * fa)),
      });
    }
  }
  return out;
}

export const projectTargets: ProjectTarget[] = buildTargets();

/* ------------------------------------------------------------------ */
/* 自治体独自KPI（自治体提供）                                             */
/* ------------------------------------------------------------------ */

export const municipalKpis: MunicipalKpi[] = [
  // サンプルA町
  {
    id: "a-k1",
    municipalityId: "muni-a",
    group: "移住",
    name: "移住相談件数",
    unit: "件",
    countType: "件数",
    definition: "窓口・電話・オンラインで受け付けた移住相談の延べ件数（同一人物の複数回相談を含む）",
    goalIndex: 0,
    values: {
      FY2024: { target: 120, actual: 134 },
      FY2025: { target: 150, actual: 141 },
      FY2026: { target: 160, actual: 78 },
    },
    sourceId: "src-muni-a",
  },
  {
    id: "a-k2",
    municipalityId: "muni-a",
    group: "移住",
    name: "移住支援制度を利用した転入者数",
    unit: "人",
    countType: "人数",
    definition: "町の移住支援制度（住宅改修補助・移住支援金）の交付決定者とその世帯員の転入人数",
    goalIndex: 0,
    values: {
      FY2024: { target: 20, actual: 18 },
      FY2025: { target: 25, actual: 27 },
      FY2026: { target: 25, actual: null },
    },
    sourceId: "src-muni-a",
  },
  {
    id: "a-k3",
    municipalityId: "muni-a",
    group: "体験・相談",
    name: "お試し住宅 利用組数",
    unit: "組",
    countType: "件数",
    definition: "お試し住宅の利用申込のうち、実際に滞在した組数（同一世帯の再利用は別組として計上）",
    goalIndex: 1,
    values: {
      FY2024: { target: 30, actual: 33 },
      FY2025: { target: 36, actual: 31 },
      FY2026: { target: 36, actual: 19 },
    },
    sourceId: "src-muni-a",
  },
  {
    id: "a-k4",
    municipalityId: "muni-a",
    group: "関係人口",
    name: "関係人口登録者数（町応援団）",
    unit: "人",
    countType: "人数",
    definition: "町応援団に登録した町外在住者の年度末時点の人数",
    goalIndex: 2,
    values: {
      FY2024: { target: 300, actual: 312 },
      FY2025: { target: 400, actual: null },
      FY2026: { target: 450, actual: null },
    },
    sourceId: "src-muni-a",
  },
  {
    id: "a-k5",
    municipalityId: "muni-a",
    group: "移住",
    name: "地域おこし協力隊 着任人数",
    unit: "人",
    countType: "人数",
    definition: "年度内に着任した地域おこし協力隊員の人数",
    goalIndex: 0,
    values: {
      FY2024: { target: 3, actual: 2 },
      FY2025: { target: 3, actual: 3 },
      FY2026: { target: 2, actual: 1 },
    },
    sourceId: "src-muni-a",
  },
  {
    id: "a-k6",
    municipalityId: "muni-a",
    group: "関係人口",
    name: "継業マッチング 成約件数",
    unit: "件",
    countType: "件数",
    definition: "継業マッチングにより事業承継の合意に至った件数",
    goalIndex: 0,
    values: {
      FY2025: { target: 1, actual: 0 },
      FY2026: { target: 1, actual: 0 },
    },
    sourceId: "src-muni-a",
  },
  // サンプルB市
  {
    id: "b-k1",
    municipalityId: "muni-b",
    group: "移住",
    name: "移住相談件数",
    unit: "件",
    countType: "件数",
    definition: "窓口・オンライン・移住フェアで受け付けた相談の延べ件数",
    goalIndex: 1,
    values: {
      FY2024: { target: 200, actual: 188 },
      FY2025: { target: 220, actual: 240 },
      FY2026: { target: 240, actual: 121 },
    },
    sourceId: "src-muni-b",
  },
  {
    id: "b-k2",
    municipalityId: "muni-b",
    group: "移住",
    name: "移住支援金等を活用した転入世帯数",
    unit: "世帯",
    countType: "世帯数",
    definition: "移住支援金・子育て世帯移住補助の交付世帯数",
    goalIndex: 0,
    values: {
      FY2024: { target: 40, actual: 36 },
      FY2025: { target: 40, actual: 38 },
      FY2026: { target: 40, actual: null },
    },
    sourceId: "src-muni-b",
  },
  {
    id: "b-k3",
    municipalityId: "muni-b",
    group: "体験・相談",
    name: "移住体験ツアー参加者数",
    unit: "人",
    countType: "人数",
    definition: "市主催の移住体験ツアーに参加した人数（同一人物の複数回参加は1人として計上）",
    goalIndex: 1,
    values: {
      FY2024: { target: 40, actual: 35 },
      FY2025: { target: 40, actual: 44 },
      FY2026: { target: 40, actual: null },
    },
    sourceId: "src-muni-b",
  },
  {
    id: "b-k4",
    municipalityId: "muni-b",
    group: "関係人口",
    name: "ふるさと納税 複数年寄附者数",
    unit: "人",
    countType: "人数",
    definition: "前年度にも寄附のあった寄附者の人数（関係人口の参考指標）",
    goalIndex: 2,
    values: {
      FY2024: { target: null, actual: 1240 },
      FY2025: { target: 1300, actual: 1412 },
    },
    sourceId: "src-muni-b",
  },
];

/* ------------------------------------------------------------------ */
/* 属性集計                                                              */
/* ------------------------------------------------------------------ */

export const AGE_BANDS: AgeBand[] = ["20代以下", "30代", "40代", "50代", "60代以上"];
export const STAGES: MigrationStage[] = ["情報収集中", "検討中", "具体的に準備中", "移住済み・二拠点"];
export const THEMES: ThemeId[] = [
  "空き家・住まい",
  "地域おこし協力隊",
  "農林漁業",
  "子育て・教育",
  "起業・継業",
  "ワーケーション",
  "宿泊・観光",
  "まちづくり",
];
export const REGIONS: RegionId[] = ["北海道・東北", "関東", "中部", "近畿", "中国・四国", "九州・沖縄"];

/** 年代ごとのテーマ選択率（架空の想定） */
const AFFINITY: Record<AgeBand, Record<ThemeId, number>> = {
  "20代以下": {
    "空き家・住まい": 0.22, 地域おこし協力隊: 0.42, 農林漁業: 0.2, "子育て・教育": 0.06,
    "起業・継業": 0.18, ワーケーション: 0.3, "宿泊・観光": 0.28, まちづくり: 0.24,
  },
  "30代": {
    "空き家・住まい": 0.34, 地域おこし協力隊: 0.26, 農林漁業: 0.18, "子育て・教育": 0.32,
    "起業・継業": 0.2, ワーケーション: 0.28, "宿泊・観光": 0.16, まちづくり: 0.2,
  },
  "40代": {
    "空き家・住まい": 0.38, 地域おこし協力隊: 0.14, 農林漁業: 0.22, "子育て・教育": 0.26,
    "起業・継業": 0.27, ワーケーション: 0.2, "宿泊・観光": 0.14, まちづくり: 0.18,
  },
  "50代": {
    "空き家・住まい": 0.46, 地域おこし協力隊: 0.08, 農林漁業: 0.3, "子育て・教育": 0.06,
    "起業・継業": 0.24, ワーケーション: 0.12, "宿泊・観光": 0.16, まちづくり: 0.22,
  },
  "60代以上": {
    "空き家・住まい": 0.44, 地域おこし協力隊: 0.03, 農林漁業: 0.34, "子育て・教育": 0.02,
    "起業・継業": 0.1, ワーケーション: 0.06, "宿泊・観光": 0.12, まちづくり: 0.26,
  },
};

const AGE_SHARE: Record<AgeBand, number> = {
  "20代以下": 0.19, "30代": 0.23, "40代": 0.22, "50代": 0.24, "60代以上": 0.12,
};

const STAGE_SHARE: Record<MigrationStage, number> = {
  情報収集中: 0.46, 検討中: 0.3, 具体的に準備中: 0.16, "移住済み・二拠点": 0.08,
};

/** 地域ブロックごとのテーマ補正（架空） */
const REGION_THEME: Record<RegionId, Partial<Record<ThemeId, number>>> = {
  "北海道・東北": { 農林漁業: 1.3, "宿泊・観光": 1.15 },
  関東: { ワーケーション: 1.35, "起業・継業": 1.1 },
  中部: { ワーケーション: 1.15, "空き家・住まい": 1.1 },
  近畿: { まちづくり: 1.2, "起業・継業": 1.15 },
  "中国・四国": { "空き家・住まい": 1.2, 地域おこし協力隊: 1.15 },
  "九州・沖縄": { "宿泊・観光": 1.25, "子育て・教育": 1.15 },
};

const REGION_SCALE: Record<RegionId, number> = {
  "北海道・東北": 4200, 関東: 6100, 中部: 5200, 近畿: 3900, "中国・四国": 4600, "九州・沖縄": 5000,
};

/** 年度ごとのテーマトレンド（架空）。参考集計で「伸びているテーマ」を作る */
const THEME_TREND: Record<FiscalYearId, Partial<Record<ThemeId, number>>> = {
  FY2024: {},
  FY2025: { "起業・継業": 1.18, "空き家・住まい": 1.06, ワーケーション: 0.94 },
  FY2026: { "起業・継業": 1.3, "空き家・住まい": 1.1, ワーケーション: 0.9, まちづくり: 1.08 },
};

function emptyAgeTheme(): Record<AgeBand, Record<ThemeId, number>> {
  const out = {} as Record<AgeBand, Record<ThemeId, number>>;
  for (const a of AGE_BANDS) {
    out[a] = {} as Record<ThemeId, number>;
    for (const t of THEMES) out[a][t] = 0;
  }
  return out;
}

function buildAggregate(
  scope: "own" | "reference",
  key: string,
  fy: FiscalYear,
  total: number,
  themeBias: Partial<Record<ThemeId, number>>,
  ageBias: Partial<Record<AgeBand, number>> = {},
): AudienceAggregate {
  const ageTheme = emptyAgeTheme();
  const ageUnique = {} as Record<AgeBand, number>;
  const stage = {} as Record<MigrationStage, number>;
  const partialScale = fy.isPartial ? fy.months.length / 12 : 1;
  const growth = GROWTH[fy.id];

  for (const a of AGE_BANDS) {
    const n = Math.round(
      total * partialScale * growth * AGE_SHARE[a] * (ageBias[a] ?? 1) * jitter(`${key}-${fy.id}-${a}`, 0.06),
    );
    ageUnique[a] = n;
    for (const t of THEMES) {
      const bias = (themeBias[t] ?? 1) * (THEME_TREND[fy.id][t] ?? 1);
      ageTheme[a][t] = Math.round(n * AFFINITY[a][t] * bias * jitter(`${key}-${fy.id}-${a}-${t}`, 0.12));
    }
  }
  const totalUnique = AGE_BANDS.reduce((s, a) => s + ageUnique[a], 0);
  // 年度が進むほど「具体的に準備中」がわずかに増える想定
  const stageShift = fy.id === "FY2024" ? 0 : fy.id === "FY2025" ? 0.02 : 0.03;
  const shares: Record<MigrationStage, number> = {
    情報収集中: STAGE_SHARE["情報収集中"] - stageShift,
    検討中: STAGE_SHARE["検討中"],
    具体的に準備中: STAGE_SHARE["具体的に準備中"] + stageShift,
    "移住済み・二拠点": STAGE_SHARE["移住済み・二拠点"],
  };
  let assigned = 0;
  STAGES.forEach((s, i) => {
    if (i === STAGES.length - 1) {
      stage[s] = totalUnique - assigned;
    } else {
      stage[s] = Math.round(totalUnique * shares[s] * jitter(`${key}-${fy.id}-${s}`, 0.05));
      assigned += stage[s];
    }
  });

  return {
    scope,
    key,
    fiscalYear: fy.id,
    ageTheme,
    ageUnique,
    stage,
    sourceId: scope === "own" ? "src-smout-audience" : "src-reference",
  };
}

function buildAggregates(): AudienceAggregate[] {
  const out: AudienceAggregate[] = [];
  for (const fy of fiscalYears) {
    for (const r of REGIONS) {
      out.push(buildAggregate("reference", r, fy, REGION_SCALE[r], REGION_THEME[r]));
    }
    // サンプルA町：自自治体プロジェクトへの反応者（50代の比率が高い想定）
    if (fy.id === "FY2024") {
      out.push(
        buildAggregate("own", "muni-a", fy, 420, { "空き家・住まい": 1.25, 地域おこし協力隊: 1.4, 農林漁業: 1.3, "起業・継業": 0.6 }, {
          "50代": 1.25, "30代": 0.95,
        }),
      );
    } else {
      out.push(
        buildAggregate("own", "muni-a", fy, 420, { "空き家・住まい": 1.25, 地域おこし協力隊: 1.4, 農林漁業: 1.3, "起業・継業": 1.1 }, {
          "50代": 1.3, "30代": 0.9,
        }),
      );
    }
  }
  return out;
}

export const audienceAggregates: AudienceAggregate[] = buildAggregates();

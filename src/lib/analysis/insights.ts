/**
 * 地域・人材・関心分析（価値B）。
 * 関心の分布を示すもので、施策の成果（因果）を示すものではない。
 */
import { dataSource } from "../data/adapter";
import { AGE_BANDS, REGIONS, STAGES, THEMES } from "../data/demo/dataset";
import type {
  AgeBand,
  AudienceAggregate,
  FiscalYear,
  FiscalYearId,
  MigrationStage,
  Municipality,
  RegionId,
  ThemeId,
} from "../data/types";
import type { Finding } from "./findings";
import { fmtNum, fmtPct, fmtPt } from "./metrics";

export type InsightScope = "own" | "reference";

export interface InsightFilters {
  scope: InsightScope;
  region: RegionId;
  /** 空配列なら全年代 */
  ages: AgeBand[];
}

export interface ThemeRow {
  theme: ThemeId;
  count: number;
  /** 選択率（%）＝人数 ÷ ユニーク人数 */
  share: number;
  prevShare: number | null;
  /** 選択率の差（pt） */
  shareDiff: number | null;
  /** 自治体の既存施策が扱っているか（自自治体のみ） */
  coveredBy: string[];
}

export interface InsightResult {
  municipality: Municipality;
  fiscalYear: FiscalYear;
  filters: InsightFilters;
  available: boolean;
  unavailableReason?: string;
  sourceIds: string[];
  totalUnique: number;
  ageRows: { age: AgeBand; count: number; share: number }[];
  stageRows: { stage: MigrationStage; count: number; share: number }[];
  themes: ThemeRow[];
  heat: { age: AgeBand; values: { theme: ThemeId; count: number; share: number }[] }[];
  regionCompare: { region: RegionId; values: Record<ThemeId, number> }[];
  findings: Finding[];
}

function prevFyId(id: FiscalYearId): FiscalYearId | null {
  const list = dataSource.listFiscalYears();
  const idx = list.findIndex((f) => f.id === id);
  return idx > 0 ? list[idx - 1].id : null;
}

function getAggregate(m: Municipality, fy: FiscalYearId, filters: InsightFilters): AudienceAggregate | undefined {
  return filters.scope === "own" ? dataSource.getOwnAudience(m.id, fy) : dataSource.getReferenceAudience(filters.region, fy);
}

function themeCounts(agg: AudienceAggregate, ages: AgeBand[]): { counts: Record<ThemeId, number>; unique: number } {
  const counts = {} as Record<ThemeId, number>;
  for (const t of THEMES) counts[t] = ages.reduce((s, a) => s + agg.ageTheme[a][t], 0);
  const unique = ages.reduce((s, a) => s + agg.ageUnique[a], 0);
  return { counts, unique };
}

export function defaultFilters(m: Municipality): InsightFilters {
  return { scope: m.usesSmout ? "own" : "reference", region: m.prefectureArea, ages: [] };
}

export function analyzeInsights(municipalityId: string, fiscalYearId: FiscalYearId, filters: InsightFilters): InsightResult {
  const municipality = dataSource.getMunicipality(municipalityId);
  if (!municipality) throw new Error(`Unknown municipality: ${municipalityId}`);
  const fiscalYear = dataSource.getFiscalYear(fiscalYearId);
  const ages = filters.ages.length ? AGE_BANDS.filter((a) => filters.ages.includes(a)) : AGE_BANDS;

  const base: InsightResult = {
    municipality,
    fiscalYear,
    filters,
    available: false,
    sourceIds: [],
    totalUnique: 0,
    ageRows: [],
    stageRows: [],
    themes: [],
    heat: [],
    regionCompare: [],
    findings: [],
  };

  if (filters.scope === "own" && !municipality.usesSmout) {
    return {
      ...base,
      unavailableReason: `${municipality.name}はSMOUTを利用していないため、自自治体の反応者データはありません。参考集計（地域別）を選択してください。`,
    };
  }
  const agg = getAggregate(municipality, fiscalYearId, filters);
  if (!agg) {
    return { ...base, unavailableReason: "選択した条件のデータがありません。" };
  }

  const { counts, unique } = themeCounts(agg, ages);
  const prevId = prevFyId(fiscalYearId);
  const prevAgg = prevId ? getAggregate(municipality, prevId, filters) : undefined;
  const prev = prevAgg ? themeCounts(prevAgg, ages) : null;
  const projects = dataSource.listProjects(municipality.id);

  const themes: ThemeRow[] = THEMES.map((theme) => {
    const share = unique > 0 ? (counts[theme] / unique) * 100 : 0;
    const prevShare = prev && prev.unique > 0 ? (prev.counts[theme] / prev.unique) * 100 : null;
    return {
      theme,
      count: counts[theme],
      share,
      prevShare,
      shareDiff: prevShare === null ? null : share - prevShare,
      coveredBy: projects.filter((p) => p.themes.includes(theme)).map((p) => p.name),
    };
  }).sort((a, b) => b.count - a.count);

  const allAgeUnique = AGE_BANDS.reduce((s, a) => s + agg.ageUnique[a], 0);
  const ageRows = AGE_BANDS.map((age) => ({
    age,
    count: agg.ageUnique[age],
    share: allAgeUnique > 0 ? (agg.ageUnique[age] / allAgeUnique) * 100 : 0,
  }));
  const stageTotal = STAGES.reduce((s, st) => s + agg.stage[st], 0);
  const stageRows = STAGES.map((stage) => ({
    stage,
    count: agg.stage[stage],
    share: stageTotal > 0 ? (agg.stage[stage] / stageTotal) * 100 : 0,
  }));
  const heat = ages.map((age) => ({
    age,
    values: THEMES.map((theme) => ({
      theme,
      count: agg.ageTheme[age][theme],
      share: agg.ageUnique[age] > 0 ? (agg.ageTheme[age][theme] / agg.ageUnique[age]) * 100 : 0,
    })),
  }));

  const regionCompare = REGIONS.map((region) => {
    const ra = dataSource.getReferenceAudience(region, fiscalYearId);
    const values = {} as Record<ThemeId, number>;
    if (ra) {
      const rc = themeCounts(ra, ages);
      for (const t of THEMES) values[t] = rc.unique > 0 ? (rc.counts[t] / rc.unique) * 100 : 0;
    }
    return { region, values };
  });

  const sourceIds = filters.scope === "own" ? ["src-smout-audience", "src-smout-cross"] : ["src-reference"];
  const result: InsightResult = {
    ...base,
    available: true,
    sourceIds,
    totalUnique: unique,
    ageRows,
    stageRows,
    themes,
    heat,
    regionCompare,
  };
  result.findings = buildInsightFindings(result, municipality);
  return result;
}

function buildInsightFindings(r: InsightResult, m: Municipality): Finding[] {
  const f: Finding[] = [];
  const src = r.sourceIds;
  const scopeLabel = r.filters.scope === "own" ? `${m.name}のプロジェクトに反応した利用者` : `参考集計（${r.filters.region}）`;

  const topAge = [...r.ageRows].sort((a, b) => b.count - a.count)[0];
  f.push({
    kind: "fact",
    text: `${scopeLabel}では「${topAge.age}」が最も多く、${fmtNum(topAge.count, "人")}（${fmtPct(topAge.share)}）。`,
    basis: "年代別のユニーク人数。",
    sourceIds: src,
  });

  const top3 = r.themes.slice(0, 3);
  f.push({
    kind: "fact",
    text: `選択率の高いテーマは ${top3.map((t) => `「${t.theme}」${fmtPct(t.share)}`).join("、")}。`,
    basis: "選択率＝そのテーマを選んだ人数÷ユニーク人数（複数選択）。",
    sourceIds: src,
  });

  const topAgeHeat = r.heat.find((h) => h.age === topAge.age);
  if (topAgeHeat) {
    const best = [...topAgeHeat.values].sort((a, b) => b.share - a.share).slice(0, 2);
    f.push({
      kind: "fact",
      text: `「${topAge.age}」では ${best.map((b) => `「${b.theme}」(${fmtPct(b.share)})`).join("・")} の選択率が高い。`,
      sourceIds: src,
    });
  }

  const rising = r.themes.filter((t) => t.shareDiff !== null && t.shareDiff >= 1.5).sort((a, b) => b.shareDiff! - a.shareDiff!);
  if (rising.length) {
    f.push({
      kind: "fact",
      text: `前年度から選択率が上がったテーマ：${rising.slice(0, 2).map((t) => `「${t.theme}」(${fmtPt(t.shareDiff)})`).join("、")}。`,
      basis: "年度途中の年度もあるため、件数ではなく選択率で比較。",
      sourceIds: src,
    });
  }

  if (m.usesSmout) {
    const gaps = top3.filter((t) => t.coveredBy.length === 0);
    const risingGap = rising.filter((t) => t.coveredBy.length === 0);
    const gapThemes = [...new Set([...gaps, ...risingGap].map((t) => t.theme))];
    if (gapThemes.length) {
      f.push({
        kind: "hypothesis",
        text: `「${gapThemes.join("」「")}」は関心が高い（または伸びている）一方、${m.name}の現行施策で正面から扱っていない。受け皿がないことで、関心が応募・相談につながっていない可能性がある。`,
        sourceIds: src,
      });
    }
    const intended = dataSource.listProjects(m.id).map((p) => p.intendedTarget).join("／");
    f.push({
      kind: "hypothesis",
      text: `現行施策の想定ターゲット（${intended}）と、実際に反応の多い年代（${topAge.age}）にずれがある可能性がある。`,
      basis: "想定ターゲットは施策マスタの記載。反応者の年代は反応した人の分布であり、成約者の分布ではない。",
      sourceIds: src,
    });
  } else {
    f.push({
      kind: "hypothesis",
      text: `参考集計で関心の高い「${top3[0].theme}」「${top3[1].theme}」に対応する施策が${m.name}にあれば、SMOUT等での発信対象として優先度が高い可能性がある。`,
      basis: "参考集計は地域ブロック全体の傾向で、自治体固有の状況は反映していない。",
      sourceIds: src,
    });
  }

  const ready = r.stageRows.filter((s) => s.stage === "具体的に準備中" || s.stage === "移住済み・二拠点");
  const readyShare = ready.reduce((s, x) => s + x.share, 0);
  f.push({
    kind: "action",
    text: `移住検討段階が「具体的に準備中」以降の層は ${fmtPct(readyShare)}。この層には住まい・仕事の個別相談、情報収集層には体験・交流の入口を分けて用意する。`,
    sourceIds: src,
  });

  f.push({
    kind: "verify",
    text: "年代・関心の分布は、施策によって得られた成果ではありません。施策の効果は施策評価画面の目標・実績で確認してください。",
    sourceIds: [],
  });
  f.push({
    kind: "verify",
    text:
      r.filters.scope === "own"
        ? "年代×テーマのクロス集計は、SMOUTからの提供可否が未確認の項目です（デモでは架空データ）。"
        : "地域別の参考集計（自治体横断データ）は、SMOUTからの提供可否が未確認です（デモでは架空データ）。",
    sourceIds: src,
  });
  return f;
}

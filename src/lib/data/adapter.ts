/**
 * データ取得層（アダプター）。
 *
 * 画面・分析ロジックは `PolicyDataSource` だけに依存する。
 * 現在は `demoDataSource`（架空データ）のみ実装。
 *
 * 将来の実装候補（未実装）:
 * - SmoutBatchDataSource: カヤックから定期受領するCSV/Parquetを、サーバー側バッチで取り込み
 *   国内リージョンのDBに格納したものを読む（自治体職員による手動アップロードは想定しない）
 * - SmoutApiDataSource: カヤックが提供するAPI（またはMCPサーバー）をサーバー側から呼ぶ
 * いずれもサーバー側で認証・テナント分離・利用許諾の範囲チェックを行ってから返すこと。
 */
import {
  audienceAggregates,
  fiscalYears,
  monthlyActivity,
  municipalities,
  municipalKpis,
  projectTargets,
  projects,
  sources,
} from "./demo/dataset";
import type {
  AudienceAggregate,
  FiscalYear,
  FiscalYearId,
  MonthlyActivity,
  Municipality,
  MunicipalKpi,
  Project,
  ProjectTarget,
  RegionId,
  SourceRef,
} from "./types";

export interface PolicyDataSource {
  readonly kind: "demo" | "batch" | "api";
  listFiscalYears(): FiscalYear[];
  getFiscalYear(id: FiscalYearId): FiscalYear;
  listMunicipalities(): Municipality[];
  getMunicipality(id: string): Municipality | undefined;
  listProjects(municipalityId: string): Project[];
  /** SMOUT未利用の自治体では空配列を返す（架空の実績を生成しない） */
  listMonthlyActivity(municipalityId: string, fiscalYear: FiscalYearId): MonthlyActivity[];
  listProjectTargets(municipalityId: string, fiscalYear: FiscalYearId): ProjectTarget[];
  listMunicipalKpis(municipalityId: string): MunicipalKpi[];
  getOwnAudience(municipalityId: string, fiscalYear: FiscalYearId): AudienceAggregate | undefined;
  getReferenceAudience(region: RegionId, fiscalYear: FiscalYearId): AudienceAggregate | undefined;
  listSources(): SourceRef[];
  getSource(id: string): SourceRef | undefined;
}

export const demoDataSource: PolicyDataSource = {
  kind: "demo",
  listFiscalYears: () => fiscalYears,
  getFiscalYear: (id) => {
    const fy = fiscalYears.find((f) => f.id === id);
    if (!fy) throw new Error(`Unknown fiscal year: ${id}`);
    return fy;
  },
  listMunicipalities: () => municipalities,
  getMunicipality: (id) => municipalities.find((m) => m.id === id),
  listProjects: (municipalityId) => projects.filter((p) => p.municipalityId === municipalityId),
  listMonthlyActivity: (municipalityId, fiscalYear) => {
    const muni = municipalities.find((m) => m.id === municipalityId);
    if (!muni?.usesSmout) return [];
    const fy = fiscalYears.find((f) => f.id === fiscalYear);
    if (!fy) return [];
    const ids = new Set(projects.filter((p) => p.municipalityId === municipalityId).map((p) => p.id));
    return monthlyActivity.filter((r) => ids.has(r.projectId) && fy.months.includes(r.month));
  },
  listProjectTargets: (municipalityId, fiscalYear) => {
    const ids = new Set(projects.filter((p) => p.municipalityId === municipalityId).map((p) => p.id));
    return projectTargets.filter((t) => ids.has(t.projectId) && t.fiscalYear === fiscalYear);
  },
  listMunicipalKpis: (municipalityId) => municipalKpis.filter((k) => k.municipalityId === municipalityId),
  getOwnAudience: (municipalityId, fiscalYear) =>
    audienceAggregates.find((a) => a.scope === "own" && a.key === municipalityId && a.fiscalYear === fiscalYear),
  getReferenceAudience: (region, fiscalYear) =>
    audienceAggregates.find((a) => a.scope === "reference" && a.key === region && a.fiscalYear === fiscalYear),
  listSources: () => sources,
  getSource: (id) => sources.find((s) => s.id === id),
};

/** アプリ全体で使うデータソース。実データ連携時はここを差し替える */
export const dataSource: PolicyDataSource = demoDataSource;

/**
 * 施策評価（価値A）。自治体KPIとSMOUT活動実績から達成状況を判定する。
 */
import { dataSource } from "../data/adapter";
import type {
  FiscalYear,
  FiscalYearId,
  KpiGroup,
  Municipality,
  MunicipalKpi,
  Project,
} from "../data/types";
import type { Finding } from "./findings";
import {
  type ActivityTotals,
  changeRate,
  fmtNum,
  fmtPct,
  fmtSignedPct,
  judge,
  type Judgement,
  sumActivity,
} from "./metrics";

export interface KpiRow {
  kpi: MunicipalKpi;
  group: KpiGroup;
  target: number | null;
  actual: number | null;
  prevActual: number | null;
  judgement: Judgement;
}

export interface ProjectRow {
  project: Project;
  totals: ActivityTotals | null;
  prevTotals: ActivityTotals | null;
  targetInterest: number | null;
  targetApply: number | null;
  interestJudgement: Judgement;
  applyJudgement: Judgement;
}

export interface MonthlyPoint {
  month: string;
  interest: number;
  apply: number;
  replied: number;
  prevInterest: number | null;
}

export interface EvaluationResult {
  municipality: Municipality;
  fiscalYear: FiscalYear;
  prevFiscalYear: FiscalYear | null;
  hasSmout: boolean;
  totals: ActivityTotals | null;
  /** 前年度の同じ月数分の合計（同期間比較） */
  prevTotals: ActivityTotals | null;
  monthly: MonthlyPoint[];
  projects: ProjectRow[];
  kpis: KpiRow[];
  summary: { achieved: number; notAchieved: number; undeterminable: number };
  findings: Finding[];
}

function prevFy(id: FiscalYearId): FiscalYear | null {
  const list = dataSource.listFiscalYears();
  const idx = list.findIndex((f) => f.id === id);
  return idx > 0 ? list[idx - 1] : null;
}

export function evaluate(municipalityId: string, fiscalYearId: FiscalYearId): EvaluationResult {
  const municipality = dataSource.getMunicipality(municipalityId);
  if (!municipality) throw new Error(`Unknown municipality: ${municipalityId}`);
  const fy = dataSource.getFiscalYear(fiscalYearId);
  const prev = prevFy(fiscalYearId);
  const monthsCount = fy.months.length;
  const prevMonths = prev ? prev.months.slice(0, monthsCount) : [];

  const rows = dataSource.listMonthlyActivity(municipalityId, fy.id);
  const prevRowsAll = prev ? dataSource.listMonthlyActivity(municipalityId, prev.id) : [];
  const prevRows = prevRowsAll.filter((r) => prevMonths.includes(r.month));
  const hasSmout = municipality.usesSmout;

  const totals = sumActivity(rows);
  const prevTotals = sumActivity(prevRows);

  const monthly: MonthlyPoint[] = fy.months.map((month, i) => {
    const m = rows.filter((r) => r.month === month);
    const pm = prevMonths[i] ? prevRows.filter((r) => r.month === prevMonths[i]) : [];
    return {
      month,
      interest: m.reduce((s, r) => s + r.interest, 0),
      apply: m.reduce((s, r) => s + r.apply, 0),
      replied: m.reduce((s, r) => s + r.replied, 0),
      prevInterest: pm.length ? pm.reduce((s, r) => s + r.interest, 0) : null,
    };
  });

  const targets = dataSource.listProjectTargets(municipalityId, fy.id);
  const projects: ProjectRow[] = hasSmout
    ? dataSource.listProjects(municipalityId).map((project) => {
        const pr = rows.filter((r) => r.projectId === project.id);
        const ppr = prevRows.filter((r) => r.projectId === project.id);
        const t = targets.find((x) => x.projectId === project.id);
        const ptotals = sumActivity(pr);
        return {
          project,
          totals: ptotals,
          prevTotals: sumActivity(ppr),
          targetInterest: t?.interest ?? null,
          targetApply: t?.apply ?? null,
          interestJudgement: judge(t?.interest, ptotals?.interest ?? null, fy.isPartial),
          applyJudgement: judge(t?.apply, ptotals?.apply ?? null, fy.isPartial),
        };
      })
    : [];

  const kpis: KpiRow[] = dataSource
    .listMunicipalKpis(municipalityId)
    .filter((k) => k.values[fy.id] !== undefined)
    .map((kpi) => {
      const v = kpi.values[fy.id]!;
      const pv = prev ? kpi.values[prev.id] : undefined;
      return {
        kpi,
        group: kpi.group,
        target: v.target,
        actual: v.actual,
        prevActual: pv?.actual ?? null,
        judgement: judge(v.target, v.actual, fy.isPartial),
      };
    });

  const summary = {
    achieved: kpis.filter((k) => k.judgement.status === "achieved").length,
    notAchieved: kpis.filter((k) => k.judgement.status === "not-achieved").length,
    undeterminable: kpis.filter((k) => k.judgement.status === "undeterminable").length,
  };

  const result: EvaluationResult = {
    municipality,
    fiscalYear: fy,
    prevFiscalYear: prev,
    hasSmout,
    totals,
    prevTotals,
    monthly,
    projects,
    kpis,
    summary,
    findings: [],
  };
  result.findings = buildEvaluationFindings(result);
  return result;
}

function buildEvaluationFindings(r: EvaluationResult): Finding[] {
  const f: Finding[] = [];
  const muniSrc = r.kpis[0]?.kpi.sourceId ?? "";
  const fy = r.fiscalYear;

  f.push({
    kind: "fact",
    text: `自治体KPI ${r.kpis.length}項目のうち、達成 ${r.summary.achieved}、未達成 ${r.summary.notAchieved}、判断不能 ${r.summary.undeterminable}。`,
    basis: fy.isPartial ? "年度途中のため、全項目を判断不能（進捗率のみ表示）としている。" : "達成＝実績が目標以上。",
    sourceIds: [muniSrc],
  });

  for (const k of r.kpis.filter((x) => x.judgement.status === "not-achieved")) {
    f.push({
      kind: "fact",
      text: `「${k.kpi.name}」は目標 ${fmtNum(k.target, k.kpi.unit)} に対し実績 ${fmtNum(k.actual, k.kpi.unit)}（達成率 ${fmtPct(k.judgement.rate)}）。`,
      sourceIds: [k.kpi.sourceId],
    });
  }

  if (r.hasSmout && r.totals) {
    const yoy = changeRate(r.totals.interest, r.prevTotals?.interest);
    f.push({
      kind: "fact",
      text: `SMOUT上の「興味ある」は ${fmtNum(r.totals.interest, "件")}（前年度同期間比 ${fmtSignedPct(yoy)}）、「応募したい」は ${fmtNum(r.totals.apply, "件")}、応募転換率は ${fmtPct(r.totals.applyRate)}。`,
      basis: "件数は延べ（同一利用者の複数プロジェクトへの反応を含む）。",
      sourceIds: ["src-smout-activity"],
    });

    const measurable = r.projects.filter((p) => p.totals && p.totals.applyRate !== null);
    if (measurable.length >= 2) {
      const lowest = [...measurable].sort((a, b) => a.totals!.applyRate! - b.totals!.applyRate!)[0];
      const lowestReply = [...measurable]
        .filter((p) => p.totals!.replyRate !== null)
        .sort((a, b) => a.totals!.replyRate! - b.totals!.replyRate!)[0];
      f.push({
        kind: "fact",
        text: `応募転換率が最も低いのは「${lowest.project.name}」（${fmtPct(lowest.totals!.applyRate)}）。返信率が最も低いのは「${lowestReply.project.name}」（${fmtPct(lowestReply.totals!.replyRate)}）。`,
        sourceIds: ["src-smout-activity"],
      });
      f.push({
        kind: "hypothesis",
        text: `「${lowest.project.name}」は関心は集めているが、募集内容・参加条件・日程が関心層の状況と合っていない可能性がある。`,
        basis: "応募転換率の低さからの推測。応募しなかった理由のデータはないため断定できない。",
        sourceIds: ["src-smout-activity"],
      });
    }

    if (yoy !== null) {
      f.push({
        kind: "verify",
        text: "前年度からの増減は、掲載本数・季節要因・SMOUT全体の利用者数の変化を含む。施策の効果と断定するには、掲載数あたりの反応や比較対象の設定が必要。",
        sourceIds: ["src-smout-activity"],
      });
    }
  } else if (!r.hasSmout) {
    f.push({
      kind: "fact",
      text: `${r.municipality.name}はSMOUTを利用していないため、SMOUT上の活動実績はありません。評価は自治体KPIのみで行っています。`,
      sourceIds: [],
    });
  }

  for (const k of r.kpis.filter((x) => x.judgement.status === "undeterminable" && !fy.isPartial)) {
    f.push({
      kind: "verify",
      text: `「${k.kpi.name}」は${k.judgement.reason}のため判定できません。集計方法・集計時期を所管課に確認してください。`,
      sourceIds: [k.kpi.sourceId],
    });
  }

  if (fy.isPartial) {
    f.push({
      kind: "verify",
      text: `${fy.label}は${fy.periodLabel}の途中経過です。年度末の確定値で再評価してください。`,
      sourceIds: [],
    });
  }

  return f;
}

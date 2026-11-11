/**
 * 課題分析・改善提案。施策評価（evaluate）と関心分析（analyzeInsights）の結果から
 * ルールベースで課題と改善施策候補を作る（デモエンジン）。
 */
import type { FiscalYearId } from "../data/types";
import { evaluate, type EvaluationResult } from "./evaluation";
import type { Finding } from "./findings";
import { analyzeInsights, defaultFilters, type InsightResult } from "./insights";
import { fmtNum, fmtPct } from "./metrics";

export type Level = "高" | "中" | "低";

export interface Issue {
  id: string;
  title: string;
  /** 分析対象（施策・KPI・関心） */
  area: "施策実績" | "自治体KPI" | "関心・属性" | "データ";
  fact: Finding;
  hypothesis: Finding | null;
  action: Finding | null;
  verify: Finding | null;
  measureIds: string[];
}

export interface MeasureKpi {
  name: string;
  formula: string;
  baseline: string;
  /** 目標案。根拠がない場合は null（＝要設定） */
  proposal: string | null;
  basis: string;
}

export interface Measure {
  id: string;
  title: string;
  purpose: string;
  target: string;
  content: string;
  /** 実施時期（四半期） */
  quarters: [boolean, boolean, boolean, boolean];
  timing: string;
  kpi: MeasureKpi;
  department: string;
  impact: Level;
  difficulty: Level;
  /** 優先度スコア（効果×実現容易性）。高いほど優先 */
  priority: number;
  cautions: string;
  issueIds: string[];
}

export interface ImprovementResult {
  evaluation: EvaluationResult;
  insights: InsightResult;
  issues: Issue[];
  measures: Measure[];
}

const LEVEL_SCORE: Record<Level, number> = { 高: 3, 中: 2, 低: 1 };

function priorityOf(impact: Level, difficulty: Level): number {
  // 効果が高く、難易度が低いほど優先
  return LEVEL_SCORE[impact] * 2 + (4 - LEVEL_SCORE[difficulty]);
}

export function analyzeImprovements(municipalityId: string, fiscalYearId: FiscalYearId): ImprovementResult {
  const ev = evaluate(municipalityId, fiscalYearId);
  const ins = analyzeInsights(municipalityId, fiscalYearId, defaultFilters(ev.municipality));
  const issues: Issue[] = [];
  const measures: Measure[] = [];
  const m = ev.municipality;
  const fy = ev.fiscalYear;

  const addMeasure = (x: Omit<Measure, "priority">) => {
    measures.push({ ...x, priority: priorityOf(x.impact, x.difficulty) });
  };

  /* ---------- 施策実績（SMOUT利用自治体のみ） ---------- */
  if (ev.hasSmout) {
    const measurable = ev.projects.filter((p) => p.totals && p.totals.applyRate !== null);
    const avgApply =
      measurable.length > 0
        ? (measurable.reduce((s, p) => s + p.totals!.apply, 0) / measurable.reduce((s, p) => s + p.totals!.interest, 0)) * 100
        : null;
    const replyBase = measurable.reduce((s, p) => s + p.totals!.apply + p.totals!.scout, 0);
    const avgReply = replyBase > 0 ? (measurable.reduce((s, p) => s + p.totals!.replied, 0) / replyBase) * 100 : null;

    // 応募転換率が全体平均を大きく下回る施策
    for (const p of measurable) {
      const rate = p.totals!.applyRate!;
      if (avgApply !== null && rate < avgApply * 0.75) {
        const issueId = `iss-apply-${p.project.id}`;
        const measureId = `ms-apply-${p.project.id}`;
        issues.push({
          id: issueId,
          title: `「${p.project.name}」で関心が応募につながっていない`,
          area: "施策実績",
          fact: {
            kind: "fact",
            text: `応募転換率 ${fmtPct(rate)}（町内プロジェクト平均 ${fmtPct(avgApply)}）。「興味ある」${fmtNum(p.totals!.interest, "件")}に対し「応募したい」${fmtNum(p.totals!.apply, "件")}。`,
            basis: "応募転換率＝応募したい件数÷興味ある件数。",
            sourceIds: ["src-smout-activity"],
          },
          hypothesis: {
            kind: "hypothesis",
            text: "日程・期間・費用負担などの参加条件が、関心を持った層の状況に合っていない可能性がある。",
            basis: "応募しなかった理由のデータはない。",
            sourceIds: [],
          },
          action: {
            kind: "action",
            text: "募集ページで参加条件・費用・日程の選択肢を明示し、短期参加の枠を設ける。",
            sourceIds: [],
          },
          verify: {
            kind: "verify",
            text: "「興味ある」を付けた利用者への簡易アンケート、または問い合わせ内容の分類で、応募しない理由を確認する。",
            sourceIds: [],
          },
          measureIds: [measureId],
        });
        addMeasure({
          id: measureId,
          title: `${p.project.name}の募集条件の見直し`,
          purpose: "関心を持った人が応募しやすい条件・情報に改める",
          target: p.project.intendedTarget,
          content: "募集ページに参加条件・費用・日程の選択肢を明記する。1〜2日の短期参加枠を新設し、オンライン事前説明会を月1回開催する。",
          quarters: [true, true, false, false],
          timing: "第1四半期に募集内容を改訂、第2四半期から短期枠を運用",
          kpi: {
            name: "応募転換率",
            formula: "応募したい件数 ÷ 興味ある件数",
            baseline: `${fy.label} ${fmtPct(rate)}`,
            proposal: avgApply !== null ? `${fmtPct(avgApply)}（町内平均水準）` : null,
            basis: `町内プロジェクトの平均応募転換率（${fmtPct(avgApply)}）を目安とした仮置き。効果の大きさを示すデータはない。`,
          },
          department: p.project.owner,
          impact: "中",
          difficulty: "低",
          cautions: "掲載本数や季節で件数が変わるため、件数ではなく率で比較する。",
          issueIds: [issueId],
        });
      }
    }

    // 返信率が低い施策
    for (const p of measurable) {
      const rr = p.totals!.replyRate;
      if (rr !== null && avgReply !== null && rr < 20) {
        const issueId = `iss-reply-${p.project.id}`;
        const measureId = `ms-reply-${p.project.id}`;
        issues.push({
          id: issueId,
          title: `「${p.project.name}」で応募・スカウト後のやり取りが続いていない`,
          area: "施策実績",
          fact: {
            kind: "fact",
            text: `返信率 ${fmtPct(rr)}（町内プロジェクト平均 ${fmtPct(avgReply)}）。応募したい ${fmtNum(p.totals!.apply, "件")}・スカウト ${fmtNum(p.totals!.scout, "件")}に対し返信あり ${fmtNum(p.totals!.replied, "件")}。`,
            basis: "返信率＝返信あり÷（応募したい＋スカウト）。",
            sourceIds: ["src-smout-activity"],
          },
          hypothesis: {
            kind: "hypothesis",
            text: "担当課の返信までの時間が長い、またはスカウト対象の条件が施策内容と合っていない可能性がある。",
            basis: "返信までの時間のデータはない。",
            sourceIds: [],
          },
          action: {
            kind: "action",
            text: "応募への一次返信を3営業日以内とする運用ルールを定め、スカウト対象の条件を見直す。",
            sourceIds: [],
          },
          verify: {
            kind: "verify",
            text: "応募から一次返信までの日数を記録し、返信率との関係を確認する。",
            sourceIds: [],
          },
          measureIds: [measureId],
        });
        addMeasure({
          id: measureId,
          title: `${p.project.name}の返信体制とスカウト条件の見直し`,
          purpose: "応募・スカウト後のやり取りを継続させ、相談・参加につなげる",
          target: `${p.project.name}に応募・スカウトされた利用者`,
          content: "一次返信を3営業日以内とする運用ルールと定型文を整備する。スカウト対象を、関心テーマと移住検討段階で絞り込む。",
          quarters: [true, false, false, false],
          timing: "第1四半期に運用ルールを決定し、以降継続",
          kpi: {
            name: "返信率",
            formula: "返信あり件数 ÷（応募したい件数＋スカウト件数）",
            baseline: `${fy.label} ${fmtPct(rr)}`,
            proposal: "20.0%",
            basis: `町内平均（${fmtPct(avgReply)}）との差を踏まえ、まず20%を目安とする仮置き。`,
          },
          department: p.project.owner,
          impact: "中",
          difficulty: "低",
          cautions: "スカウト数を増やすだけでは返信率は下がる場合がある。件数と率を併せて確認する。",
          issueIds: [issueId],
        });
      }
    }
  }

  /* ---------- 自治体KPI ---------- */
  for (const k of ev.kpis) {
    if (k.judgement.status === "not-achieved") {
      const issueId = `iss-kpi-${k.kpi.id}`;
      const measureId = `ms-kpi-${k.kpi.id}`;
      issues.push({
        id: issueId,
        title: `「${k.kpi.name}」が目標に届いていない`,
        area: "自治体KPI",
        fact: {
          kind: "fact",
          text: `目標 ${fmtNum(k.target, k.kpi.unit)} に対し実績 ${fmtNum(k.actual, k.kpi.unit)}（達成率 ${fmtPct(k.judgement.rate)}）。前年度実績は ${fmtNum(k.prevActual, k.kpi.unit)}。`,
          basis: k.kpi.definition,
          sourceIds: [k.kpi.sourceId],
        },
        hypothesis: {
          kind: "hypothesis",
          text: "相談・体験に至る前の段階（情報収集・検討中）の層への接点が不足している可能性がある。",
          basis: "移住検討段階の分布（関心分析）を参考にした推測。",
          sourceIds: ins.sourceIds,
        },
        action: {
          kind: "action",
          text: "検討初期の層向けの接点（オンライン相談・短期体験）を増やし、相談への導線を整える。",
          sourceIds: [],
        },
        verify: {
          kind: "verify",
          text: "目標値の設定根拠と、未達要因（季節・体制・外部要因）を所管課で確認する。",
          sourceIds: [],
        },
        measureIds: [measureId],
      });
      addMeasure({
        id: measureId,
        title: `${k.kpi.name}の改善に向けた導線強化`,
        purpose: `「${k.kpi.name}」の目標達成`,
        target: "移住を情報収集・検討している段階の人",
        content: "SMOUT等で関心を示した人に、オンライン相談の予約導線を案内する。相談後のフォロー連絡を定型化する。",
        quarters: [false, true, true, true],
        timing: "第2四半期から実施",
        kpi: {
          name: k.kpi.name,
          formula: k.kpi.definition,
          baseline: `${fy.label} ${fmtNum(k.actual, k.kpi.unit)}`,
          proposal: null,
          basis: "目標値は総合戦略等との整合が必要なため、所管課で設定する（デモエンジンは数値を提示しない）。",
        },
        department: m.department,
        impact: "高",
        difficulty: "中",
        cautions: "相談件数は延べ件数。実人数で評価する場合は別途集計が必要。",
        issueIds: [issueId],
      });
    }
    if (k.judgement.status === "undeterminable" && !fy.isPartial) {
      const issueId = `iss-data-${k.kpi.id}`;
      issues.push({
        id: issueId,
        title: `「${k.kpi.name}」を評価できない`,
        area: "データ",
        fact: {
          kind: "fact",
          text: `${fy.label}の「${k.kpi.name}」は${k.judgement.reason}。`,
          sourceIds: [k.kpi.sourceId],
        },
        hypothesis: null,
        action: {
          kind: "action",
          text: "集計方法・集計時期を決め、次年度は四半期ごとに実績を記録する。",
          sourceIds: [],
        },
        verify: {
          kind: "verify",
          text: "集計の担当者と定義（年度末時点か、年度内の新規登録か）を確認する。",
          sourceIds: [],
        },
        measureIds: [],
      });
    }
  }

  /* ---------- 関心・属性 ---------- */
  if (ins.available) {
    const topAge = [...ins.ageRows].sort((a, b) => b.count - a.count)[0];
    const topAgeHeat = ins.heat.find((h) => h.age === topAge.age);
    const topAgeThemes = topAgeHeat ? [...topAgeHeat.values].sort((a, b) => b.share - a.share).slice(0, 2) : [];
    const rising = ins.themes.filter((t) => t.shareDiff !== null && t.shareDiff >= 1.5).sort((a, b) => b.shareDiff! - a.shareDiff!);
    const focusTheme = rising[0]?.theme ?? ins.themes[0].theme;
    const focusRow = ins.themes.find((t) => t.theme === focusTheme)!;
    const scopeLabel = ins.filters.scope === "own" ? `${m.name}の反応者` : `参考集計（${ins.filters.region}）`;

    const issueId = "iss-audience-gap";
    const measureId = "ms-audience";
    issues.push({
      id: issueId,
      title: `${topAge.age}・「${focusTheme}」への関心に対応する施策が手薄`,
      area: "関心・属性",
      fact: {
        kind: "fact",
        text: `${scopeLabel}で最も多い年代は${topAge.age}（${fmtPct(topAge.share)}）。この年代の選択率上位は${topAgeThemes.map((t) => `「${t.theme}」${fmtPct(t.share)}`).join("・")}。「${focusTheme}」の選択率は${fmtPct(focusRow.share)}${focusRow.shareDiff !== null ? `（前年度差 ${focusRow.shareDiff > 0 ? "+" : ""}${focusRow.shareDiff.toFixed(1)}pt）` : ""}。`,
        sourceIds: ins.sourceIds,
      },
      hypothesis: {
        kind: "hypothesis",
        text: focusRow.coveredBy.length
          ? `既存の「${focusRow.coveredBy.join("」「")}」が${topAge.age}に届いていない可能性がある。`
          : `「${focusTheme}」を扱う施策がないため、関心が具体的な行動につながっていない可能性がある。`,
        basis: "関心の分布であり、施策の成果ではない。",
        sourceIds: ins.sourceIds,
      },
      action: {
        kind: "action",
        text: `${topAge.age}を重点ターゲットに、「${topAgeThemes[0]?.theme ?? focusTheme}」と「${focusTheme}」を組み合わせた募集・体験メニューを試行する。`,
        sourceIds: [],
      },
      verify: {
        kind: "verify",
        text: "試行後に、対象年代の反応数と応募転換率を既存施策と比較する。",
        sourceIds: [],
      },
      measureIds: [measureId],
    });
    addMeasure({
      id: measureId,
      title: `${topAge.age}向け「${topAgeThemes[0]?.theme ?? focusTheme}×${focusTheme}」パッケージの試行`,
      purpose: "関心が高い（伸びている）層・テーマに受け皿をつくる",
      target: `${topAge.age}で「${focusTheme}」に関心のある人`,
      content: `「${topAgeThemes[0]?.theme ?? focusTheme}」と「${focusTheme}」を組み合わせた募集を新設し、現地見学と個別相談をセットで案内する。`,
      quarters: [false, true, true, false],
      timing: "第1四半期に設計、第2〜第3四半期に試行",
      kpi: {
        name: `${topAge.age}の反応者数`,
        formula: "対象プロジェクトに反応したユニーク人数（年代別）",
        baseline: `${fy.label} ${fmtNum(topAge.count, "人")}（${scopeLabel}）`,
        proposal: null,
        basis: "新規施策のため比較できる実績がない。試行期間の結果を見て設定する。",
      },
      department: m.department,
      impact: "高",
      difficulty: "中",
      cautions: ins.filters.scope === "reference" ? "参考集計は地域ブロック全体の傾向。自治体固有の需要は別途確認が必要。" : "年代×テーマのクロス集計は提供可否が未確認の項目。",
      issueIds: [issueId],
    });
  }

  /* ---------- SMOUT未利用 ---------- */
  if (!ev.hasSmout) {
    issues.push({
      id: "iss-no-smout",
      title: "施策ごとの関心・反応を把握する手段がない",
      area: "データ",
      fact: {
        kind: "fact",
        text: `${m.name}はSMOUTを利用していないため、施策ごとの「興味ある」「応募したい」等の反応データはありません。`,
        sourceIds: [],
      },
      hypothesis: {
        kind: "hypothesis",
        text: "相談件数・転入世帯数の増減が、どの施策・発信によるものかを切り分けられていない。",
        sourceIds: [],
      },
      action: {
        kind: "action",
        text: "主要施策について、問い合わせ経路の記録や外部サービスでの募集掲載など、反応を測る手段を検討する。",
        sourceIds: [],
      },
      verify: {
        kind: "verify",
        text: "既存の相談記録で、問い合わせ経路が記録されているかを確認する。",
        sourceIds: [],
      },
      measureIds: ["ms-measure-channel"],
    });
    addMeasure({
      id: "ms-measure-channel",
      title: "相談・問い合わせ経路の記録と反応測定の開始",
      purpose: "施策ごとの効果を把握できる状態をつくる",
      target: "移住相談・問い合わせをした人",
      content: "相談受付票に問い合わせ経路（Web・フェア・紹介等）と関心テーマの項目を追加する。主要施策1件で外部の移住マッチングサービスへの募集掲載を試行する。",
      quarters: [true, true, true, true],
      timing: "第1四半期から通年",
      kpi: {
        name: "経路が記録された相談の割合",
        formula: "経路の記入がある相談件数 ÷ 相談件数",
        baseline: "現状値なし（未記録）",
        proposal: null,
        basis: "現状値がないため、記録開始後の3か月の実績で設定する。",
      },
      department: m.department,
      impact: "中",
      difficulty: "低",
      cautions: "個人情報の項目は増やさない。集計は件数単位で行う。",
      issueIds: ["iss-no-smout"],
    });
  }

  measures.sort((a, b) => b.priority - a.priority);
  return { evaluation: ev, insights: ins, issues, measures };
}

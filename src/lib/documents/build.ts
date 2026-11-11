/**
 * 行政文書の下書き生成（ルールベースのデモエンジン）。
 * 分析結果（evaluate / analyzeInsights / analyzeImprovements）だけを材料にし、
 * 本文に使った数値は figures に登録して後から照合できるようにする。
 */
import { dataSource } from "../data/adapter";
import { PLAN_TARGET_LABEL } from "../data/demo/dataset";
import type { FiscalYearId } from "../data/types";
import { analyzeImprovements } from "../analysis/improvements";
import { FINDING_LABEL } from "../analysis/findings";
import { analyzeInsights, defaultFilters } from "../analysis/insights";
import { changeRate, FORMULAS, fmtNum, fmtPct, fmtSignedPct, STATUS_LABEL } from "../analysis/metrics";
import { type PlanState, QUARTER_LABELS, resolvePlan } from "../planning/plan";
import { type DocFigure, type DocSection, type DocumentRecord, type DocumentType } from "./types";

export const DEMO_ENGINE_ID = "demo-rule-v1";

class Draft {
  sections: DocSection[] = [];
  figures: DocFigure[] = [];
  private n = 0;

  section(heading: string, lines: string[]) {
    this.sections.push({ id: `s${this.sections.length + 1}`, heading, body: lines.join("\n") });
  }

  /** 数値を本文に埋め込みつつ、出典つきで登録する */
  fig(label: string, value: string, sourceId: string): string {
    if (value !== "データなし" && sourceId) {
      this.n += 1;
      this.figures.push({ id: `f${this.n}`, label, value, sourceId });
    }
    return value;
  }
}

export interface BuildInput {
  type: DocumentType;
  municipalityId: string;
  fiscalYearId: FiscalYearId;
  plan: PlanState;
}

export function buildDocument(input: BuildInput, id: string, now: string): DocumentRecord {
  const { type, municipalityId, fiscalYearId, plan } = input;
  const imp = analyzeImprovements(municipalityId, fiscalYearId);
  const ev = imp.evaluation;
  const m = ev.municipality;
  const fy = ev.fiscalYear;
  const ins = analyzeInsights(municipalityId, fiscalYearId, defaultFilters(m));
  const d = new Draft();
  const demoNote =
    "※本文書はデモ用の架空データにもとづく下書きです。実在の自治体・SMOUTの実データではありません。数値・表現は所管課で確認してください。";

  const kpiLines = () =>
    ev.kpis.map((k) => {
      const actual = d.fig(`${k.kpi.name} 実績`, fmtNum(k.actual, k.kpi.unit), k.kpi.sourceId);
      const target = d.fig(`${k.kpi.name} 目標`, fmtNum(k.target, k.kpi.unit), k.kpi.sourceId);
      const rate = k.judgement.rate !== null ? `、${fy.isPartial ? "進捗率" : "達成率"} ${fmtPct(k.judgement.rate)}` : "";
      return `・${k.kpi.name}：目標 ${target}／実績 ${actual}${rate}【${STATUS_LABEL[k.judgement.status]}${k.judgement.status === "undeterminable" ? `：${k.judgement.reason}` : ""}】`;
    });

  const smoutLines = () => {
    if (!ev.hasSmout || !ev.totals) {
      return [
        `${m.name}はSMOUTを利用していないため、SMOUT上の活動実績はない。本報告は自治体が集計したKPIにもとづく。`,
      ];
    }
    const t = ev.totals;
    const yoy = changeRate(t.interest, ev.prevTotals?.interest);
    return [
      `SMOUTに掲載した${ev.projects.length}件のプロジェクトに対する${fy.periodLabel}の反応は次のとおり（いずれも延べ件数）。`,
      `・「興味ある」：${d.fig("興味ある件数", fmtNum(t.interest, "件"), "src-smout-activity")}（前年度同期間比 ${fmtSignedPct(yoy)}）`,
      `・「応募したい」：${d.fig("応募したい件数", fmtNum(t.apply, "件"), "src-smout-activity")}`,
      `・応募転換率：${d.fig("応募転換率", fmtPct(t.applyRate), "src-smout-activity")}（${FORMULAS.applyRate}）`,
      `・返信率：${d.fig("返信率", fmtPct(t.replyRate), "src-smout-activity")}（${FORMULAS.replyRate}）`,
      "なお、前年度からの増減には掲載本数や季節要因、SMOUT全体の利用者数の変化が含まれるため、施策の効果と直ちに判断することはできない。",
    ];
  };

  const projectLines = () =>
    ev.projects.map((p) => {
      if (!p.totals) return `・${p.project.name}：${fy.label}の活動データなし（掲載前）`;
      return `・${p.project.name}：興味ある ${d.fig(`${p.project.name} 興味ある`, fmtNum(p.totals.interest, "件"), "src-smout-activity")}（目標 ${fmtNum(p.targetInterest, "件")}、${STATUS_LABEL[p.interestJudgement.status]}）、応募したい ${d.fig(`${p.project.name} 応募したい`, fmtNum(p.totals.apply, "件"), "src-smout-activity")}（目標 ${fmtNum(p.targetApply, "件")}、${STATUS_LABEL[p.applyJudgement.status]}）`;
    });

  const sourceLines = (ids: string[]) =>
    [...new Set(ids)].map((sid) => {
      const s = dataSource.getSource(sid);
      return s ? `・${s.name}（${s.provider}、最終更新 ${s.updatedAt}）：${s.scope}` : "";
    });

  const { items: planned, provisional } = resolvePlan(imp.measures, plan);
  const verifyTexts = [...new Set(imp.issues.flatMap((i) => (i.verify ? [i.verify.text] : [])))];
  const topAge = ins.available ? [...ins.ageRows].sort((a, b) => b.count - a.count)[0] : null;
  const focusTarget =
    plan.focusTarget?.trim() ||
    (topAge ? `${topAge.age}を中心とする、「${ins.themes[0].theme}」「${ins.themes[1].theme}」に関心のある移住検討者` : "【要確認：重点ターゲット】");

  let title = "";
  switch (type) {
    case "performance-report": {
      title = `${fy.label} 移住・関係人口施策 成果報告書（案）`;
      d.section("1. 目的と対象範囲", [
        `本報告書は、${m.name}が${fy.label}（${fy.periodLabel}）に実施した移住・関係人口施策について、政策目標に対する実績と課題を整理するものである。`,
        `所管：${m.department}`,
        fy.isPartial ? "対象年度は期間途中であり、本報告は中間報告として扱う。達成・未達成の判定は行わず、進捗率のみを記載する。" : "",
      ].filter(Boolean));
      d.section("2. 政策目標", m.policyGoals.map((g) => `・${g}`));
      d.section("3. 実績の概要", [
        `自治体KPI ${ev.kpis.length}項目の状況は、達成 ${ev.summary.achieved}項目、未達成 ${ev.summary.notAchieved}項目、判断不能 ${ev.summary.undeterminable}項目である。`,
        ...kpiLines(),
        `（${FORMULAS.achievementRate}）`,
      ]);
      d.section("4. SMOUT上の活動実績", smoutLines());
      if (ev.hasSmout) d.section("5. 施策別の成果", projectLines());
      d.section(`${ev.hasSmout ? 6 : 5}. 成果と課題の分析`, [
        ...ev.findings.filter((f) => f.kind === "fact").map((f) => `・［${FINDING_LABEL.fact}］${f.text}`),
        ...ev.findings.filter((f) => f.kind === "hypothesis").map((f) => `・［${FINDING_LABEL.hypothesis}］${f.text}`),
        ...ev.findings.filter((f) => f.kind === "verify").map((f) => `・［${FINDING_LABEL.verify}］${f.text}`),
      ]);
      d.section(`${ev.hasSmout ? 7 : 6}. 今後の方向性`, [
        "分析結果を踏まえ、次の改善を検討する。",
        ...imp.measures.slice(0, 3).map((x) => `・${x.title}：${x.content}`),
        "具体的な事業内容・予算は次年度事業計画において定める。【要確認：所管課の方針】",
      ]);
      d.section(`${ev.hasSmout ? 8 : 7}. データの出典と留意事項`, [
        ...sourceLines([...ev.kpis.map((k) => k.kpi.sourceId), ...(ev.hasSmout ? ["src-smout-activity"] : [])]),
        demoNote,
      ]);
      break;
    }

    case "annual-plan": {
      title = `${PLAN_TARGET_LABEL} 移住・関係人口施策 事業計画書（案）`;
      d.section("1. 計画の趣旨", [
        `本計画は、${fy.label}の施策評価と地域・関心分析の結果を踏まえ、${PLAN_TARGET_LABEL}に${m.name}が重点的に取り組む移住・関係人口施策を定めるものである。`,
        `所管：${m.department}`,
      ]);
      d.section("2. 現状と課題", [
        `・自治体KPI ${ev.kpis.length}項目のうち、${fy.label}は達成 ${ev.summary.achieved}、未達成 ${ev.summary.notAchieved}、判断不能 ${ev.summary.undeterminable}。`,
        ...ev.kpis
          .filter((k) => k.judgement.status === "not-achieved")
          .map((k) => `・${k.kpi.name}：目標 ${d.fig(`${k.kpi.name} 目標`, fmtNum(k.target, k.kpi.unit), k.kpi.sourceId)}に対し実績 ${d.fig(`${k.kpi.name} 実績`, fmtNum(k.actual, k.kpi.unit), k.kpi.sourceId)}`),
        ...imp.issues.slice(0, 4).map((i) => `・課題：${i.title}`),
      ]);
      d.section("3. 重点ターゲット", [
        focusTarget,
        topAge
          ? `根拠：${ins.filters.scope === "own" ? `${m.name}のプロジェクトに反応した利用者` : `参考集計（${ins.filters.region}）`}で最も多い年代は${topAge.age}（${d.fig(`${topAge.age} 構成比`, fmtPct(topAge.share), ins.sourceIds[0])}）。関心テーマの選択率上位は「${ins.themes[0].theme}」（${d.fig(`${ins.themes[0].theme} 選択率`, fmtPct(ins.themes[0].share), ins.sourceIds[0])}）。`
          : "根拠：【要確認：ターゲット設定の根拠】",
        "※年代・関心の分布は関心の傾向を示すものであり、施策の成果を示すものではない。",
      ]);
      d.section(
        "4. 重点施策",
        [
          provisional ? "※施策が選択されていないため、優先度の高い3件を仮に掲載している。【要確認：採用する施策】" : "",
          ...planned.flatMap((x, i) => [
            `（${i + 1}）${x.title}`,
            `　目的：${x.purpose}`,
            `　対象：${x.target}`,
            `　内容：${x.content}`,
            `　時期：${x.timing}`,
            `　担当：${x.department}`,
          ]),
        ].filter(Boolean),
      );
      d.section("5. 実施スケジュール", [
        `（四半期：${QUARTER_LABELS.join("／")}）`,
        ...planned.map(
          (x) => `・${x.title}：${x.quarters.map((q, i) => (q ? QUARTER_LABELS[i] : null)).filter(Boolean).join("、") || "【要確認：実施時期】"}`,
        ),
      ]);
      d.section("6. 成果指標（KPI案）", [
        ...planned.map(
          (x) =>
            `・${x.kpi.name}（${x.kpi.formula}）：現状 ${x.kpi.baseline}／目標案 ${x.kpi.proposal ?? "【要確認：目標値は所管課で設定】"}\n　根拠：${x.kpi.basis}`,
        ),
      ]);
      d.section("7. 推進体制と予算", [
        `${m.department}が全体を所管し、各施策の担当課と連携して実施する。`,
        "【要確認：予算額・財源（国の交付金等の活用可否）】",
        "【要確認：外部委託の有無】",
      ]);
      d.section("8. 留意事項・検証事項", [
        ...verifyTexts.slice(0, 4).map((t) => `・${t}`),
        "・KPIの目標値は、総合戦略等の上位計画との整合を確認したうえで確定する。",
        demoNote,
      ]);
      break;
    }

    case "improvement-proposal": {
      title = `${fy.label} 移住・関係人口施策 改善提案書（案）`;
      d.section("1. 提案の背景", [
        `${fy.label}の施策評価の結果、自治体KPI ${ev.kpis.length}項目のうち未達成 ${ev.summary.notAchieved}項目、判断不能 ${ev.summary.undeterminable}項目があった。本書では、実績データと地域・関心分析から改善が必要な点を整理し、改善施策を提案する。`,
      ]);
      d.section(
        "2. 検出された課題",
        imp.issues.flatMap((i, n) => [
          `（${n + 1}）${i.title}`,
          `　［${FINDING_LABEL.fact}］${i.fact.text}`,
          i.hypothesis ? `　［${FINDING_LABEL.hypothesis}］${i.hypothesis.text}` : "",
          i.action ? `　［${FINDING_LABEL.action}］${i.action.text}` : "",
        ]).filter(Boolean),
      );
      d.section(
        "3. 改善提案（優先順）",
        planned.length && !provisional
          ? planned.flatMap((x, n) => [
              `（${n + 1}）${x.title}（効果：${x.impact}／難易度：${x.difficulty}）`,
              `　対象：${x.target}`,
              `　内容：${x.content}`,
              `　時期：${x.timing}`,
              `　KPI案：${x.kpi.name} 現状 ${x.kpi.baseline}／目標案 ${x.kpi.proposal ?? "要設定"}（根拠：${x.kpi.basis}）`,
            ])
          : imp.measures.flatMap((x, n) => [
              `（${n + 1}）${x.title}（効果：${x.impact}／難易度：${x.difficulty}）`,
              `　対象：${x.target}`,
              `　内容：${x.content}`,
              `　時期：${x.timing}`,
              `　KPI案：${x.kpi.name} 現状 ${x.kpi.baseline}／目標案 ${x.kpi.proposal ?? "要設定"}（根拠：${x.kpi.basis}）`,
            ]),
      );
      d.section("4. 検証が必要な事項・必要な追加データ", [
        ...verifyTexts.map((t) => `・${t}`),
        "・応募しなかった理由、返信までの日数など、現状は取得していないデータの収集方法。",
      ]);
      d.section("5. 次のステップ", [
        "・所管課で提案内容を確認し、次年度事業計画への反映可否を判断する。【要確認：検討スケジュール】",
        "・採用した施策について、KPIの目標値と検証方法を確定する。",
        demoNote,
      ]);
      break;
    }

    case "insight-report": {
      title = `${fy.label} 地域・関心分析レポート（${m.name}）`;
      if (!ins.available) {
        d.section("1. 分析対象", [ins.unavailableReason ?? "分析できるデータがありません。"]);
        break;
      }
      const src = ins.sourceIds[0];
      const scopeLabel = ins.filters.scope === "own" ? `${m.name}のSMOUTプロジェクトに反応した利用者` : `SMOUT 参考集計（${ins.filters.region}・自治体横断）`;
      d.section("1. 分析の目的と対象", [
        `本レポートは、移住・関係人口施策の対象を検討するため、${scopeLabel}の年代・移住検討段階・関心テーマの分布を整理するものである。`,
        `対象期間：${fy.periodLabel}／対象人数：${d.fig("分析対象のユニーク人数", fmtNum(ins.totalUnique, "人"), src)}（ユニーク人数）`,
      ]);
      d.section("2. 年代別の構成", ins.ageRows.map((a) => `・${a.age}：${d.fig(`${a.age} 人数`, fmtNum(a.count, "人"), src)}（${fmtPct(a.share)}）`));
      d.section("3. 移住検討段階", ins.stageRows.map((s) => `・${s.stage}：${d.fig(`${s.stage} 人数`, fmtNum(s.count, "人"), src)}（${fmtPct(s.share)}）`));
      d.section("4. 関心テーマ", [
        `（${FORMULAS.themeShare}）`,
        ...ins.themes.map(
          (t, i) =>
            `${i + 1}位 ${t.theme}：${d.fig(`${t.theme} 選択率`, fmtPct(t.share), src)}${t.shareDiff !== null ? `（前年度差 ${t.shareDiff > 0 ? "+" : ""}${t.shareDiff.toFixed(1)}pt）` : ""}`,
        ),
      ]);
      d.section(
        "5. 年代別の関心テーマ",
        ins.heat.map((h) => {
          const best = [...h.values].sort((a, b) => b.share - a.share).slice(0, 3);
          return `・${h.age}：${best.map((b) => `${b.theme} ${fmtPct(b.share)}`).join("、")}`;
        }),
      );
      d.section("6. 施策検討への示唆", [
        ...ins.findings.filter((f) => f.kind !== "fact").map((f) => `・［${FINDING_LABEL[f.kind]}］${f.text}`),
      ]);
      d.section("7. 出典と留意事項", [...sourceLines(ins.sourceIds), demoNote]);
      break;
    }

    case "briefing": {
      title = `${fy.label} 移住・関係人口施策の状況について（説明資料原稿）`;
      const notAchieved = ev.kpis.filter((k) => k.judgement.status === "not-achieved");
      d.section("1. 説明の要旨", [
        `・${fy.label}の移住・関係人口施策は、KPI ${ev.kpis.length}項目のうち${ev.summary.achieved}項目で目標を達成した。`,
        notAchieved.length
          ? `・「${notAchieved.map((k) => k.kpi.name).join("」「")}」は目標に届かなかった。`
          : "・目標に届かなかった項目はない（判断不能の項目を除く）。",
        `・次年度は、${imp.measures[0]?.title ?? "改善施策"}などに重点的に取り組む方針で検討している。`,
      ]);
      d.section("2. 今年度の成果", kpiLines());
      d.section("3. 課題", imp.issues.slice(0, 4).map((i) => `・${i.title}（${i.fact.text}）`));
      d.section("4. 次年度の取組方針（検討中）", [
        ...imp.measures.slice(0, 3).map((x) => `・${x.title}`),
        "※事業内容・予算は現在検討中であり、確定したものではない。",
      ]);
      d.section("5. 想定問答", [
        ev.hasSmout
          ? "問：SMOUTの「興味ある」件数は、移住者の数か。\n答：移住者数ではない。SMOUT上でプロジェクトに関心を示した操作の延べ件数であり、同一人物の複数回の反応を含む。"
          : "問：SMOUTを利用していない理由は何か。\n答：【要確認：所管課の見解】",
        "問：前年度より数値が増えたのは施策の効果か。\n答：増減には掲載本数・季節要因・全国的な動向も含まれるため、施策の効果と断定はできない。効果の検証方法を次年度計画で定める。",
        "問：目標を達成できなかった項目への対応は。\n答：要因を分析したうえで、次年度事業計画に改善策を盛り込む方向で検討している。",
        demoNote,
      ]);
      break;
    }
  }

  return {
    id,
    type,
    title,
    municipalityId,
    fiscalYearId,
    createdAt: now,
    updatedAt: now,
    sections: d.sections,
    figures: d.figures,
    checklist: {},
    engine: DEMO_ENGINE_ID,
  };
}

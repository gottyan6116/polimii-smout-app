/**
 * グラフの色と体裁（dataviz スキルの手順で検証済み）。
 *
 * 分類色（施策などの系列）は固定順で割り当て、並べ替えない。
 *   validate_palette.js "#1f8a62,#2a78d6,#eb6834,#c4508a,#eda100" --mode light --surface "#ffffff"
 *   → ALL CHECKS PASS（黄 #eda100 のみ白地 2.17:1 のため、凡例・数値ラベル・表を必ず併記）
 */
export const SERIES = ["#1f8a62", "#2a78d6", "#eb6834", "#c4508a", "#eda100"] as const;

/** 順序のある段階（移住検討段階）用の緑の連続色。最も薄い段でも白地 2:1 以上 */
export const ORDINAL_GREEN = ["#6cbf98", "#3f9f78", "#24805d", "#145a3f"] as const;

/** 状態色は系列色に流用しない。必ずアイコンか文字ラベルと併用する */
export const STATUS = {
  achieved: "#1f7a57",
  notAchieved: "#c2412f",
  undeterminable: "#a9b4c2",
} as const;

export const INK = {
  primary: "#16223a",
  secondary: "#3f4b60",
  muted: "#5d687a",
  grid: "#e3e8e6",
  axis: "#c7d0cc",
  context: "#9aa5b4", // 比較対象（前年度など）の灰色
  emphasis: "#1f7a57",
  base: "#9fd6bc", // 強調しない棒
} as const;

export const AXIS_TICK = { fontSize: 11, fill: INK.muted } as const;

export const TOOLTIP_PROPS = {
  contentStyle: {
    border: "1px solid #c7d0cc",
    borderRadius: 8,
    fontSize: 12,
    padding: "8px 10px",
    boxShadow: "0 4px 12px rgba(22,34,58,0.10)",
  },
  labelStyle: { color: INK.primary, fontWeight: 700, marginBottom: 2 },
  itemStyle: { padding: 0, color: INK.secondary },
  cursor: { fill: "rgba(31,122,87,0.06)" },
} as const;

export const nf = (v: unknown, unit = "") => `${Number(v).toLocaleString("ja-JP")}${unit}`;

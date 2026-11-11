import { CHECKLIST_ITEMS, type DocFigure, type DocumentRecord } from "./types";

export interface FigureCheck {
  figure: DocFigure;
  /** 本文に数値が残っているか（編集で書き換えられていないか） */
  present: boolean;
}

export interface ValidationResult {
  placeholders: { sectionId: string; heading: string; text: string }[];
  figureChecks: FigureCheck[];
  missingFigures: number;
  checklistDone: number;
  checklistTotal: number;
  ready: boolean;
}

const PLACEHOLDER = /【要確認[：:]?([^】]*)】/g;

export function validateDocument(doc: DocumentRecord): ValidationResult {
  const placeholders: ValidationResult["placeholders"] = [];
  for (const s of doc.sections) {
    for (const match of s.body.matchAll(PLACEHOLDER)) {
      placeholders.push({ sectionId: s.id, heading: s.heading, text: match[1] || "要確認" });
    }
  }
  const fullText = doc.sections.map((s) => s.body).join("\n");
  const figureChecks = doc.figures.map((figure) => ({ figure, present: fullText.includes(figure.value) }));
  const missingFigures = figureChecks.filter((f) => !f.present).length;
  const checklistDone = CHECKLIST_ITEMS.filter((c) => doc.checklist[c.id]).length;
  return {
    placeholders,
    figureChecks,
    missingFigures,
    checklistDone,
    checklistTotal: CHECKLIST_ITEMS.length,
    ready: placeholders.length === 0 && missingFigures === 0 && checklistDone === CHECKLIST_ITEMS.length,
  };
}

/**
 * Word（.docx）出力。ブラウザ上で生成してダウンロードする（サーバー不要）。
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { dataSource } from "../data/adapter";
import type { DocumentRecord } from "./types";

const BODY_FONT = { ascii: "Yu Mincho", hAnsi: "Yu Mincho", eastAsia: "游明朝" };
const HEAD_FONT = { ascii: "Yu Gothic", hAnsi: "Yu Gothic", eastAsia: "游ゴシック" };

function cell(text: string, opts: { bold?: boolean; width: number; shade?: boolean }) {
  return new TableCell({
    width: { size: opts.width, type: WidthType.PERCENTAGE },
    shading: opts.shade ? { type: ShadingType.CLEAR, color: "auto", fill: "EEF2F0" } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: opts.bold, size: 18, font: BODY_FONT })] })],
  });
}

export async function documentToDocxBlob(doc: DocumentRecord): Promise<Blob> {
  const muni = dataSource.getMunicipality(doc.municipalityId);
  const fy = dataSource.getFiscalYear(doc.fiscalYearId);
  const date = new Date(doc.updatedAt).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: `${muni?.name ?? ""} ${muni?.department ?? ""}`, size: 20, font: BODY_FONT })],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 240 },
      children: [new TextRun({ text: `作成日 ${date}／対象 ${fy.label}`, size: 20, font: BODY_FONT })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: doc.title, bold: true, size: 32, font: HEAD_FONT })],
    }),
    new Paragraph({
      spacing: { after: 240 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 6, color: "B45309" },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: "B45309" },
      },
      children: [
        new TextRun({
          text: "【デモ】本文書はデモ用の架空データにもとづく下書きです。実在の自治体・SMOUTの実データではありません。",
          size: 18,
          font: HEAD_FONT,
          color: "8A3B0A",
        }),
      ],
    }),
  ];

  for (const s of doc.sections) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 280, after: 120 },
        children: [new TextRun({ text: s.heading, bold: true, size: 24, font: HEAD_FONT, color: "17233A" })],
      }),
    );
    for (const line of s.body.split("\n")) {
      children.push(
        new Paragraph({
          spacing: { after: 80, line: 340 },
          children: [new TextRun({ text: line, size: 21, font: BODY_FONT })],
        }),
      );
    }
  }

  if (doc.figures.length) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 360, after: 120 },
        children: [new TextRun({ text: "参考：引用した数値と出典", bold: true, size: 24, font: HEAD_FONT })],
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              cell("項目", { bold: true, width: 40, shade: true }),
              cell("値", { bold: true, width: 20, shade: true }),
              cell("出典", { bold: true, width: 40, shade: true }),
            ],
          }),
          ...doc.figures.map(
            (f) =>
              new TableRow({
                children: [
                  cell(f.label, { width: 40 }),
                  cell(f.value, { width: 20 }),
                  cell(dataSource.getSource(f.sourceId)?.name ?? f.sourceId, { width: 40 }),
                ],
              }),
          ),
        ],
      }),
    );
  }

  const file = new Document({
    creator: "移住・関係人口政策支援 デモ",
    title: doc.title,
    styles: { default: { document: { run: { font: BODY_FONT, size: 21 } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1418, bottom: 1418, left: 1418, right: 1418 } } },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ children: [PageNumber.CURRENT], size: 18 })],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
  return Packer.toBlob(file);
}

export function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80);
}

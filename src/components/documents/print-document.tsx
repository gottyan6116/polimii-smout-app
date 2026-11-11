import { dataSource } from "@/lib/data/adapter";
import type { DocumentRecord } from "@/lib/documents/types";
import { cn } from "@/lib/utils";

/** 印刷（PDF保存）とプレビューで共通の文書レンダリング */
export function DocumentPaper({ doc, className }: { doc: DocumentRecord; className?: string }) {
  const muni = dataSource.getMunicipality(doc.municipalityId);
  const fy = dataSource.getFiscalYear(doc.fiscalYearId);
  const date = new Date(doc.updatedAt).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
  return (
    <article className={cn("font-serif text-[#111] leading-[1.8]", className)}>
      <p className="text-right text-[0.9em]">
        {muni?.name} {muni?.department}
      </p>
      <p className="text-right text-[0.9em]">
        作成日 {date}／対象 {fy.label}
      </p>
      <h1 className="mt-5 text-center font-sans text-[1.45em] font-bold leading-snug">{doc.title}</h1>
      <p className="mt-4 border-y border-[#b45309] py-1.5 font-sans text-[0.82em] text-[#8a3b0a]">
        【デモ】本文書はデモ用の架空データにもとづく下書きです。実在の自治体・SMOUTの実データではありません。
      </p>
      {doc.sections.map((s) => (
        <section key={s.id} className="mt-5">
          <h2 className="font-sans text-[1.08em] font-bold">{s.heading}</h2>
          {s.body.split("\n").map((line, i) => (
            <p key={i} className="mt-1 whitespace-pre-wrap">
              {line || " "}
            </p>
          ))}
        </section>
      ))}
      {doc.figures.length > 0 && (
        <section className="mt-6">
          <h2 className="font-sans text-[1.08em] font-bold">参考：引用した数値と出典</h2>
          <table className="mt-2 w-full border-collapse text-[0.85em]">
            <thead>
              <tr>
                <th className="border border-[#999] bg-[#eef2f0] px-2 py-1 text-left">項目</th>
                <th className="border border-[#999] bg-[#eef2f0] px-2 py-1 text-left">値</th>
                <th className="border border-[#999] bg-[#eef2f0] px-2 py-1 text-left">出典</th>
              </tr>
            </thead>
            <tbody>
              {doc.figures.map((f) => (
                <tr key={f.id}>
                  <td className="border border-[#999] px-2 py-1">{f.label}</td>
                  <td className="border border-[#999] px-2 py-1">{f.value}</td>
                  <td className="border border-[#999] px-2 py-1">{dataSource.getSource(f.sourceId)?.name ?? f.sourceId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </article>
  );
}

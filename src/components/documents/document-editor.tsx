"use client";

import {
  ArrowLeft,
  CircleAlert,
  CircleCheck,
  Download,
  LoaderCircle,
  Plus,
  Printer,
  Save,
  TextCursorInput,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { dataSource } from "@/lib/data/adapter";
import { FINDING_LABEL } from "@/lib/analysis/findings";
import { analyzeImprovements } from "@/lib/analysis/improvements";
import { documentToDocxBlob, safeFileName } from "@/lib/documents/docx";
import { approvalOf, CHECKLIST_ITEMS, type DocumentRecord, templateOf } from "@/lib/documents/types";
import { validateDocument } from "@/lib/documents/validate";
import { engine } from "@/lib/generation/engine";
import { useHydrated } from "@/lib/hooks";
import { saveDocument, useDocuments } from "@/lib/store/local-store";
import { cn, formatDateTime } from "@/lib/utils";
import { ApprovalFlow } from "./approval-flow";
import { DocumentPaper } from "./print-document";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function DocumentEditorPage() {
  const params = useParams<{ id: string }>();
  const docs = useDocuments();
  const hydrated = useHydrated();
  const doc = docs.find((d) => d.id === params.id);

  if (!hydrated) {
    return <div className="h-96 animate-pulse rounded-lg bg-surface-2" aria-label="読み込み中" />;
  }
  if (!doc) {
    return (
      <EmptyState
        title="文書が見つかりません"
        action={
          <ButtonLink href="/documents" size="sm">
            文書一覧へ戻る
          </ButtonLink>
        }
      >
        この文書は削除されたか、別の端末・ブラウザで作成された可能性があります。デモでは文書をこの端末のブラウザにのみ保存しています。
      </EmptyState>
    );
  }
  return <Editor key={doc.id} initial={doc} />;
}

type Pane = "data" | "edit" | "check";

function Editor({ initial }: { initial: DocumentRecord }) {
  const [draft, setDraft] = useState<DocumentRecord>(initial);
  const [dirty, setDirty] = useState(false);
  const [activeId, setActiveId] = useState(initial.sections[0]?.id ?? "");
  const [pane, setPane] = useState<Pane>("edit");
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const cursor = useRef<Record<string, number>>({});
  const areas = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const muni = dataSource.getMunicipality(draft.municipalityId);
  const fy = dataSource.getFiscalYear(draft.fiscalYearId);
  const validation = useMemo(() => validateDocument(draft), [draft]);
  const analysis = useMemo(() => analyzeImprovements(draft.municipalityId, draft.fiscalYearId), [draft.municipalityId, draft.fiscalYearId]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const update = (fn: (d: DocumentRecord) => DocumentRecord) => {
    setDraft((d) => fn(d));
    setDirty(true);
    setNotice(null);
  };

  const save = (): DocumentRecord => {
    const saved = { ...draft, updatedAt: new Date().toISOString() };
    saveDocument(saved);
    setDraft(saved);
    setDirty(false);
    setNotice(`保存しました（${formatDateTime(saved.updatedAt)}）`);
    return saved;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      save();
    }
  };

  const insert = (text: string) => {
    const target = draft.sections.find((s) => s.id === activeId) ?? draft.sections[0];
    if (!target) return;
    // 行の途中で分断しないよう、カーソルのある行の末尾に挿入する
    const raw = cursor.current[target.id] ?? target.body.length;
    const eol = target.body.indexOf("\n", raw);
    const pos = eol === -1 ? target.body.length : eol;
    const before = target.body.slice(0, pos);
    const after = target.body.slice(pos);
    const glue = before.length && !before.endsWith("\n") ? "\n" : "";
    const insertText = `${glue}${text}`;
    update((d) => ({
      ...d,
      sections: d.sections.map((s) => (s.id === target.id ? { ...s, body: before + insertText + after } : s)),
    }));
    cursor.current[target.id] = pos + insertText.length;
    setNotice(`「${target.heading}」に挿入しました`);
  };

  const focusSection = (id: string) => {
    setPane("edit");
    setActiveId(id);
    requestAnimationFrame(() => {
      const el = areas.current[id];
      el?.focus();
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const downloadDocx = async () => {
    setExporting(true);
    try {
      const saved = save();
      const blob = await documentToDocxBlob(saved);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeFileName(saved.title)}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("Word（.docx）をダウンロードしました");
    } finally {
      setExporting(false);
    }
  };

  const printPdf = () => {
    save();
    requestAnimationFrame(() => window.print());
  };

  const snippets = [
    ...analysis.evaluation.findings
      .filter((f) => f.kind === "fact" || f.kind === "hypothesis")
      .map((f) => ({ group: "施策評価", label: FINDING_LABEL[f.kind], text: f.text })),
    ...analysis.insights.findings
      .filter((f) => f.kind !== "verify")
      .map((f) => ({ group: "関心分析", label: FINDING_LABEL[f.kind], text: f.text })),
    ...analysis.measures.map((x) => ({ group: "改善施策", label: "施策案", text: `${x.title}：${x.content}` })),
  ];

  const sourcesUsed = [...new Set(draft.figures.map((f) => f.sourceId))]
    .map((id) => dataSource.getSource(id))
    .filter((s) => s !== undefined);

  const paneBtn = (p: Pane, label: string) => (
    <button
      type="button"
      onClick={() => setPane(p)}
      aria-pressed={pane === p}
      className={cn(
        "h-9 flex-1 rounded-md text-[13px] font-medium",
        pane === p ? "bg-navy text-white" : "text-fg-2 hover:bg-surface-3",
      )}
    >
      {label}
    </button>
  );

  return (
    <div onKeyDown={onKeyDown}>
      {/* 上部バー */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/documents" className="grid size-9 shrink-0 place-items-center rounded-md text-fg-2 hover:bg-surface-3" aria-label="文書一覧へ戻る">
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
          <div className="min-w-0">
            <p className="text-[12px] text-fg-3">
              {templateOf(draft.type).label}・{muni?.name}・{fy.label}
            </p>
            <p className="text-[12px] text-fg-3">
              作成：{engine.label}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-fg-3" aria-live="polite">
            {dirty ? "未保存の変更があります" : notice ?? `保存済み（${formatDateTime(draft.updatedAt)}）`}
          </span>
          <Button variant="primary" size="sm" onClick={save} disabled={!dirty}>
            <Save aria-hidden />
            保存
          </Button>
        </div>
      </div>

      <div className="mb-4 flex gap-1 rounded-lg border border-border bg-surface-2 p-1 xl:hidden" role="group" aria-label="表示切替">
        {paneBtn("data", "引用データ")}
        {paneBtn("edit", "本文の編集")}
        {paneBtn("check", "確認・出力")}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[260px_minmax(0,1fr)_300px]">
        {/* 左：引用データ */}
        <aside className={cn("space-y-4 xl:sticky xl:top-28 xl:block xl:max-h-[calc(100dvh-8rem)] xl:overflow-y-auto", pane !== "data" && "hidden")} aria-label="引用データ">
          <section className="rounded-[10px] border border-border bg-bg shadow-panel">
            <h2 className="border-b border-border px-3 py-2 text-[13px] font-bold">引用した数値</h2>
            {draft.figures.length === 0 ? (
              <p className="px-3 py-3 text-[12px] text-fg-3">数値の引用はありません。</p>
            ) : (
              <ul className="divide-y divide-border">
                {validation.figureChecks.map(({ figure, present }) => (
                  <li key={figure.id} className="px-3 py-2 text-[12px] leading-5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-fg-2">{figure.label}</span>
                      {present ? (
                        <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-accent-strong" aria-label="本文に記載あり" />
                      ) : (
                        <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-warn" aria-label="本文に見当たりません" />
                      )}
                    </div>
                    <p className="tabular font-medium text-fg">{figure.value}</p>
                    {!present && <p className="text-warn">本文から値が変更・削除されています</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-[10px] border border-border bg-bg shadow-panel">
            <h2 className="border-b border-border px-3 py-2 text-[13px] font-bold">分析結果を文書に反映</h2>
            <p className="px-3 pt-2 text-[12px] leading-5 text-fg-3">
              「挿入」で、選択中の節（{draft.sections.find((s) => s.id === activeId)?.heading ?? "—"}）のカーソル位置に追加します。
            </p>
            <ul className="divide-y divide-border">
              {snippets.map((s, i) => (
                <li key={i} className="px-3 py-2 text-[12px] leading-5">
                  <p className="text-fg-3">
                    {s.group}・{s.label}
                  </p>
                  <p className="text-fg">{s.text}</p>
                  <button
                    type="button"
                    onClick={() => insert(`・${s.text}`)}
                    className="mt-1 inline-flex h-7 items-center gap-1 rounded-md border border-border-strong px-2 text-[12px] font-medium text-fg-2 hover:bg-surface-2"
                  >
                    <TextCursorInput className="size-3.5" aria-hidden />
                    挿入
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[10px] border border-border bg-bg px-3 shadow-panel py-2.5 text-[12px] leading-5 text-fg-3">
            <h2 className="mb-1 text-[13px] font-bold text-fg">出典</h2>
            {sourcesUsed.map((s) => (
              <p key={s.id} className="mb-1">
                {s.name}（{s.provider}・更新 {s.updatedAt}）
              </p>
            ))}
            <Badge tone="warn">デモ用の架空データ</Badge>
          </section>
        </aside>

        {/* 中央：本文 */}
        <div className={cn("min-w-0 xl:block", pane !== "edit" && "hidden")}>
          <div className="rounded-[10px] border border-border bg-bg shadow-panel">
            <div className="border-b border-border px-4 py-3">
              <label htmlFor="doc-title" className="text-[12px] font-medium text-fg-3">
                文書タイトル
              </label>
              <input
                id="doc-title"
                value={draft.title}
                onChange={(e) => update((d) => ({ ...d, title: e.target.value }))}
                className="mt-1 w-full rounded-md border border-transparent px-1 py-1 text-[18px] font-bold text-fg hover:border-border focus:border-border-strong"
              />
            </div>
            <div className="divide-y divide-border">
              {draft.sections.map((s, idx) => (
                <section key={s.id} className={cn("px-4 py-4", activeId === s.id && "bg-surface-2/60")}>
                  <div className="flex items-center gap-2">
                    <label htmlFor={`h-${s.id}`} className="sr-only">
                      見出し {idx + 1}
                    </label>
                    <input
                      id={`h-${s.id}`}
                      value={s.heading}
                      onFocus={() => setActiveId(s.id)}
                      onChange={(e) =>
                        update((d) => ({ ...d, sections: d.sections.map((x) => (x.id === s.id ? { ...x, heading: e.target.value } : x)) }))
                      }
                      className="min-w-0 flex-1 rounded-md border border-transparent px-1 py-0.5 text-[15px] font-bold text-fg hover:border-border focus:border-border-strong"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`「${s.heading}」の節を削除`}
                      onClick={() => update((d) => ({ ...d, sections: d.sections.filter((x) => x.id !== s.id) }))}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                  <label htmlFor={`b-${s.id}`} className="sr-only">
                    {s.heading}の本文
                  </label>
                  <textarea
                    id={`b-${s.id}`}
                    ref={(el) => {
                      areas.current[s.id] = el;
                    }}
                    value={s.body}
                    rows={Math.max(3, s.body.split("\n").length + 1)}
                    onFocus={() => setActiveId(s.id)}
                    onSelect={(e) => {
                      cursor.current[s.id] = e.currentTarget.selectionStart;
                    }}
                    onChange={(e) => {
                      cursor.current[s.id] = e.currentTarget.selectionStart;
                      const body = e.target.value;
                      update((d) => ({ ...d, sections: d.sections.map((x) => (x.id === s.id ? { ...x, body } : x)) }));
                    }}
                    className="mt-2 min-h-24 w-full resize-y rounded-md [field-sizing:content] border border-border bg-bg px-3 py-2 text-[14px] leading-7 text-fg hover:border-border-strong focus:border-accent-strong"
                  />
                </section>
              ))}
            </div>
            <div className="border-t border-border px-4 py-3">
              <Button
                size="sm"
                onClick={() => {
                  const id = `s${Date.now()}`;
                  update((d) => ({ ...d, sections: [...d.sections, { id, heading: `${d.sections.length + 1}. 新しい節`, body: "" }] }));
                  setActiveId(id);
                }}
              >
                <Plus aria-hidden />
                節を追加
              </Button>
            </div>
          </div>
        </div>

        {/* 右：確認・出力・プレビュー */}
        <aside className={cn("xl:sticky xl:top-28 xl:block xl:max-h-[calc(100dvh-8rem)] xl:overflow-y-auto", pane !== "check" && "hidden")} aria-label="確認と出力">
          <section className="mb-4 rounded-[10px] border border-border bg-bg p-3 shadow-panel" aria-labelledby="approval-title">
            <h2 id="approval-title" className="mb-3 text-[13px] font-bold">
              確認・決裁
            </h2>
            <ApprovalFlow
              approval={approvalOf(draft)}
              ready={validation.ready}
              onChange={(approval) => {
                const saved = { ...draft, approval, updatedAt: new Date().toISOString() };
                saveDocument(saved);
                setDraft(saved);
                setDirty(false);
                setNotice("決裁の状況を保存しました");
              }}
            />
          </section>

          <section className="rounded-[10px] border border-border bg-bg p-3 shadow-panel">
            <h2 className="text-[13px] font-bold">出力</h2>
            <div className="mt-2 grid gap-2">
              <Button variant="primary" onClick={downloadDocx} disabled={exporting}>
                {exporting ? <LoaderCircle className="animate-spin" aria-hidden /> : <Download aria-hidden />}
                Word（.docx）でダウンロード
              </Button>
              <Button onClick={printPdf}>
                <Printer aria-hidden />
                印刷・PDFで保存
              </Button>
            </div>
            <p className="mt-2 text-[12px] leading-5 text-fg-3">
              出力前に自動で保存します。PDFは印刷画面で「PDFに保存」を選んでください。
            </p>
            {!validation.ready && (
              <p className="mt-2 rounded-md border border-warn-border bg-warn-soft px-2.5 py-2 text-[12px] leading-5 text-warn">
                未確認の項目が残っています。下書きとして出力できますが、提出前に確認してください。
              </p>
            )}
          </section>

          <Tabs defaultValue="check" className="mt-4 rounded-[10px] border border-border bg-bg shadow-panel">
            <TabsList className="px-2">
              <TabsTrigger value="check">検証状況</TabsTrigger>
              <TabsTrigger value="preview">プレビュー</TabsTrigger>
            </TabsList>
            <TabsContent value="check" className="space-y-4 p-3">
              <div>
                <h3 className="flex items-center justify-between text-[13px] font-bold">
                  未確認項目
                  <Badge tone={validation.placeholders.length ? "warn" : "accent"}>{validation.placeholders.length}件</Badge>
                </h3>
                {validation.placeholders.length === 0 ? (
                  <p className="mt-1 text-[12px] text-fg-3">【要確認】の記載はありません。</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {validation.placeholders.map((p, i) => (
                      <li key={i}>
                        <button
                          type="button"
                          onClick={() => focusSection(p.sectionId)}
                          className="w-full rounded-md px-2 py-1 text-left text-[12px] leading-5 text-warn hover:bg-warn-soft"
                        >
                          {p.heading}：{p.text}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="flex items-center justify-between text-[13px] font-bold">
                  数値の照合
                  <Badge tone={validation.missingFigures ? "warn" : "accent"}>
                    {validation.figureChecks.length - validation.missingFigures}/{validation.figureChecks.length}
                  </Badge>
                </h3>
                <p className="mt-1 text-[12px] leading-5 text-fg-3">
                  引用した数値が本文に元の値のまま残っているかを確認します。
                  {validation.missingFigures > 0 && <span className="text-warn">{validation.missingFigures}件が本文に見当たりません。</span>}
                </p>
              </div>
              <fieldset>
                <legend className="flex w-full items-center justify-between text-[13px] font-bold">
                  最終確認チェックリスト
                  <span className="tabular text-[12px] font-normal text-fg-3">
                    {validation.checklistDone}/{validation.checklistTotal}
                  </span>
                </legend>
                <ul className="mt-2 space-y-1.5">
                  {CHECKLIST_ITEMS.map((c) => (
                    <li key={c.id}>
                      <label className="flex items-start gap-2 text-[12px] leading-5">
                        <input
                          type="checkbox"
                          className="mt-0.5 size-4 shrink-0 accent-[var(--accent-strong)]"
                          checked={Boolean(draft.checklist[c.id])}
                          onChange={(e) => update((d) => ({ ...d, checklist: { ...d.checklist, [c.id]: e.target.checked } }))}
                        />
                        {c.label}
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            </TabsContent>
            <TabsContent value="preview" className="p-3">
              <div className="max-h-[60dvh] overflow-y-auto rounded-md border border-border bg-white p-4 shadow-[0_1px_2px_rgba(22,34,58,0.06)]">
                <DocumentPaper doc={draft} className="text-[11px]" />
              </div>
            </TabsContent>
          </Tabs>
        </aside>
      </div>

      <div className="print-only print-area" aria-hidden>
        <DocumentPaper doc={draft} />
      </div>
    </div>
  );
}

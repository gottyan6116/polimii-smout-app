"use client";

import { FileText, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { dataSource } from "@/lib/data/adapter";
import { TEMPLATES, templateOf } from "@/lib/documents/types";
import { validateDocument } from "@/lib/documents/validate";
import { useHydrated } from "@/lib/hooks";
import { deleteDocument, useDocuments, useWorkContext } from "@/lib/store/local-store";
import { formatDateTime } from "@/lib/utils";
import { CreateDocButton } from "@/components/domain/create-doc-button";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, EmptyState, PageHeader, Panel } from "@/components/ui/primitives";

export function DocumentsView() {
  const ctx = useWorkContext();
  const docs = useDocuments();
  const hydrated = useHydrated();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const muni = dataSource.getMunicipality(ctx.municipalityId)!;
  const fy = dataSource.getFiscalYear(ctx.fiscalYearId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="行政文書の作成・編集"
        description="分析結果を反映した下書きを作成し、編集・保存して Word／PDF で出力します。"
      />

      <Panel
        title="テンプレートから作成"
        description={`${muni.name}・${fy.label}のデータで下書きを作成します（対象は画面上部で変更）。`}
        bodyClassName="p-0"
      >
        <ul className="divide-y divide-border">
          {TEMPLATES.map((t) => (
            <li key={t.type} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium text-fg">{t.label}</p>
                <p className="text-[13px] text-fg-2">{t.description}</p>
                <p className="text-[12px] text-fg-3">基にする分析：{t.basedOn}</p>
              </div>
              <CreateDocButton type={t.type} label="下書きを作成" variant="secondary" size="sm" />
            </li>
          ))}
        </ul>
        <p className="border-t border-border px-4 py-2.5 text-[12px] text-fg-3">
          下書きはルールベースのデモエンジンで作成します（生成AIは使用していません）。数値はすべて画面の分析結果と同じ算出ロジックから引用します。
        </p>
      </Panel>

      <Panel title="保存済みの文書" description="この端末のブラウザ（localStorage）に保存されています。" bodyClassName="p-0">
        {!hydrated ? (
          <div className="h-24 animate-pulse bg-surface-2" aria-label="読み込み中" />
        ) : docs.length === 0 ? (
          <div className="p-4">
            <EmptyState title="保存済みの文書はありません">上のテンプレートから下書きを作成してください。</EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-[13px]">
              <thead className="bg-surface-2">
                <tr className="border-b border-border text-[12px] text-fg-3">
                  <th className="px-3 py-2 text-left font-medium" scope="col">文書</th>
                  <th className="px-3 py-2 text-left font-medium" scope="col">対象</th>
                  <th className="px-3 py-2 text-left font-medium" scope="col">確認状況</th>
                  <th className="px-3 py-2 text-left font-medium" scope="col">更新日時</th>
                  <th className="px-3 py-2 text-right font-medium" scope="col">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {docs.map((d) => {
                  const v = validateDocument(d);
                  const dm = dataSource.getMunicipality(d.municipalityId);
                  return (
                    <tr key={d.id}>
                      <td className="px-3 py-2.5">
                        <Link href={`/documents/${d.id}`} className="flex items-start gap-2 font-medium text-fg hover:underline underline-offset-4">
                          <FileText className="mt-0.5 size-4 shrink-0 text-fg-3" aria-hidden />
                          {d.title}
                        </Link>
                        <p className="pl-6 text-[12px] text-fg-3">{templateOf(d.type).label}</p>
                      </td>
                      <td className="px-3 py-2.5 text-fg-2">
                        {dm?.name}・{dataSource.getFiscalYear(d.fiscalYearId).label}
                      </td>
                      <td className="px-3 py-2.5">
                        {v.ready ? (
                          <Badge tone="accent">確認済み</Badge>
                        ) : (
                          <Badge tone="warn">要確認 {v.placeholders.length + v.missingFigures}・チェック {v.checklistDone}/{v.checklistTotal}</Badge>
                        )}
                      </td>
                      <td className="tabular px-3 py-2.5 text-fg-2">{formatDateTime(d.updatedAt)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-1.5">
                          {confirmId === d.id ? (
                            <>
                              <span className="self-center text-[12px] text-danger">削除しますか？</span>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => {
                                  deleteDocument(d.id);
                                  setConfirmId(null);
                                }}
                              >
                                削除する
                              </Button>
                              <Button size="sm" onClick={() => setConfirmId(null)}>
                                やめる
                              </Button>
                            </>
                          ) : (
                            <>
                              <ButtonLink href={`/documents/${d.id}`} size="sm">
                                開く
                              </ButtonLink>
                              <Button size="sm" variant="ghost" onClick={() => setConfirmId(d.id)} aria-label={`${d.title}を削除`}>
                                <Trash2 aria-hidden />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

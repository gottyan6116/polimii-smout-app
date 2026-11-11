import type { Metadata } from "next";
import { Suspense } from "react";
import { DocumentEditorPage } from "@/components/documents/document-editor";

export const metadata: Metadata = { title: "文書の編集" };

export default function Page() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-surface-2" aria-label="読み込み中" />}>
      <DocumentEditorPage />
    </Suspense>
  );
}

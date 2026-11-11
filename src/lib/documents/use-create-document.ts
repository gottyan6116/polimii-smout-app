"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { engine } from "../generation/engine";
import { getPlan, saveDocument, useWorkContext } from "../store/local-store";
import type { DocumentType } from "./types";

/** 現在の自治体・年度・計画内容から文書を生成し、編集画面へ移動する */
export function useCreateDocument() {
  const router = useRouter();
  const ctx = useWorkContext();
  const [pending, setPending] = useState<DocumentType | null>(null);

  const create = useCallback(
    async (type: DocumentType) => {
      setPending(type);
      try {
        const doc = await engine.generateDocument({
          type,
          municipalityId: ctx.municipalityId,
          fiscalYearId: ctx.fiscalYearId,
          plan: getPlan(ctx.municipalityId),
        });
        saveDocument(doc);
        router.push(`/documents/${doc.id}`);
      } finally {
        setPending(null);
      }
    },
    [ctx.municipalityId, ctx.fiscalYearId, router],
  );

  return { create, pending };
}

"use client";

import { FilePlus2, LoaderCircle } from "lucide-react";
import type { DocumentType } from "@/lib/documents/types";
import { useCreateDocument } from "@/lib/documents/use-create-document";
import { Button } from "@/components/ui/button";

export function CreateDocButton({
  type,
  label,
  variant = "primary",
  size = "md",
}: {
  type: DocumentType;
  label: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
}) {
  const { create, pending } = useCreateDocument();
  const busy = pending === type;
  return (
    <Button variant={variant} size={size} onClick={() => create(type)} disabled={pending !== null} aria-busy={busy}>
      {busy ? <LoaderCircle className="animate-spin" aria-hidden /> : <FilePlus2 aria-hidden />}
      {busy ? "下書きを作成中…" : label}
    </Button>
  );
}

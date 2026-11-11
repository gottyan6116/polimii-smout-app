import type { Metadata } from "next";
import { DocumentsView } from "@/components/views/documents-view";

export const metadata: Metadata = { title: "行政文書の作成・編集" };

export default function Page() {
  return <DocumentsView />;
}

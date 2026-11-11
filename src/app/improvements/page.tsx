import type { Metadata } from "next";
import { ImprovementsView } from "@/components/views/improvements-view";

export const metadata: Metadata = { title: "課題分析・改善提案" };

export default function Page() {
  return <ImprovementsView />;
}

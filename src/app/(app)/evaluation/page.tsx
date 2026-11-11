import type { Metadata } from "next";
import { EvaluationView } from "@/components/views/evaluation-view";

export const metadata: Metadata = { title: "施策評価・成果報告" };

export default function Page() {
  return <EvaluationView />;
}

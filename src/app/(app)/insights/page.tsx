import type { Metadata } from "next";
import { InsightsView } from "@/components/views/insights-view";

export const metadata: Metadata = { title: "地域・人材・関心分析" };

export default function Page() {
  return <InsightsView />;
}

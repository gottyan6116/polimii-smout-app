import type { Metadata } from "next";
import { PlanningView } from "@/components/views/planning-view";

export const metadata: Metadata = { title: "次年度の施策立案" };

export default function Page() {
  return <PlanningView />;
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 数値の横並び表示。カード型の大きなKPIではなく、区切り線で並べる */
export function StatStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 xl:grid-cols-5",
        className,
      )}
    >
      {children}
    </dl>
  );
}

export function Stat({
  label,
  value,
  sub,
  muted,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="bg-bg px-4 py-3">
      <dt className="text-[12px] font-medium text-fg-3">{label}</dt>
      <dd className={cn("tabular mt-0.5 text-[20px] font-bold leading-7", muted ? "text-fg-3 text-[15px]" : "text-fg")}>{value}</dd>
      {sub && <dd className="mt-0.5 text-[12px] leading-5 text-fg-3">{sub}</dd>}
    </div>
  );
}

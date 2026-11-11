import { CircleCheck, CircleHelp, CircleX } from "lucide-react";
import { dataSource } from "@/lib/data/adapter";
import type { SourceRef } from "@/lib/data/types";
import { FINDING_LABEL, type Finding, type FindingKind } from "@/lib/analysis/findings";
import { type Judgement, STATUS_LABEL } from "@/lib/analysis/metrics";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/primitives";

export function StatusBadge({ judgement, showReason = false }: { judgement: Judgement; showReason?: boolean }) {
  const tone = judgement.status === "achieved" ? "accent" : judgement.status === "not-achieved" ? "danger" : "neutral";
  const Icon = judgement.status === "achieved" ? CircleCheck : judgement.status === "not-achieved" ? CircleX : CircleHelp;
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <Badge tone={tone}>
        <Icon aria-hidden />
        {STATUS_LABEL[judgement.status]}
      </Badge>
      {showReason && judgement.status === "undeterminable" && (
        <span className="text-[12px] leading-4 text-fg-3">{judgement.reason}</span>
      )}
    </span>
  );
}

const KIND_ORDER: FindingKind[] = ["fact", "hypothesis", "action", "verify"];

const KIND_STYLE: Record<FindingKind, { marker: string; label: string }> = {
  fact: { marker: "bg-navy", label: "text-fg" },
  hypothesis: { marker: "bg-warn", label: "text-warn" },
  action: { marker: "bg-accent-strong", label: "text-accent-ink" },
  verify: { marker: "bg-fg-3", label: "text-fg-2" },
};

/** 分析結果を「事実／仮説／推奨／要検証」に分けて表示する */
export function FindingGroups({ findings, kinds = KIND_ORDER, compact = false }: { findings: Finding[]; kinds?: FindingKind[]; compact?: boolean }) {
  return (
    <div className={cn("grid gap-x-6 gap-y-5", !compact && "md:grid-cols-2")}>
      {kinds.map((kind) => {
        const items = findings.filter((f) => f.kind === kind);
        if (items.length === 0) return null;
        return (
          <div key={kind}>
            <h3 className={cn("mb-2 flex items-center gap-2 text-[13px] font-bold", KIND_STYLE[kind].label)}>
              <span aria-hidden className={cn("size-2 rounded-[2px]", KIND_STYLE[kind].marker)} />
              {FINDING_LABEL[kind]}
            </h3>
            <ul className="space-y-2">
              {items.map((f, i) => (
                <li key={i} className="text-[13px] leading-6 text-fg">
                  <p>{f.text}</p>
                  {f.basis && <p className="text-[12px] leading-5 text-fg-3">根拠・前提：{f.basis}</p>}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

const AVAILABILITY: Record<SourceRef["availability"], { label: string; tone: "accent" | "warn" | "neutral" }> = {
  "item-public": { label: "項目は公開情報で確認／提供方法は未確定", tone: "neutral" },
  unconfirmed: { label: "提供可否 未確認", tone: "warn" },
  municipal: { label: "自治体保有データ", tone: "neutral" },
};

export function SourceNote({ sourceIds, className }: { sourceIds: string[]; className?: string }) {
  const list = [...new Set(sourceIds)].map((id) => dataSource.getSource(id)).filter((s): s is SourceRef => Boolean(s));
  if (!list.length) return null;
  return (
    <div className={cn("space-y-1.5 text-[12px] leading-5 text-fg-3", className)}>
      {list.map((s) => (
        <p key={s.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium text-fg-2">出典：{s.name}</span>
          <span>（{s.provider}・更新 {s.updatedAt}）</span>
          <Badge tone={AVAILABILITY[s.availability].tone}>{AVAILABILITY[s.availability].label}</Badge>
          <Badge tone="warn">デモ用の架空データ</Badge>
        </p>
      ))}
    </div>
  );
}

export function AvailabilityBadge({ source }: { source: SourceRef }) {
  return <Badge tone={AVAILABILITY[source.availability].tone}>{AVAILABILITY[source.availability].label}</Badge>;
}

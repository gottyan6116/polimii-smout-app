"use client";
// avoid-ai-design-ignore-file: I3 — Check は完了した段階を示す記号として使う（装飾ではない）

import { Check, CornerUpLeft, Send } from "lucide-react";
import { useState } from "react";
import { APPROVAL_STEPS, type ApprovalEvent, type ApprovalStage, type ApprovalState } from "@/lib/documents/types";
import { cn, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ACTION_LABEL: Record<ApprovalEvent["action"], string> = {
  submit: "確認依頼",
  approve: "承認",
  return: "差し戻し",
  reopen: "修正のため起案に戻す",
};

/**
 * 庁内の確認・決裁の流れ（起案 → 係長確認 → 課長決裁 → 決裁済み）。
 * デモではこの端末内の記録として扱い、実際の決裁・文書管理システムとは連携しない。
 */
export function ApprovalFlow({
  approval,
  ready,
  onChange,
}: {
  approval: ApprovalState;
  /** 未確認項目・チェックリストが完了しているか */
  ready: boolean;
  onChange: (next: ApprovalState) => void;
}) {
  const [note, setNote] = useState("");
  const stage = approval.stage;

  const act = (action: ApprovalEvent["action"], nextStage: ApprovalStage) => {
    onChange({
      stage: nextStage,
      history: [...approval.history, { stage, action, at: new Date().toISOString(), note: note.trim() || undefined }],
    });
    setNote("");
  };

  const last = approval.history[approval.history.length - 1];

  return (
    <div>
      <ol className="flex items-start" aria-label="決裁の流れ">
        {APPROVAL_STEPS.map((s, i) => {
          const done = i < stage || (stage === 3 && i === 3);
          const current = i === stage && stage !== 3;
          return (
            <li key={s.label} className="flex min-w-0 flex-1 flex-col items-center text-center">
              <div className="flex w-full items-center">
                <span className={cn("h-px flex-1", i === 0 ? "bg-transparent" : i <= stage ? "bg-accent-strong" : "bg-border-strong")} />
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-bold",
                    done && "border-accent-strong bg-accent-strong text-white",
                    current && "border-accent-strong bg-bg text-accent-strong ring-4 ring-accent-soft",
                    !done && !current && "border-border-strong bg-bg text-fg-3",
                  )}
                  aria-current={current ? "step" : undefined}
                >
                  {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
                </span>
                <span className={cn("h-px flex-1", i === APPROVAL_STEPS.length - 1 ? "bg-transparent" : i < stage ? "bg-accent-strong" : "bg-border-strong")} />
              </div>
              <span className={cn("mt-1 text-[11px] leading-4", current ? "font-bold text-fg" : "text-fg-3")}>{s.label}</span>
              {s.role && <span className="text-[10px] leading-4 text-fg-3">{s.role}</span>}
            </li>
          );
        })}
      </ol>

      {last?.action === "return" && stage === 0 && (
        <p className="mt-3 rounded-md border border-warn-border bg-warn-soft px-2.5 py-2 text-[12px] leading-5 text-warn">
          差し戻されています{last.note ? `：${last.note}` : ""}
        </p>
      )}

      {stage < 3 && (
        <div className="mt-3 space-y-2">
          {stage > 0 && (
            <>
              <label htmlFor="approval-note" className="text-[12px] font-medium text-fg-3">
                コメント（差し戻し理由など・任意）
              </label>
              <input
                id="approval-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="h-8 w-full rounded-md border border-border-strong bg-bg px-2.5 text-[12px] hover:border-fg-3"
              />
            </>
          )}
          {stage === 0 && (
            <>
              <Button size="sm" variant="primary" className="w-full" onClick={() => act("submit", 1)}>
                <Send aria-hidden />
                係長に確認を依頼する
              </Button>
              {!ready && <p className="text-[12px] leading-5 text-warn">未確認の項目またはチェックリストが残っています。確認依頼はできますが、差し戻しの原因になります。</p>}
            </>
          )}
          {stage > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" onClick={() => act("return", 0)}>
                <CornerUpLeft aria-hidden />
                差し戻す
              </Button>
              <Button size="sm" variant="primary" onClick={() => act("approve", (stage + 1) as ApprovalStage)}>
                <Check aria-hidden />
                {stage === 1 ? "係長として承認" : "課長として決裁"}
              </Button>
            </div>
          )}
        </div>
      )}
      {stage === 3 && (
        <div className="mt-3 space-y-2">
          <p className="rounded-md bg-accent-soft px-2.5 py-2 text-[12px] font-medium text-accent-ink">決裁済みです。</p>
          <Button size="sm" className="w-full" onClick={() => act("reopen", 0)}>
            修正のため起案に戻す
          </Button>
        </div>
      )}

      {approval.history.length > 0 && (
        <details className="mt-3 text-[12px]">
          <summary className="cursor-pointer text-fg-2 hover:text-fg">履歴（{approval.history.length}件）</summary>
          <ol className="mt-2 space-y-1.5 border-l border-border pl-3">
            {[...approval.history].reverse().map((h, i) => (
              <li key={i} className="leading-5">
                <span className="font-medium text-fg">{APPROVAL_STEPS[h.stage].role || "決裁済み"}</span>
                <span className="text-fg-2">：{ACTION_LABEL[h.action]}</span>
                <span className="tabular ml-1 text-fg-3">{formatDateTime(h.at)}</span>
                {h.note && <p className="text-fg-3">「{h.note}」</p>}
              </li>
            ))}
          </ol>
        </details>
      )}
      <p className="mt-3 text-[11px] leading-4 text-fg-3">デモ：承認はこの端末内の記録です。実際の決裁システムとは連携しません。</p>
    </div>
  );
}

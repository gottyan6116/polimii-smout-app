import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ---------------- Badge ---------------- */

export type Tone = "accent" | "warn" | "danger" | "neutral" | "outline";

const tones: Record<Tone, string> = {
  accent: "bg-accent-soft text-accent-ink border-transparent",
  warn: "bg-warn-soft text-warn border-warn-border",
  danger: "bg-danger-soft text-danger border-danger-border",
  neutral: "bg-neutral-soft text-fg-2 border-transparent",
  outline: "bg-bg text-fg-2 border-border-strong",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-1.5 py-px text-[12px] font-medium leading-5 whitespace-nowrap [&_svg]:size-3.5",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---------------- Panel ---------------- */

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  id,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("min-w-0 rounded-lg border border-border bg-bg", className)} aria-labelledby={id ? `${id}-title` : undefined}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            {title && (
              <h2 id={id ? `${id}-title` : undefined} className="text-[15px] font-bold leading-6 text-fg">
                {title}
              </h2>
            )}
            {description && <p className="mt-0.5 text-[13px] leading-5 text-fg-3">{description}</p>}
          </div>
          {actions && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/* ---------------- Page header ---------------- */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-3xl">
        <h1 className="text-[22px] font-bold leading-8 text-fg">{title}</h1>
        {description && <p className="mt-1 text-sm text-fg-3">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------------- Empty state ---------------- */

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border-strong bg-surface-2 px-5 py-6">
      <p className="font-bold text-fg">{title}</p>
      {children && <div className="mt-1 max-w-prose text-[13px] text-fg-2">{children}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/* ---------------- Definition rows ---------------- */

export function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 text-[13px] leading-6">
      <dt className="w-24 shrink-0 text-fg-3">{label}</dt>
      <dd className="min-w-0 text-fg">{children}</dd>
    </div>
  );
}

/* ---------------- Native select ---------------- */

export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  className,
  hideLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  hideLabel?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={id} className={cn("text-[12px] font-medium text-fg-3", hideLabel && "sr-only")}>
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full appearance-none rounded-md border border-border-strong bg-bg pl-3 pr-8 text-sm text-fg hover:border-fg-3"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </div>
    </div>
  );
}

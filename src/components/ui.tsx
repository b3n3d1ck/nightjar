import * as React from "react";
import {
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  ArrowDownCircle,
  Info,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { Severity, FindingStatus } from "@/lib/types";
import { SEVERITY_LABEL, STATUS_LABEL } from "@/lib/types";

/* ---------------------------------------------------------------- Button -- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "btn-sm",
  md: "btn-md",
};

export function buttonClass(
  variant: ButtonVariant = "secondary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn("btn", buttonVariants[variant], buttonSizes[size], className);
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = "secondary", size = "md", className, ...rest }, ref) {
    return (
      <button ref={ref} className={buttonClass(variant, size, className)} {...rest} />
    );
  },
);

/* ------------------------------------------------------------- Surfaces -- */

export function Card({
  className,
  interactive = false,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn("nj-card", interactive && "nj-card-interactive", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  action,
  as: Heading = "h2",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <Heading
          className={cn(
            "font-semibold tracking-tight text-fg",
            Heading === "h1" ? "text-xl sm:text-2xl" : "text-base sm:text-lg",
          )}
        >
          {title}
        </Heading>
        {description ? (
          <p className="max-w-prose text-sm text-fg-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* ---------------------------------------------------------------- Badges -- */

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

export const severityMeta: Record<
  Severity,
  { icon: LucideIcon; text: string; dot: string; border: string; soft: string }
> = {
  critical: {
    icon: ShieldAlert,
    text: "text-sev-critical",
    dot: "bg-sev-critical",
    border: "border-[color-mix(in_oklab,var(--sev-critical)_40%,transparent)]",
    soft: "bg-[color-mix(in_oklab,var(--sev-critical)_14%,transparent)]",
  },
  high: {
    icon: AlertTriangle,
    text: "text-sev-high",
    dot: "bg-sev-high",
    border: "border-[color-mix(in_oklab,var(--sev-high)_40%,transparent)]",
    soft: "bg-[color-mix(in_oklab,var(--sev-high)_14%,transparent)]",
  },
  medium: {
    icon: AlertCircle,
    text: "text-sev-medium",
    dot: "bg-sev-medium",
    border: "border-[color-mix(in_oklab,var(--sev-medium)_40%,transparent)]",
    soft: "bg-[color-mix(in_oklab,var(--sev-medium)_14%,transparent)]",
  },
  low: {
    icon: ArrowDownCircle,
    text: "text-sev-low",
    dot: "bg-sev-low",
    border: "border-[color-mix(in_oklab,var(--sev-low)_40%,transparent)]",
    soft: "bg-[color-mix(in_oklab,var(--sev-low)_14%,transparent)]",
  },
  info: {
    icon: Info,
    text: "text-sev-info",
    dot: "bg-sev-info",
    border: "border-[color-mix(in_oklab,var(--sev-info)_40%,transparent)]",
    soft: "bg-[color-mix(in_oklab,var(--sev-info)_14%,transparent)]",
  },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const m = severityMeta[severity];
  const Icon = m.icon;
  return (
    <Badge className={cn(m.border, m.soft, m.text)}>
      <Icon className="size-3.5" aria-hidden />
      {SEVERITY_LABEL[severity]}
    </Badge>
  );
}

const statusStyles: Record<FindingStatus, string> = {
  open: "border-border-strong text-fg-muted",
  reviewing: "border-[color-mix(in_oklab,var(--info)_40%,transparent)] text-info",
  remediated: "border-[color-mix(in_oklab,var(--success)_40%,transparent)] text-success",
  accepted: "border-border text-fg-subtle",
};

export function StatusBadge({ status }: { status: FindingStatus }) {
  return <Badge className={statusStyles[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function DemoTag({ className }: { className?: string }) {
  return (
    <span
      title="Demonstration data — not a live scan"
      className={cn(
        "inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle",
        className,
      )}
    >
      Demo
    </span>
  );
}

/* --------------------------------------------------------------- States -- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton h-4 w-full", className)} aria-hidden />;
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <SectionHeader as="h1" title={title} description={description} action={action} />
    </div>
  );
}

export function DemoNotice({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-md border border-border bg-surface-2 px-3 py-2.5 text-sm text-fg-muted",
        className,
      )}
    >
      <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
      <p>
        <span className="font-medium text-fg">Demonstration data.</span> These
        records describe a fixed sample to show the interface — they are not the
        result of a live scan, and nothing here is an inflated metric.
      </p>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-14 text-center">
      <div className="mb-3 flex size-11 items-center justify-center rounded-lg bg-surface-2 text-fg-muted">
        <Icon className="size-5" aria-hidden />
      </div>
      <p className="font-medium text-fg">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-fg-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

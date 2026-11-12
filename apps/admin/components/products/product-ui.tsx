"use client";

import { AlertCircle, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The product workspace's card: rounded, bordered, with an optional highlight. */
export function WorkspaceCard({
  id,
  highlighted,
  className,
  children,
  ...rest
}: {
  id?: string;
  highlighted?: boolean;
  className?: string;
  children: ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-24 rounded-xl border bg-card shadow-sm transition-[box-shadow,border-color] duration-300",
        highlighted && "border-primary shadow-[0_0_0_3px_var(--primary-soft)]",
        className,
      )}
      {...rest}
    >
      {children}
    </section>
  );
}

/** A card's heading row: title and help text on the left, controls on the right. */
export function CardHead({
  title,
  description,
  badge,
  action,
  titleClassName,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  titleClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start gap-3 px-5 pt-5", className)}>
      <div className="min-w-0 flex-[1_1_260px]">
        <h2
          className={cn(
            "flex flex-wrap items-center gap-2 text-base font-bold",
            titleClassName,
          )}
        >
          {title}
          {badge}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("space-y-5 px-5 pb-5 pt-4", className)}>{children}</div>;
}

/** The accent badge used for "Needed to go live" and "Shown first". */
export function AccentBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--primary-ink)]">
      {children}
    </span>
  );
}

export function MutedBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** An inline notice. `warn` asks for action; `info` explains. */
export function Note({
  tone,
  children,
  action,
}: {
  tone: "warn" | "info";
  children: ReactNode;
  action?: ReactNode;
}) {
  const Icon = tone === "warn" ? AlertCircle : Info;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--radius)] border px-4 py-3 text-sm",
        tone === "warn"
          ? "border-[var(--warning)]/40 bg-[var(--warning-soft)]"
          : "border-primary/30 bg-[var(--primary-soft)]",
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          tone === "warn" ? "text-[var(--warning)]" : "text-[var(--primary-ink)]",
        )}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-[1_1_240px]">{children}</span>
      {action}
    </div>
  );
}

/** The dashed "add" row used for new plans and sections. */
export function AddRow({
  title,
  description,
  onClick,
  icon,
  disabled,
}: {
  title: string;
  description: string;
  onClick: () => void;
  icon: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[var(--radius)] border border-dashed border-input px-3.5 py-3 text-left transition-colors hover:border-primary hover:bg-[var(--primary-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
    >
      <span className="text-[var(--primary-ink)]">{icon}</span>
      <span>
        <span className="block text-[14.5px] font-semibold">{title}</span>
        <span className="block text-[13px] text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

/** Scrolls to and briefly highlights the card named in the URL hash. */
export function highlightTargetFromHash(): string | null {
  if (typeof window === "undefined") return null;
  const id = window.location.hash.replace(/^#/, "");
  return id || null;
}

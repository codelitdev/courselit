"use client";

import { Check, Loader2, Lock, X } from "lucide-react";
import type * as React from "react";

import { Button } from "@/components/ui/codelit/button";
import { cn } from "@/lib/utils";

// CodeLit onboarding shell — the full-screen frame a product's setup wizard runs in:
// a top bar (logo, step indicator, save status, "Finish later"), a mobile progress
// bar, a scrolling form pane with a footer for the step's buttons, and an optional
// live-preview pane that becomes a bottom sheet on phones. It holds no state: the
// product owns its steps, saving and navigation, and passes them in.
//
// Give the shell a parent with a fixed height (for example `h-dvh`).

type OnboardingStep = {
  key: string;
  label: string;
  /** Dims the step in the indicator, for a step the user chose to skip. */
  skipped?: boolean;
};

function OnboardingShell({
  logo,
  productName,
  steps,
  current,
  saveState,
  onFinishLater,
  finishLaterLabel = "Finish later",
  label = "Setup",
  footer,
  preview,
  scrollRef,
  className,
  children,
}: {
  logo: React.ReactNode;
  productName: string;
  steps: OnboardingStep[];
  /** Index into `steps` of the step on screen. */
  current: number;
  /** Shows "Saving…" or "Saved" in the top bar; leave it out before anything is saved. */
  saveState?: "saved" | "saving";
  onFinishLater?: () => void;
  finishLaterLabel?: string;
  /** Accessible name of the form pane. */
  label?: string;
  /** Usually an `OnboardingFooter`. */
  footer?: React.ReactNode;
  /** Usually an `OnboardingPreview`. Without it the form pane takes the full width. */
  preview?: React.ReactNode;
  /** The form pane's scroll container, for scrolling to the top between steps. */
  scrollRef?: React.Ref<HTMLDivElement>;
  className?: string;
  children: React.ReactNode;
}) {
  const currentLabel = steps[current]?.label ?? "";
  const percent = steps.length ? Math.round(((current + 1) / steps.length) * 100) : 0;
  return (
    <div
      data-slot="onboarding-shell"
      className={cn(
        "flex h-full min-h-0 w-full flex-col bg-background text-foreground",
        className,
      )}
    >
      <header className="grid h-16 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-6 border-b border-border bg-card px-6 max-md:h-14 max-md:grid-cols-[1fr_auto] max-md:gap-3 max-md:px-4">
        <div className="flex items-center gap-2 font-bold">
          {logo}
          <span className="max-md:hidden">{productName}</span>
        </div>
        <ol
          aria-label={`${label} progress`}
          className="flex items-center justify-center gap-2 max-md:hidden"
        >
          {steps.map((step, index) => {
            const done = index < current;
            const now = index === current;
            return (
              <li
                key={step.key}
                aria-current={now ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 text-[13px] text-muted-foreground",
                  now && "font-semibold text-foreground",
                  done && "text-foreground",
                  step.skipped && "opacity-60",
                )}
              >
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full bg-muted text-xs font-semibold",
                    done && "bg-[var(--success-soft)] text-[var(--success)]",
                    now && "bg-primary text-primary-foreground",
                  )}
                >
                  {done ? (
                    <Check aria-hidden className="size-3.5" strokeWidth={3} />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={cn("max-[1180px]:hidden", now && "max-[1180px]:inline")}
                >
                  {step.label}
                </span>
                {index < steps.length - 1 ? (
                  <span
                    aria-hidden
                    className="ml-1 h-px w-4 bg-border max-[1180px]:w-2"
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
        <div className="flex items-center justify-end gap-3">
          {saveState ? (
            <span
              role="status"
              className="flex items-center gap-1.5 text-[13px] text-muted-foreground"
            >
              {saveState === "saving" ? (
                <Loader2 aria-hidden className="size-3.5 animate-spin" />
              ) : (
                <Check aria-hidden className="size-3.5" />
              )}
              <span className="max-md:hidden">
                {saveState === "saving" ? "Saving…" : "Saved"}
              </span>
            </span>
          ) : null}
          {onFinishLater ? (
            <Button type="button" variant="ghost" size="sm" onClick={onFinishLater}>
              {finishLaterLabel}
            </Button>
          ) : null}
        </div>
      </header>

      <div
        aria-hidden
        className="flex flex-col gap-1.5 border-b border-border bg-card px-4 py-3 md:hidden"
      >
        <div className="flex justify-between text-[13px]">
          <b className="font-semibold">{currentLabel}</b>
          <span className="text-muted-foreground">
            Step {current + 1} of {steps.length}
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <i
            className="block h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div
        className={cn(
          "grid min-h-0 flex-1",
          preview && "md:grid-cols-[minmax(420px,1fr)_minmax(0,1fr)]",
        )}
      >
        <section
          aria-label={label}
          className={cn("flex min-h-0 flex-col", preview && "border-r border-border")}
        >
          {/* The pane scrolls, so its scrollbar sits on the pane's edge; the
              form stays a centred column inside it. */}
          <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col overflow-auto">
            <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col gap-6 px-12 pb-8 pt-12 max-[1180px]:px-9 max-[1180px]:pt-10 max-md:gap-5 max-md:px-4 max-md:pb-6 max-md:pt-6">
              {children}
            </div>
          </div>
          {footer}
        </section>
        {preview}
      </div>
    </div>
  );
}

/**
 * The step's buttons, pinned under the form. Put a `<span className="flex-1" />`
 * between the left-hand buttons (Back) and the right-hand ones (Skip, Continue).
 */
function OnboardingFooter({ className, ...props }: React.ComponentProps<"footer">) {
  return (
    <footer
      data-slot="onboarding-footer"
      className={cn(
        "flex shrink-0 flex-wrap items-center gap-2 border-t border-border bg-card px-12 py-3.5 max-[1180px]:px-9 max-md:px-4 max-md:py-3",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The live-preview pane. On phones it is hidden until `open`, then slides up as a
 * sheet under the top bar; give users a "Preview" button in the footer to open it.
 */
function OnboardingPreview({
  title,
  badge,
  open = false,
  onClose,
  className,
  children,
}: {
  title: string;
  badge?: React.ReactNode;
  open?: boolean;
  onClose?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      data-slot="onboarding-preview"
      className={cn(
        "flex min-h-0 flex-col gap-3 overflow-auto bg-muted/40 p-6",
        open
          ? "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:top-14 max-md:z-40 max-md:rounded-t-2xl max-md:border-t max-md:border-border max-md:bg-background max-md:p-4 max-md:shadow-2xl"
          : "max-md:hidden",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <b className="text-sm">{title}</b>
        <span className="flex items-center gap-2">
          {badge}
          {onClose ? (
            <button
              type="button"
              aria-label="Close preview"
              onClick={onClose}
              className="hidden size-9 place-items-center rounded-[var(--radius)] text-muted-foreground hover:bg-muted max-md:grid"
            >
              <X aria-hidden className="size-4" />
            </button>
          ) : null}
        </span>
      </div>
      {children}
    </section>
  );
}

/** A browser window with an address bar, for previewing a page the user is building. */
function PreviewBrowser({
  url,
  path,
  className,
  children,
}: {
  url: string;
  path?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-slot="preview-browser"
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      <div className="flex h-10 items-center gap-2 border-b border-border bg-muted/50 px-3">
        <span className="flex min-w-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-0.5 text-xs text-muted-foreground">
          <Lock aria-hidden className="size-3" />
          <b className="truncate font-semibold text-foreground">{url}</b>
          {path}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}

export type { OnboardingStep };
export { OnboardingFooter, OnboardingPreview, OnboardingShell, PreviewBrowser };

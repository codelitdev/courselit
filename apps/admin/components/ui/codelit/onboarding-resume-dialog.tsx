"use client";

import { ArrowRight, Check } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/codelit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/codelit/dialog";
import { cn } from "@/lib/utils";

// CodeLit onboarding resume dialog — offered when someone comes back to a setup
// that is part way done. Lists the steps with what is done and what comes next,
// and focuses "Continue setup". Closing it (Escape or the scrim) also continues.

type OnboardingResumeRow = {
  key: string;
  name: string;
  desc: string;
  done?: boolean;
  /** The step the user will land on. */
  next?: boolean;
};

function OnboardingResumeDialog({
  open,
  rows,
  description,
  title = "Pick up where you left off?",
  eyebrow = "Welcome back",
  continueLabel = "Continue setup",
  exitLabel = "Go to dashboard",
  onContinue,
  onExit,
  neverAgainLabel,
  onNeverAgain,
}: {
  open: boolean;
  rows: OnboardingResumeRow[];
  /** For example "You're part way through setting up Acme. Everything you entered is saved." */
  description: React.ReactNode;
  title?: string;
  eyebrow?: string;
  continueLabel?: string;
  exitLabel?: string;
  onContinue: () => void;
  onExit: () => void;
  /** With `onNeverAgain`, adds a quiet link under the buttons, such as "Never show this again". */
  neverAgainLabel?: string;
  onNeverAgain?: () => void | Promise<void>;
}) {
  const [hiding, setHiding] = React.useState(false);
  const continueRef = React.useRef<HTMLButtonElement>(null);
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onContinue())}>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={false}
        onOpenAutoFocus={(event) => {
          // Start on the main action, not the first button in the dialog.
          event.preventDefault();
          continueRef.current?.focus();
        }}
      >
        <DialogHeader>
          <span className="font-mono text-[11.5px] tracking-wide text-muted-foreground">
            {eyebrow}
          </span>
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li
              key={row.key}
              className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-card px-3 py-2.5"
            >
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground",
                  row.done && "bg-[var(--success-soft)] text-[var(--success)]",
                  row.next && "bg-[var(--primary-soft)] text-primary",
                )}
              >
                {row.done ? (
                  <Check aria-hidden className="size-3.5" strokeWidth={2.6} />
                ) : null}
                {row.next ? <ArrowRight aria-hidden className="size-3.5" /> : null}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <b className="text-sm font-semibold">{row.name}</b>
                <span className="truncate text-[13px] text-muted-foreground">
                  {row.desc}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onExit}>
            {exitLabel}
          </Button>
          <Button ref={continueRef} type="button" onClick={onContinue}>
            {continueLabel}
          </Button>
        </DialogFooter>
        {neverAgainLabel && onNeverAgain ? (
          <button
            type="button"
            className="mx-auto mt-4 block rounded-[var(--radius-sm)] text-[13px] text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:shadow-[var(--shadow-focus)] disabled:opacity-50"
            disabled={hiding}
            onClick={async () => {
              setHiding(true);
              try {
                await onNeverAgain();
              } finally {
                setHiding(false);
              }
            }}
          >
            {neverAgainLabel}
          </button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export type { OnboardingResumeRow };
export { OnboardingResumeDialog };

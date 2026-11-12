"use client";

import { ArrowRight, Check } from "lucide-react";
import { useRef, useState } from "react";
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
import { OK_SOFT, OK_TEXT } from "./ui";

export type ResumeRow = {
  key: string;
  name: string;
  desc: string;
  done: boolean;
  next: boolean;
};

/** Offered when the owner comes back to a setup that is part way done. */
export function ResumeDialog({
  open,
  schoolName,
  rows,
  onContinue,
  onDashboard,
  onNeverAgain,
}: {
  open: boolean;
  schoolName: string;
  rows: ResumeRow[];
  onContinue: () => void;
  onDashboard: () => void;
  /** Stops the prompt for this school for good; setup stays saved. */
  onNeverAgain: () => void | Promise<void>;
}) {
  const [hiding, setHiding] = useState(false);
  const continueRef = useRef<HTMLButtonElement>(null);
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
            Welcome back
          </span>
          <DialogTitle className="text-xl font-bold">
            Pick up where you left off?
          </DialogTitle>
          <DialogDescription>
            You&apos;re part way through setting up {schoolName}. Everything you entered
            is saved.
          </DialogDescription>
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
                  row.done && cn(OK_SOFT, OK_TEXT),
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
          <Button type="button" variant="outline" onClick={onDashboard}>
            Go to dashboard
          </Button>
          <Button ref={continueRef} type="button" onClick={onContinue}>
            Continue setup
          </Button>
        </DialogFooter>
        <button
          type="button"
          className="justify-self-center rounded-[var(--radius-sm)] text-[13px] text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:shadow-[var(--shadow-focus)] disabled:opacity-50"
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
          Never show this again for {schoolName}
        </button>
      </DialogContent>
    </Dialog>
  );
}

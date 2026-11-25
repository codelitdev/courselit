"use client";

import { Eye, Settings2, X } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/codelit/button";
import { type WritingSaveStatus, writingSaveStatusLabel } from "@/lib/writing-editor";

export type WritingEditorPreview = {
  /** Accessible name and tooltip, e.g. "View live blog post". */
  label: string;
  /** Opens in a new tab. */
  href?: string | null;
  /** Used instead of `href` when the link has to be made first (a preview token). */
  onClick?: () => void;
  busy?: boolean;
  /** Tooltip while there is nothing to preview yet. */
  unavailableLabel: string;
};

type WritingEditorShellProps = {
  backHref: string;
  backLabel: string;
  contextLabel: string;
  title: string;
  /** "Draft", "Published", "Live", ... */
  statusLabel: string;
  /** Said next to the status, e.g. "Unpublished changes". */
  statusNote?: string | null;
  saveStatus: WritingSaveStatus;
  preview: WritingEditorPreview;
  /** The document's own actions (publish, discard, make live), right of the save status. */
  actions: ReactNode;
  settingsTitle?: string;
  settingsOpen: boolean;
  onSettingsOpenChange: (open: boolean) => void;
  settings: ReactNode;
  children: ReactNode;
};

function PreviewButton({ preview }: { preview: WritingEditorPreview }) {
  if (preview.href) {
    return (
      <Button asChild variant="ghost" size="sm" className="px-2">
        <a
          href={preview.href}
          target="_blank"
          rel="noreferrer"
          aria-label={preview.label}
          title={preview.label}
        >
          <Eye className="size-4" />
        </a>
      </Button>
    );
  }
  const available = Boolean(preview.onClick);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="px-2"
      aria-label={available ? preview.label : preview.unavailableLabel}
      title={available ? preview.label : preview.unavailableLabel}
      disabled={!available || preview.busy}
      onClick={preview.onClick}
    >
      <Eye className="size-4" />
    </Button>
  );
}

/**
 * The full-screen writing layout (blog posts, lesson pages): a top bar with
 * the way back, the document's status and actions, a document area, and a
 * settings panel on the right.
 */
export function WritingEditorShell({
  backHref,
  backLabel,
  contextLabel,
  title,
  statusLabel,
  statusNote = null,
  saveStatus,
  preview,
  actions,
  settingsTitle = "Document settings",
  settingsOpen,
  onSettingsOpenChange,
  settings,
  children,
}: WritingEditorShellProps) {
  const [now, setNow] = useState<number | null>(null);
  const closeSettingsLabel = `Close ${settingsTitle.toLowerCase()}`;
  const openSettingsLabel = `Open ${settingsTitle.toLowerCase()}`;

  useEffect(() => {
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  // Restart the clock on every save, so "Saved just now" is right away.
  const savedAt = saveStatus.kind === "saved" ? saveStatus.at : null;
  useEffect(() => {
    if (savedAt !== null) setNow(Date.now());
  }, [savedAt]);

  return (
    <div className="flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-background">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-card px-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href={backHref}
            className="shrink-0 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            ← {backLabel}
          </Link>
          <span aria-hidden className="h-7 w-px bg-border" />
          <span className="hidden max-w-48 shrink-0 truncate text-sm text-muted-foreground sm:inline">
            {contextLabel}
          </span>
          <span aria-hidden className="hidden text-sm text-muted-foreground sm:inline">
            /
          </span>
          <span className="truncate text-sm font-semibold">{title}</span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <PreviewButton preview={preview} />
          <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
            {statusLabel}
          </span>
          {statusNote ? (
            <span className="hidden rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-800 md:inline dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              {statusNote}
            </span>
          ) : null}
          <span
            className={`hidden min-w-24 text-right text-xs lg:inline ${
              saveStatus.kind === "error" ? "text-destructive" : "text-muted-foreground"
            }`}
            aria-live="polite"
          >
            {writingSaveStatusLabel(saveStatus, now)}
          </span>
          {actions}
          <span aria-hidden className="hidden h-7 w-px bg-border sm:block" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={settingsOpen ? "bg-muted px-2" : "px-2"}
            aria-pressed={settingsOpen}
            aria-label={settingsOpen ? closeSettingsLabel : openSettingsLabel}
            title={settingsOpen ? closeSettingsLabel : openSettingsLabel}
            onClick={() => onSettingsOpenChange(!settingsOpen)}
          >
            <Settings2 className="size-4" />
          </Button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
        {settingsOpen ? (
          <>
            <button
              type="button"
              aria-label={closeSettingsLabel}
              className="absolute inset-0 z-20 bg-foreground/10 md:hidden"
              onClick={() => onSettingsOpenChange(false)}
            />
            <aside className="absolute inset-y-0 right-0 z-30 flex w-[min(20rem,calc(100vw-2rem))] flex-col border-l bg-card shadow-xl md:relative md:z-auto md:w-80 md:shadow-none">
              <div className="flex h-14 shrink-0 items-center justify-between border-b px-5">
                <h2 className="font-semibold">{settingsTitle}</h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="px-2"
                  aria-label={closeSettingsLabel}
                  onClick={() => onSettingsOpenChange(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">{settings}</div>
            </aside>
          </>
        ) : null}
      </div>
    </div>
  );
}

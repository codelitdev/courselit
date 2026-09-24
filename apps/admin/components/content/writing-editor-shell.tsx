"use client";

import { Eye, Settings2, X } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/codelit/button";
import { contentStatusLabel, type FrontLitContentStatus } from "@/lib/frontlit-content";

type WritingEditorShellProps = {
  backHref: string;
  backLabel: string;
  contextLabel: string;
  title: string;
  status: FrontLitContentStatus;
  updatedAt?: string | null;
  saving: boolean;
  publishing: boolean;
  settingsOpen: boolean;
  onSettingsOpenChange: (open: boolean) => void;
  onPublish: () => void;
  onDiscardDraft: () => void;
  previewHref?: string | null;
  settings: ReactNode;
  children: ReactNode;
};

function savedAtLabel(updatedAt: string | null | undefined, now: number | null) {
  if (!updatedAt || now === null) return "Saved";
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now - new Date(updatedAt).getTime()) / 1000),
  );
  if (elapsedSeconds < 60) return "Saved just now";
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `Saved ${elapsedMinutes}m ago`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `Saved ${elapsedHours}h ago`;
  return `Saved ${Math.floor(elapsedHours / 24)}d ago`;
}

export function WritingEditorShell({
  backHref,
  backLabel,
  contextLabel,
  title,
  status,
  updatedAt,
  saving,
  publishing,
  settingsOpen,
  onSettingsOpenChange,
  onPublish,
  onDiscardDraft,
  previewHref,
  settings,
  children,
}: WritingEditorShellProps) {
  const [now, setNow] = useState<number | null>(null);
  const hasDraftChanges = status !== "published";

  useEffect(() => {
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

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
          <span className="hidden shrink-0 text-sm text-muted-foreground sm:inline">
            {contextLabel}
          </span>
          <span aria-hidden className="hidden text-sm text-muted-foreground sm:inline">
            /
          </span>
          <span className="truncate text-sm font-semibold">{title}</span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {previewHref ? (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="px-2"
            >
              <a
                href={previewHref}
                target="_blank"
                rel="noreferrer"
                aria-label="View live blog post"
                title="View live blog post"
              >
                <Eye className="size-4" />
              </a>
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="px-2"
              aria-label="Publish this blog before viewing it"
              title="Publish this blog before viewing it"
              disabled
            >
              <Eye className="size-4" />
            </Button>
          )}
          <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
            {contentStatusLabel(status)}
          </span>
          <span
            className="hidden min-w-24 text-right text-xs text-muted-foreground lg:inline"
            aria-live="polite"
          >
            {saving ? "Saving…" : savedAtLabel(updatedAt, now)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDiscardDraft}
            disabled={publishing || saving || !hasDraftChanges}
            className="hidden sm:inline-flex"
          >
            Discard draft
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onPublish}
            disabled={publishing || saving || !hasDraftChanges}
          >
            {publishing ? "Publishing…" : "Publish changes"}
          </Button>
          <span aria-hidden className="hidden h-7 w-px bg-border sm:block" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="px-2"
            aria-label={
              settingsOpen ? "Close document settings" : "Open document settings"
            }
            title={settingsOpen ? "Close document settings" : "Open document settings"}
            onClick={() => onSettingsOpenChange(!settingsOpen)}
          >
            {settingsOpen ? <X className="size-4" /> : <Settings2 className="size-4" />}
          </Button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
        {settingsOpen ? (
          <>
            <button
              type="button"
              aria-label="Close document settings"
              className="absolute inset-0 z-20 bg-foreground/10 md:hidden"
              onClick={() => onSettingsOpenChange(false)}
            />
            <aside className="absolute inset-y-0 right-0 z-30 flex w-[min(20rem,calc(100vw-2rem))] flex-col border-l bg-card shadow-xl md:relative md:z-auto md:w-80 md:shadow-none">
              <div className="flex h-14 shrink-0 items-center justify-between border-b px-5">
                <h2 className="font-semibold">Document settings</h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="px-2"
                  aria-label="Close document settings"
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

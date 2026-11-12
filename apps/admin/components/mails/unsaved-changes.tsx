"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/codelit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/codelit/dialog";

/** Asks the browser to confirm closing or reloading the tab while edits are unsaved. */
export function useUnsavedChangesWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
}

/**
 * An editor's back button. With unsaved edits it asks first: keep editing,
 * discard them, or save and then leave.
 */
export function EditorBackButton({
  href,
  label,
  dirty,
  onSave,
  disabled,
}: {
  href: string;
  label: string;
  dirty: boolean;
  /** Saves the edits; resolves to false when saving failed. */
  onSave: () => Promise<boolean>;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveRef = useRef<HTMLButtonElement>(null);

  const leave = () => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0"
        disabled={disabled}
        onClick={() => (dirty ? setOpen(true) : leave())}
      >
        <ArrowLeft className="mr-1.5 size-4" />
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-md"
          onOpenAutoFocus={(event) => {
            // Start on the main action, not the first button.
            event.preventDefault();
            saveRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Save your changes?</DialogTitle>
            <DialogDescription>
              You&apos;ve edited this since it was last saved. Leaving now discards those
              edits.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-wrap">
            <Button
              type="button"
              variant="ghost"
              className="mr-auto text-destructive hover:text-destructive"
              onClick={leave}
            >
              Discard changes
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Keep editing
            </Button>
            <Button
              ref={saveRef}
              type="button"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  if (await onSave()) leave();
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Saving…" : "Save and exit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

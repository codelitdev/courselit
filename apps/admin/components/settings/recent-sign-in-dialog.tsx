"use client";

import { useState } from "react";
import { Button } from "@/components/ui/codelit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/codelit/dialog";

/**
 * Shown when the API asks for a recent sign-in. Signing out and back in is the
 * only way to refresh it, so it sends the admin to the sign-in page and back
 * to the page they were on.
 */
export function RecentSignInDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [working, setWorking] = useState(false);

  async function signInAgain() {
    setWorking(true);
    try {
      await fetch("/api/auth/sign-out", { method: "POST", credentials: "include" });
    } finally {
      const here = `${window.location.pathname}${window.location.search}`;
      window.location.replace(`/login?next=${encodeURIComponent(here)}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign in again to continue</DialogTitle>
          <DialogDescription>
            Changing how learners sign in needs a recent sign-in. Sign in again, then repeat the change.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={working} onClick={() => void signInAgain()}>
            Sign in again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

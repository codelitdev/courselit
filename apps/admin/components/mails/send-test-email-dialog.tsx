"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/codelit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/codelit/dialog";
import { Input } from "@/components/ui/codelit/input";
import { Label } from "@/components/ui/codelit/label";

const MAX_RECIPIENTS = 5;

function parseRecipients(value: string): string[] {
  return value
    .split(/[\s,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Sends a test of a broadcast or sequence email. Leaving the addresses empty
 * sends it to the signed-in creator. Callers should save pending edits in
 * `beforeSend`, since the test uses the saved email.
 */
export function SendTestEmailButton({
  schoolId,
  sequenceId,
  emailId,
  disabled,
  beforeSend,
  size = "sm",
}: {
  /** Omit to use the school selected in the session. */
  schoolId?: string;
  sequenceId: string;
  emailId: string;
  disabled?: boolean;
  beforeSend?: () => Promise<boolean>;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const [recipients, setRecipients] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const to = parseRecipients(recipients);
    if (to.length > MAX_RECIPIENTS) {
      setError(`Send to at most ${MAX_RECIPIENTS} addresses.`);
      return;
    }
    setSending(true);
    setError(null);
    try {
      if (beforeSend && !(await beforeSend())) {
        setError("Save your changes before sending a test.");
        return;
      }
      const response = await fetch(
        `/api/v1/school/mails/sequences/${encodeURIComponent(sequenceId)}/emails/${encodeURIComponent(emailId)}/test`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "content-type": "application/json",
            ...(schoolId ? { "x-school-id": schoolId } : {}),
          },
          body: JSON.stringify(to.length > 0 ? { to } : {}),
        },
      );
      const body = (await response.json().catch(() => null)) as {
        sent?: string[];
        message?: string;
        details?: { reason?: string };
      } | null;
      if (!response.ok) {
        throw new Error(
          response.status === 429
            ? "You've sent too many tests for now. Try again later."
            : body?.details?.reason ||
                body?.message ||
                "Unable to send the test email.",
        );
      }
      const sent = body?.sent ?? [];
      toast.success(
        sent.length > 0
          ? `Test sent to ${sent.join(", ")}`
          : "No test was sent: every address is suppressed.",
      );
      setOpen(false);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to send the test email.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size={size}
        variant="outline"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        disabled={disabled}
      >
        <Send className="size-4" />
        Send test
      </Button>
      <Dialog open={open} onOpenChange={(next) => !sending && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send a test email</DialogTitle>
            <DialogDescription>
              The test looks exactly like the real email, with “[Test]” added to the
              subject. Leave the field empty to send it to yourself.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="test-email-recipients">Send to</Label>
            <Input
              id="test-email-recipients"
              value={recipients}
              onChange={(event) => setRecipients(event.target.value)}
              placeholder="you@example.com, teammate@example.com"
              disabled={sending}
            />
            <p className="text-xs text-muted-foreground">
              Up to {MAX_RECIPIENTS} addresses, separated by commas.
            </p>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void send()} disabled={sending}>
              {sending ? "Sending…" : "Send test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

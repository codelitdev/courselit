"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Calendar, Check, Copy, Pause, RefreshCw, Send } from "lucide-react";
import { defaultEmail, EmailEditor, type Email } from "@sendlit/email-editor";
import { defaultTemplateEmail } from "@sendlit/email-blocks";
import { Button } from "@/components/ui/codelit/button";
import { CourseLitLoading, CourseLitLoadingIcon } from "@/components/loading";
import { Input } from "@/components/ui/codelit/input";
import { Label } from "@/components/ui/codelit/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/codelit/dialog";
import {
  getFutureBroadcastDeliveryDate,
  isBroadcastScheduled,
} from "@/lib/broadcast-status";

type BroadcastEmail = {
  emailId: string;
  subject: string;
  content: unknown;
  delayInMillis: number;
  published: boolean;
};

type SequenceDetail = {
  sequenceId: string;
  title?: string;
  type: "broadcast" | "sequence";
  status?: string;
  report?: { broadcast?: { lockedAt?: number | string | null } };
  emails?: BroadcastEmail[];
};

async function getResponseError(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    details?: { reason?: string };
    message?: string;
    error?: string;
  } | null;
  return body?.details?.reason || body?.message || body?.error || fallback;
}

function toLocalInputValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const MARKETING_VARIABLES = [
  { tag: "{{ subscriber.email }}", description: "Subscriber's email address" },
  { tag: "{{ subscriber.name }}", description: "Subscriber's name" },
  { tag: "{{ subscriber.tags }}", description: "Subscriber's assigned tags" },
  { tag: "{{ address }}", description: "Your school's mailing address" },
  { tag: "{{ unsubscribe_link }}", description: "Mandatory unsubscribe link" },
];

function cloneEmail(email: Email): Email {
  return JSON.parse(JSON.stringify(email)) as Email;
}

function parseEmailBody(raw: unknown): Email {
  if (!raw) return cloneEmail(defaultTemplateEmail || defaultEmail);
  if (typeof raw === "string") {
    try {
      return parseEmailBody(JSON.parse(raw));
    } catch {
      return cloneEmail(defaultTemplateEmail || defaultEmail);
    }
  }
  if (
    typeof raw === "object" &&
    raw !== null &&
    Array.isArray((raw as { content?: unknown }).content)
  ) {
    return cloneEmail(raw as Email);
  }
  return cloneEmail(defaultTemplateEmail || defaultEmail);
}

function VariableItem({ tag, description }: { tag: string; description: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(tag);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-1 rounded-md border bg-muted/40 p-2.5 text-xs transition-colors hover:bg-muted/70">
      <div className="flex items-center justify-between gap-2">
        <code className="font-mono font-semibold text-foreground">{tag}</code>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          onClick={handleCopy}
          title="Copy variable"
        >
          {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
        </Button>
      </div>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

export default function EmailBroadcastEditorPage({
  params,
}: {
  params: Promise<{ broadcastId: string }>;
}) {
  const { broadcastId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const sequenceEmailId = searchParams.get("emailId");
  const isSequenceEmailEditor = Boolean(sequenceEmailId);

  const [sequence, setSequence] = useState<SequenceDetail | null>(null);
  const [emailId, setEmailId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [emailBody, setEmailBody] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [scheduleConfirmOpen, setScheduleConfirmOpen] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState("");
  const [scheduleMinimum, setScheduleMinimum] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bodyRef = useRef<Email | null>(null);
  const subjectRef = useRef("");
  const lastSavedPayload = useRef<string>("");
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const futureDeliveryDate = getFutureBroadcastDeliveryDate(sequence);
  const isScheduledBroadcast = !isSequenceEmailEditor && isBroadcastScheduled(sequence);

  // Load sequence & email
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    subjectRef.current = "";

    async function loadData() {
      try {
        const res = await fetch(`/api/v1/school/mails/sequences/${broadcastId}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error("Unable to load broadcast.");
        }
        const data = (await res.json()) as SequenceDetail;
        if (cancelled) return;

        setSequence(data);
        let targetEmail = isSequenceEmailEditor
          ? data.emails?.find((email) => email.emailId === sequenceEmailId)
          : data.emails?.[0];
        let targetEmailId = targetEmail?.emailId ?? (targetEmail as any)?.id ?? null;

        if (isSequenceEmailEditor && !targetEmailId) {
          throw new Error("Email step not found in this sequence.");
        }

        // If no email exists in the sequence yet, create an initial email automatically
        if (!isSequenceEmailEditor && !targetEmailId) {
          try {
            const addRes = await fetch(
              `/api/v1/school/mails/sequences/${broadcastId}/emails`,
              {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  subject: data.title || "Untitled broadcast",
                }),
              },
            );
            if (addRes.ok) {
              const newEmail = (await addRes.json()) as any;
              targetEmail = newEmail;
              targetEmailId = newEmail?.emailId || newEmail?.id || null;
            }
          } catch {
            // ignore
          }
        }

        setEmailId(targetEmailId);

        const initialSubject =
          targetEmail?.subject ||
          (isSequenceEmailEditor ? "Untitled email" : data.title || "Untitled broadcast");
        subjectRef.current = initialSubject;
        setSubject(initialSubject);

        const parsedBody = parseEmailBody(targetEmail?.content);
        bodyRef.current = parsedBody;
        setEmailBody(parsedBody);
        lastSavedPayload.current = JSON.stringify({
          subject: initialSubject,
          content: parsedBody,
        });
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : isSequenceEmailEditor
                ? "Failed to load email step."
                : "Failed to load broadcast.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [broadcastId, isSequenceEmailEditor, sequenceEmailId]);

  // Save function
  const save = useCallback(
    async (manual = false): Promise<boolean> => {
      if (!isSequenceEmailEditor && isScheduledBroadcast) return false;
      if (!bodyRef.current || !emailId) return false;

      const currentSubject =
        subjectRef.current.trim() ||
        (isSequenceEmailEditor ? "Untitled email" : sequence?.title || "Untitled broadcast");
      const payloadString = JSON.stringify({
        subject: currentSubject,
        content: bodyRef.current,
      });

      if (!manual && payloadString === lastSavedPayload.current) {
        return true;
      }

      setSaving(true);
      setError(null);

      try {
        // 1. Update the email content and subject
        const emailRes = await fetch(
          `/api/v1/school/mails/sequences/${broadcastId}/emails/${emailId}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subject: currentSubject,
              content: bodyRef.current,
              ...(!isSequenceEmailEditor ? { published: true } : {}),
            }),
          },
        );

        if (!emailRes.ok) {
          throw new Error("Failed to save email content.");
        }

        // 2. Also update sequence title if changed
        if (!isSequenceEmailEditor && sequence?.title !== currentSubject) {
          await fetch(`/api/v1/school/mails/sequences/${broadcastId}`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: currentSubject }),
          });
        }

        lastSavedPayload.current = payloadString;
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2500);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save broadcast draft.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [broadcastId, emailId, isScheduledBroadcast, isSequenceEmailEditor, sequence?.title],
  );

  // Debounced auto-save on body changes
  const handleBodyChange = useCallback(
    (newEmail: Email) => {
      bodyRef.current = newEmail;
      setEmailBody(newEmail);

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        void save(false);
      }, 1000);
    },
    [save],
  );

  // Send broadcast
  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      const savedOk = await save(true);
      if (!savedOk) {
        throw new Error("Could not save changes before sending.");
      }

      if (!emailId) {
        throw new Error("This broadcast does not have an email to send.");
      }

      const emailRes = await fetch(
        `/api/v1/school/mails/sequences/${broadcastId}/emails/${emailId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ delayInMillis: Date.now(), published: true }),
        },
      );
      if (!emailRes.ok) {
        throw new Error(await getResponseError(emailRes, "Failed to prepare broadcast."));
      }

      const startRes = await fetch(`/api/v1/school/mails/sequences/${broadcastId}/start`, {
        method: "POST",
        credentials: "include",
      });

      if (!startRes.ok) {
        throw new Error(await getResponseError(startRes, "Failed to send broadcast."));
      }

      setSendConfirmOpen(false);
      router.push(`/mails/broadcasts/${encodeURIComponent(broadcastId)}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send broadcast.");
    } finally {
      setSending(false);
    }
  }

  async function handleSchedule() {
    const sendAt = new Date(scheduleDateTime).getTime();
    if (!scheduleDateTime || Number.isNaN(sendAt) || sendAt <= Date.now()) {
      setError("Choose a valid date and time in the future.");
      return;
    }
    if (!emailId) {
      setError("This broadcast does not have an email to schedule.");
      return;
    }

    setScheduling(true);
    setError(null);
    try {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      if (!(await save(true))) {
        throw new Error("Could not save changes before scheduling.");
      }

      const emailResponse = await fetch(
        `/api/v1/school/mails/sequences/${broadcastId}/emails/${emailId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ delayInMillis: sendAt, published: true }),
        },
      );
      if (!emailResponse.ok) {
        throw new Error(
          await getResponseError(emailResponse, "Unable to save the scheduled time."),
        );
      }

      const startResponse = await fetch(
        `/api/v1/school/mails/sequences/${broadcastId}/start`,
        { method: "POST", credentials: "include" },
      );
      if (!startResponse.ok) {
        throw new Error(
          await getResponseError(startResponse, "Unable to schedule this broadcast."),
        );
      }

      const startedSequence = (await startResponse.json().catch(() => null)) as
        | SequenceDetail
        | null;
      setSequence((current) =>
        current
          ? {
              ...current,
              ...startedSequence,
              status: startedSequence?.status || "active",
              emails: current.emails?.map((email, index) =>
                index === 0
                  ? { ...email, delayInMillis: sendAt, published: true }
                  : email,
              ),
            }
          : current,
      );
      setScheduleConfirmOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to schedule this broadcast.");
    } finally {
      setScheduling(false);
    }
  }

  async function handleCancelSchedule() {
    setScheduling(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/school/mails/sequences/${broadcastId}/pause`,
        { method: "POST", credentials: "include" },
      );
      if (!response.ok) {
        throw new Error(await getResponseError(response, "Unable to cancel this schedule."));
      }
      setSequence((current) => (current ? { ...current, status: "paused" } : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel this schedule.");
    } finally {
      setScheduling(false);
    }
  }

  function openScheduleDialog() {
    setError(null);
    const now = new Date();
    const firstSelectableMinute = new Date(
      (Math.floor(now.getTime() / 60_000) + 1) * 60_000,
    );
    setScheduleMinimum(toLocalInputValue(firstSelectableMinute));
    setScheduleDateTime(toLocalInputValue(new Date(now.getTime() + 60 * 60_000)));
    setScheduleConfirmOpen(true);
  }

  async function returnToSequence() {
    if (isSequenceEmailEditor && (await save(true))) {
      router.push(`/mails/sequences/${encodeURIComponent(broadcastId)}/edit`);
    }
  }

  if (loading) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background p-6">
        <CourseLitLoading
          label={isSequenceEmailEditor ? "Loading email editor…" : "Loading broadcast editor…"}
        />
      </div>
    );
  }

  if (error && !emailBody) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-4 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-destructive">Unable to open editor</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button asChild variant="outline">
            <Link
              href={
                isSequenceEmailEditor
                  ? `/mails/sequences/${encodeURIComponent(broadcastId)}/edit`
                  : `/mails/broadcasts/${encodeURIComponent(broadcastId)}/edit`
              }
            >
              <ArrowLeft className="mr-2 size-4" />
              {isSequenceEmailEditor ? "Back to sequence" : "Back to broadcast"}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
      {/* Top Header Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-card px-4">
        <div className="flex min-w-0 items-center gap-3">
          {isSequenceEmailEditor ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => void returnToSequence()}
              disabled={saving}
            >
              <ArrowLeft className="mr-1.5 size-4" />
              Sequence
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link href={`/mails/broadcasts/${encodeURIComponent(broadcastId)}/edit`}>
                <ArrowLeft className="mr-1.5 size-4" />
                Broadcast
              </Link>
            </Button>
          )}
          <div className="flex min-w-0 items-center gap-2">
            <Label htmlFor="editor-broadcast-subject" className="sr-only">
              {isSequenceEmailEditor ? "Email subject" : "Subject"}
            </Label>
            <Input
              id="editor-broadcast-subject"
              value={subject}
              onChange={(e) => {
                subjectRef.current = e.target.value;
                setSubject(e.target.value);
                if (debounceTimer.current) clearTimeout(debounceTimer.current);
                debounceTimer.current = setTimeout(() => void save(false), 1000);
              }}
              placeholder={isSequenceEmailEditor ? "Email subject line" : "Broadcast subject line"}
              className="h-8 w-64 md:w-96 text-sm font-medium"
              disabled={saving || sending || isScheduledBroadcast}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          <div
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
            role="status"
            aria-label={saving ? "Saving" : saved ? "Saved" : undefined}
          >
            {saving ? (
              <>
                <CourseLitLoadingIcon size={14} />
              </>
            ) : saved ? (
              <>
                <Check className="size-3.5 text-emerald-600" />
                <span className="font-medium text-emerald-600">Saved</span>
              </>
            ) : null}
          </div>

          {!isSequenceEmailEditor ? (
            isScheduledBroadcast ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                <Calendar className="size-4" />
                <span className="whitespace-nowrap">
                  Scheduled for {futureDeliveryDate?.toLocaleString()}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleCancelSchedule()}
                  disabled={saving || sending || scheduling}
                  className="gap-1.5"
                >
                  <Pause className="size-3.5" />
                  {scheduling ? "Canceling…" : "Cancel send"}
                </Button>
              </div>
            ) : sequence?.status === "draft" || sequence?.status === "paused" ? (
              <>
                {futureDeliveryDate ? (
                  <span className="text-xs text-amber-700" role="status">
                    Delivery time saved · not active ({futureDeliveryDate.toLocaleString()})
                  </span>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void save(true)}
                  disabled={saving || sending || scheduling}
                >
                  Save draft
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openScheduleDialog}
                  disabled={saving || sending || scheduling}
                  className="gap-1.5"
                >
                  <Calendar className="size-3.5" />
                  Schedule
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setSendConfirmOpen(true)}
                  disabled={saving || sending || scheduling}
                  className="gap-1.5"
                >
                  <Send className="size-3.5" />
                  Send now
                </Button>
              </>
            ) : null
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void save(true)}
              disabled={saving || sending || scheduling}
            >
              Save
            </Button>
          )}
        </div>
      </header>

      {error ? (
        <div className="border-b bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive">
          {error}
        </div>
      ) : null}

      {/* Main Workspace (Sidebar + Canvas) */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Variables Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto border-r bg-muted/20 p-4 md:flex">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">Variables</h2>
            <p className="text-xs text-muted-foreground">
              Click any variable to copy it to clipboard. These merge tags are replaced during
              delivery.
            </p>
          </div>

          <div className="mt-4 space-y-2.5">
            {MARKETING_VARIABLES.map((v) => (
              <VariableItem key={v.tag} tag={v.tag} description={v.description} />
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <p className="font-semibold">Compliance requirement</p>
            <p className="mt-1 text-[11px] leading-relaxed">
              Email regulations require an address and unsubscribe link in all broadcasts.
            </p>
          </div>
        </aside>

        {/* Email Editor Canvas */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-muted/10">
          {emailBody ? (
            <div
              className={isScheduledBroadcast ? "pointer-events-none opacity-80" : undefined}
              aria-disabled={isScheduledBroadcast}
              inert={isScheduledBroadcast}
            >
              <EmailEditor email={emailBody} onChange={handleBodyChange} />
            </div>
          ) : null}
        </main>
      </div>

      {/* Send Confirmation Dialog */}
      <Dialog open={sendConfirmOpen} onOpenChange={setSendConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send this broadcast?</DialogTitle>
            <DialogDescription>
              Your broadcast &ldquo;{subject || sequence?.title || "Untitled"}&rdquo; will be saved
              and sent immediately to all eligible audience contacts. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSendConfirmOpen(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending}
            >
              {sending ? "Sending…" : "Send broadcast"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={scheduleConfirmOpen}
        onOpenChange={(open) => {
          if (!scheduling) setScheduleConfirmOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule this broadcast?</DialogTitle>
            <DialogDescription>
              “{subject || sequence?.title || "Untitled"}” will be sent to eligible
              audience contacts at the selected time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="broadcast-schedule-time">Delivery date &amp; time</Label>
            <Input
              id="broadcast-schedule-time"
              type="datetime-local"
              value={scheduleDateTime}
              min={scheduleMinimum}
              onChange={(event) => setScheduleDateTime(event.target.value)}
              disabled={scheduling}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setScheduleConfirmOpen(false)}
              disabled={scheduling}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSchedule()}
              disabled={!scheduleDateTime || scheduling || saving}
            >
              {scheduling ? "Scheduling…" : "Schedule broadcast"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

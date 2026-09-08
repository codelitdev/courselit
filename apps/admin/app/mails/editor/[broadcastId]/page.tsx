"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, RefreshCw, Send } from "lucide-react";
import { defaultEmail, EmailEditor, type Email } from "@sendlit/email-editor";
import { defaultTemplateEmail } from "@sendlit/email-blocks";
import { Button } from "@/components/ui/codelit/button";
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
  emails?: BroadcastEmail[];
};

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

  const [sequence, setSequence] = useState<SequenceDetail | null>(null);
  const [emailId, setEmailId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [emailBody, setEmailBody] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bodyRef = useRef<Email | null>(null);
  const lastSavedPayload = useRef<string>("");
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Load sequence & email
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

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
        let firstEmail = data.emails?.[0];
        let targetEmailId = firstEmail?.emailId ?? (firstEmail as any)?.id ?? null;

        // If no email exists in the sequence yet, create an initial email automatically
        if (!targetEmailId) {
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
              firstEmail = newEmail;
              targetEmailId = newEmail?.emailId || newEmail?.id || null;
            }
          } catch {
            // ignore
          }
        }

        setEmailId(targetEmailId);

        const initialSubject = firstEmail?.subject || data.title || "Untitled broadcast";
        setSubject(initialSubject);

        const parsedBody = parseEmailBody(firstEmail?.content);
        bodyRef.current = parsedBody;
        setEmailBody(parsedBody);
        lastSavedPayload.current = JSON.stringify({
          subject: initialSubject,
          content: parsedBody,
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load broadcast.");
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
  }, [broadcastId]);

  // Save function
  const save = useCallback(
    async (manual = false): Promise<boolean> => {
      if (!bodyRef.current || !emailId) return false;

      const currentSubject = subject.trim() || sequence?.title || "Untitled broadcast";
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
              published: true,
            }),
          },
        );

        if (!emailRes.ok) {
          throw new Error("Failed to save email content.");
        }

        // 2. Also update sequence title if changed
        if (sequence?.title !== currentSubject) {
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
    [broadcastId, emailId, sequence?.title, subject],
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

      const startRes = await fetch(`/api/v1/school/mails/sequences/${broadcastId}/start`, {
        method: "POST",
        credentials: "include",
      });

      if (!startRes.ok) {
        throw new Error("Failed to send broadcast.");
      }

      setSendConfirmOpen(false);
      router.push("/mails?tab=broadcasts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send broadcast.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background p-6">
        <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
          <RefreshCw className="size-6 animate-spin text-primary" />
          <span>Loading broadcast editor…</span>
        </div>
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
            <Link href="/mails?tab=broadcasts">
              <ArrowLeft className="mr-2 size-4" />
              Back to Mails
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
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/mails?tab=broadcasts">
              <ArrowLeft className="mr-1.5 size-4" />
              Mails
            </Link>
          </Button>
          <div className="flex min-w-0 items-center gap-2">
            <Label htmlFor="editor-broadcast-subject" className="sr-only">
              Subject
            </Label>
            <Input
              id="editor-broadcast-subject"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                if (debounceTimer.current) clearTimeout(debounceTimer.current);
                debounceTimer.current = setTimeout(() => void save(false), 1000);
              }}
              placeholder="Broadcast subject line"
              className="h-8 w-64 md:w-96 text-sm font-medium"
              disabled={saving || sending}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {saving ? (
              <>
                <RefreshCw className="size-3.5 animate-spin text-primary" />
                <span>Saving…</span>
              </>
            ) : saved ? (
              <>
                <Check className="size-3.5 text-emerald-600" />
                <span className="font-medium text-emerald-600">Saved</span>
              </>
            ) : null}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void save(true)}
            disabled={saving || sending}
          >
            Save draft
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setSendConfirmOpen(true)}
            disabled={saving || sending}
            className="gap-1.5"
          >
            <Send className="size-3.5" />
            Send now
          </Button>
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
            <EmailEditor email={emailBody} onChange={handleBodyChange} />
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
    </div>
  );
}

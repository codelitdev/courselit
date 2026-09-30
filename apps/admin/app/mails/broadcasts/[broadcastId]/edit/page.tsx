"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, Clock3, Pencil, Pause, Send } from "lucide-react";
import { ContactFilterBuilder, EmailPreview, type ContactFilterWithAggregator, type Email } from "@sendlit/email-blocks";
import { Badge } from "@codelitdev/design-system";
import { AuthGate } from "@/components/auth-gate";
import { PageHeader } from "@/components/layout/page-header";
import { CourseLitLoading } from "@/components/loading";
import { useSetBreadcrumb } from "@/components/layout/breadcrumb-context";
import { Button } from "@/components/ui/codelit/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  getFutureBroadcastDeliveryDate,
  isBroadcastScheduled,
} from "@/lib/broadcast-status";
import { isMailingAddressRequiredError } from "@/lib/mail-errors";
import { hasSchoolPermission } from "@/lib/school-permissions";

type School = {
  id: string;
  name: string;
  permissions?: readonly string[];
  selected?: boolean;
};

type BroadcastEmail = {
  emailId: string;
  subject: string;
  content: unknown;
  delayInMillis: number;
  published: boolean;
};

type Broadcast = {
  sequenceId: string;
  title: string;
  type: string;
  status: string;
  filter?: ContactFilterWithAggregator | null;
  report?: { broadcast?: { lockedAt?: number | null } };
  emails: BroadcastEmail[];
};

type ApiErrorBody = {
  details?: { reason?: string };
  message?: string;
  error?: string;
};

type BroadcastDialog = "schedule" | "send" | "mailing-address" | null;

const EVERYONE_FILTER: ContactFilterWithAggregator = {
  aggregator: "or",
  filters: [],
};

async function responseError(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
  return body?.details?.reason || body?.message || body?.error || fallback;
}

function toLocalInputValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function getEmailContent(raw: unknown): Email | null {
  let value = raw;
  for (let depth = 0; depth < 3; depth += 1) {
    if (typeof value === "string") {
      try {
        value = JSON.parse(value);
        continue;
      } catch {
        return null;
      }
    }
    if (typeof value !== "object" || value === null) return null;
    const record = value as { content?: unknown };
    if (Array.isArray(record.content)) return value as Email;
    value = record.content;
  }
  return null;
}

export default function BroadcastDetailsPage({
  params,
}: {
  params: Promise<{ broadcastId: string }>;
}) {
  const { broadcastId } = use(params);
  const router = useRouter();
  const [school, setSchool] = useState<School | null>(null);
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  const [title, setTitle] = useState("");
  const [filter, setFilter] = useState<ContactFilterWithAggregator>(EVERYONE_FILTER);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDialog, setActiveDialog] = useState<BroadcastDialog>(null);
  const [scheduleDateTime, setScheduleDateTime] = useState("");
  const [scheduleMinimum, setScheduleMinimum] = useState("");

  const editable = broadcast?.status === "draft" || broadcast?.status === "paused";
  const canWrite = hasSchoolPermission(school, "contacts:write");
  const scheduledAt = getFutureBroadcastDeliveryDate(broadcast);
  const scheduled = isBroadcastScheduled(broadcast);
  const email = broadcast?.emails?.[0];
  const emailContent = getEmailContent(email?.content);
  const filterKey = useMemo(() => JSON.stringify(filter), [filter]);
  const titleChanged = title !== (broadcast?.title ?? "");
  const filterChanged = filterKey !== JSON.stringify(broadcast?.filter ?? EVERYONE_FILTER);
  const hasChanges = titleChanged || filterChanged;

  useSetBreadcrumb([
    { label: "Mails", href: "/mails/broadcasts" },
    { label: "Broadcasts", href: "/mails/broadcasts" },
    { label: title || "Broadcast" },
  ]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const schoolResponse = await fetch("/api/v1/schools", {
          credentials: "include",
          cache: "no-store",
        });
        if (!schoolResponse.ok) throw new Error("Unable to load school context.");
        const schoolBody = (await schoolResponse.json()) as { items?: School[] };
        const selectedSchool =
          schoolBody.items?.find((item) => item.selected) ?? schoolBody.items?.[0];
        if (!selectedSchool) throw new Error("Select a school before editing broadcasts.");
        if (cancelled) return;
        setSchool(selectedSchool);

        const response = await fetch(
          `/api/v1/school/mails/sequences/${encodeURIComponent(broadcastId)}`,
          {
            credentials: "include",
            cache: "no-store",
            headers: { "x-school-id": selectedSchool.id },
          },
        );
        if (!response.ok) throw new Error(await responseError(response, "Unable to load broadcast."));
        const data = (await response.json()) as Broadcast;
        if (cancelled) return;
        setBroadcast(data);
        setTitle(data.title || "Untitled broadcast");
        setFilter(data.filter ?? EVERYONE_FILTER);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Unable to load broadcast.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [broadcastId]);

  useEffect(() => {
    if (!school || !broadcast) return;
    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoadingRecipients(true);
      try {
        const params = new URLSearchParams({
          filter: JSON.stringify(filter),
          limit: "1",
        });
        const response = await fetch(
          `/api/v1/school/mails/subscribers?${params.toString()}`,
          {
            credentials: "include",
            cache: "no-store",
            headers: { "x-school-id": school.id },
            signal: controller.signal,
          },
        );
        if (!response.ok) throw new Error("Unable to count eligible recipients.");
        const data = (await response.json()) as { total?: number };
        if (!cancelled) setRecipientCount(typeof data.total === "number" ? data.total : 0);
      } catch {
        if (!cancelled) setRecipientCount(null);
      } finally {
        if (!cancelled) setLoadingRecipients(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [broadcast, filterKey, school, filter]);

  async function saveDetails(): Promise<boolean> {
    if (!school || !broadcast || !canWrite) return false;
    if (!hasChanges) return true;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/school/mails/sequences/${encodeURIComponent(broadcastId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "x-school-id": school.id,
          },
          body: JSON.stringify({ title: title.trim(), filter }),
        },
      );
      if (!response.ok) throw new Error(await responseError(response, "Unable to save broadcast details."));
      const updated = (await response.json()) as Broadcast;
      setBroadcast((current) => (current ? { ...current, ...updated } : updated));
      setTitle(updated.title || title.trim());
      setFilter(updated.filter ?? filter);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save broadcast details.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function startBroadcast(sendAt: number) {
    if (!school || !broadcast || !email || !canWrite) return;
    if (recipientCount === null) {
      setActiveDialog(null);
      setError("The eligible recipient count is unavailable. Try again before sending.");
      return;
    }
    if (recipientCount === 0) {
      setActiveDialog(null);
      setError("There are no eligible recipients for this audience.");
      return;
    }
    if (!(await saveDetails())) {
      setActiveDialog(null);
      return;
    }

    setWorking(true);
    setError(null);
    try {
      const emailResponse = await fetch(
        `/api/v1/school/mails/sequences/${encodeURIComponent(broadcastId)}/emails/${encodeURIComponent(email.emailId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "x-school-id": school.id,
          },
          body: JSON.stringify({ delayInMillis: sendAt, published: true }),
        },
      );
      if (!emailResponse.ok) {
        throw new Error(await responseError(emailResponse, "Unable to save the delivery time."));
      }

      setBroadcast((current) =>
        current
          ? {
              ...current,
              emails: current.emails.map((item, index) =>
                index === 0 ? { ...item, delayInMillis: sendAt, published: true } : item,
              ),
            }
          : current,
      );

      const startResponse = await fetch(
        `/api/v1/school/mails/sequences/${encodeURIComponent(broadcastId)}/start`,
        {
          method: "POST",
          credentials: "include",
          headers: { "x-school-id": school.id },
        },
      );
      if (!startResponse.ok) {
        throw new Error(await responseError(startResponse, "Unable to start this broadcast."));
      }
      const started = (await startResponse.json().catch(() => null)) as Broadcast | null;
      setBroadcast((current) =>
        current
          ? {
              ...current,
              ...started,
              status: started?.status || "active",
              emails: current.emails.map((item, index) =>
                index === 0 ? { ...item, delayInMillis: sendAt, published: true } : item,
              ),
            }
          : current,
      );
      setActiveDialog(null);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Unable to start this broadcast.";
      if (isMailingAddressRequiredError(message)) {
        setError(null);
        setActiveDialog("mailing-address");
      } else {
        setActiveDialog(null);
        setError(message);
      }
    } finally {
      setWorking(false);
    }
  }

  async function cancelSchedule() {
    if (!school || !canWrite) return;
    setWorking(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/school/mails/sequences/${encodeURIComponent(broadcastId)}/pause`,
        {
          method: "POST",
          credentials: "include",
          headers: { "x-school-id": school.id },
        },
      );
      if (!response.ok) throw new Error(await responseError(response, "Unable to cancel this send."));
      const paused = (await response.json().catch(() => null)) as Broadcast | null;
      setBroadcast((current) =>
        current ? { ...current, ...paused, status: paused?.status || "paused" } : current,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to cancel this send.");
    } finally {
      setWorking(false);
    }
  }

  function openScheduleDialog() {
    const now = new Date();
    const minimum = new Date((Math.floor(now.getTime() / 60_000) + 1) * 60_000);
    setScheduleMinimum(toLocalInputValue(minimum));
    setScheduleDateTime(toLocalInputValue(new Date(now.getTime() + 60 * 60_000)));
    setActiveDialog("schedule");
  }

  async function confirmSchedule() {
    const sendAt = new Date(scheduleDateTime).getTime();
    if (!scheduleDateTime || Number.isNaN(sendAt) || sendAt <= Date.now()) {
      setActiveDialog(null);
      setError("Choose a date and time in the future.");
      return;
    }
    await startBroadcast(sendAt);
  }

  async function openEmailEditor() {
    if (hasChanges && !(await saveDetails())) return;
    router.push(`/mails/editor/${encodeURIComponent(broadcastId)}`);
  }

  const statusLabel = broadcast?.status === "completed"
    ? "Sent"
    : scheduled
      ? "Scheduled"
      : broadcast?.status === "active"
        ? "Sending"
        : broadcast?.status === "paused"
          ? "Paused"
          : "Draft";
  const statusVariant = broadcast?.status === "completed"
    ? "success"
    : scheduled
      ? "warning"
      : broadcast?.status === "active"
        ? "default"
        : "neutral";

  return (
    <AuthGate>
      <main className="page-shell space-y-6">
        {loading ? (
          <CourseLitLoading label="Loading broadcast…" />
        ) : error && !broadcast ? (
          <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : broadcast ? (
          <>
            <PageHeader
              title={title || "Untitled broadcast"}
              description={
                <span className="flex items-center gap-2">
                  <Badge variant={statusVariant}>{statusLabel}</Badge>
                  {saved ? <span className="inline-flex items-center gap-1 text-emerald-700"><Check className="size-3.5" />Saved</span> : null}
                </span>
              }
              action={
                scheduled ? (
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock3 className="size-4" />
                    Scheduled for {scheduledAt?.toLocaleString()}
                    {canWrite ? (
                      <Button variant="outline" size="sm" onClick={() => void cancelSchedule()} disabled={working}>
                        <Pause className="mr-1.5 size-4" />
                        {working ? "Canceling…" : "Cancel send"}
                      </Button>
                    ) : null}
                  </span>
                ) : editable && canWrite ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" onClick={openScheduleDialog} disabled={saving || working || loadingRecipients || recipientCount === null || recipientCount === 0}>
                      <CalendarClock className="mr-1.5 size-4" />Schedule
                    </Button>
                    <Button onClick={() => setActiveDialog("send")} disabled={saving || working || loadingRecipients || recipientCount === null || recipientCount === 0}>
                      <Send className="mr-1.5 size-4" />Send now
                    </Button>
                  </div>
                ) : null
              }
            />

            {error ? <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div> : null}

            {scheduledAt && !scheduled ? (
              <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                {recipientCount === 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="min-w-0 flex-1">
                      Delivery time saved for {scheduledAt.toLocaleString()}, but this broadcast is not scheduled because no contacts match its audience. Nothing will be sent. Collect subscriber opt-ins or adjust the audience; Schedule and Send now unlock when recipients are available.
                    </p>
                    <Button asChild type="button" size="sm" variant="outline">
                      <Link href="/contacts">Review contacts</Link>
                    </Button>
                  </div>
                ) : recipientCount === null ? (
                  <>Delivery time saved for {scheduledAt.toLocaleString()}, but the recipient count could not be checked. Refresh and try again before scheduling.</>
                ) : (
                  <>Delivery time saved for {scheduledAt.toLocaleString()}, but the broadcast is still a draft. Choose Schedule to activate it.</>
                )}
              </div>
            ) : null}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle className="text-base">Details &amp; audience</CardTitle>
                {editable && canWrite ? (
                  <Button
                    variant="outline"
                    onClick={() => void saveDetails()}
                    disabled={!hasChanges || saving || working}
                  >
                    {saving ? "Saving…" : saved ? "Saved" : "Save"}
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="broadcast-title">Title</Label>
                  <Input
                    id="broadcast-title"
                    value={title}
                    maxLength={160}
                    onChange={(event) => setTitle(event.target.value)}
                    disabled={!editable || !canWrite || saving || working}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Audience</Label>
                  <ContactFilterBuilder
                    value={filter}
                    onChange={setFilter}
                    count={recipientCount ?? undefined}
                    countLabel="recipients"
                    disabled={!editable || !canWrite || saving || working}
                    defaultSegmentLabel="Everyone"
                  />
                  {loadingRecipients ? <p className="text-xs text-muted-foreground">Updating recipient count…</p> : null}
                  {!loadingRecipients && recipientCount === null ? <p className="text-xs text-destructive">Recipient count is unavailable. Refresh the page or try again.</p> : null}
                  {recipientCount === 0 ? (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-amber-700">
                      <p>No contacts match this audience. Broadcasts require at least one subscribed contact to activate.</p>
                      <Link href="/contacts" className="font-medium underline underline-offset-2">Review contacts</Link>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Content</CardTitle>
                  {email ? (
                    <Badge variant={email.published ? "success" : "neutral"}>
                      {email.published ? "Published" : "Not published"}
                    </Badge>
                  ) : null}
                </div>
                {email && editable && canWrite ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void openEmailEditor()}
                    disabled={saving || working}
                  >
                    <Pencil className="mr-1.5 size-4" />Edit content
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent>
                {emailContent ? (
                  <EmailPreview
                    content={emailContent}
                    minHeight="420px"
                    iframeTitle={`${title || "Broadcast"} email preview`}
                  />
                ) : (
                  <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                    No email content is available for this broadcast.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}

        <Dialog
          open={activeDialog !== null}
          onOpenChange={(open) => {
            if (!open && !working) setActiveDialog(null);
          }}
        >
          <DialogContent>
            {activeDialog === "schedule" ? (
              <>
                <DialogHeader>
                  <DialogTitle>Schedule this broadcast?</DialogTitle>
                  <DialogDescription>
                    “{title || "Untitled broadcast"}” will be sent to {recipientCount ?? "eligible"} recipients at the selected time.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-1.5 py-2">
                  <Label htmlFor="broadcast-schedule-time">Delivery date &amp; time</Label>
                  <Input
                    id="broadcast-schedule-time"
                    type="datetime-local"
                    min={scheduleMinimum}
                    value={scheduleDateTime}
                    onChange={(event) => setScheduleDateTime(event.target.value)}
                    disabled={working}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setActiveDialog(null)} disabled={working}>Cancel</Button>
                  <Button type="button" onClick={() => void confirmSchedule()} disabled={!scheduleDateTime || working || saving}>
                    {working ? "Scheduling…" : "Schedule broadcast"}
                  </Button>
                </DialogFooter>
              </>
            ) : activeDialog === "send" ? (
              <>
                <DialogHeader>
                  <DialogTitle>Send this broadcast now?</DialogTitle>
                  <DialogDescription>
                    “{title || "Untitled broadcast"}” will be sent to {recipientCount ?? "eligible"} recipients immediately. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setActiveDialog(null)} disabled={working}>Cancel</Button>
                  <Button type="button" onClick={() => void startBroadcast(Date.now())} disabled={working || saving}>
                    {working ? "Sending…" : "Send now"}
                  </Button>
                </DialogFooter>
              </>
            ) : activeDialog === "mailing-address" ? (
              <>
                <DialogHeader>
                  <DialogTitle>Add your mailing address</DialogTitle>
                  <DialogDescription>
                    Add a mailing address in Mail settings before sending this broadcast.
                    It will be included in your email footers.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveDialog(null)}
                  >
                    Not now
                  </Button>
                  <Button asChild>
                    <Link
                      href="/mails/settings"
                      onClick={() => setActiveDialog(null)}
                    >
                      Open mail settings
                    </Link>
                  </Button>
                </DialogFooter>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      </main>
    </AuthGate>
  );
}

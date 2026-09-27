"use client";

import {
  EmailPreview,
  SequenceEmailList,
  TagEditor,
  TriggerPicker,
  defaultEmail,
  type Email,
  type EmailActionType,
  type EmailTemplate,
  type SequenceEmail,
  type SystemTemplateSummary,
} from "@sendlit/email-blocks";
import { ArrowLeft, Pause, Pencil, Play, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSetBreadcrumb } from "@/components/layout/breadcrumb-context";
import { CourseLitLoading } from "@/components/loading";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/codelit/select";
import { Switch } from "@/components/ui/codelit/switch";
import { isMailingAddressRequiredError } from "@/lib/mail-errors";
import { hasSchoolPermission } from "@/lib/school-permissions";

type School = {
  id: string;
  name: string;
  permissions?: readonly string[];
  selected?: boolean;
};

type SequenceDocument = {
  sequenceId: string;
  title: string;
  type: string;
  status: string;
  triggerType: string | null;
  triggerData: string | null;
  emailsOrder: string[];
  emails: SequenceEmail[];
};

type ApiSequenceEmail = Partial<SequenceEmail> & {
  id?: string;
  emailId?: string;
  content?: unknown;
};

type ApiMailResource = {
  id?: string;
  templateId?: string;
  name?: string;
  title?: string;
  description?: string;
  content?: unknown;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ApiList<T> = { items?: T[]; data?: T[]; templates?: T[] } | T[];

const MAX_SEQUENCE_TITLE_LENGTH = 120;
const MAX_SEQUENCE_TITLE_DISPLAY_LENGTH = 80;

const DEFAULT_BLANK_TEMPLATE: SystemTemplateSummary = {
  templateId: "system:blank",
  title: "Blank",
  description: "Start with an empty email.",
  content: defaultEmail,
};

function truncateSequenceTitle(title: string): string {
  const characters = Array.from(title);
  if (characters.length <= MAX_SEQUENCE_TITLE_DISPLAY_LENGTH) return title;
  return `${characters
    .slice(0, MAX_SEQUENCE_TITLE_DISPLAY_LENGTH - 1)
    .join("")
    .trimEnd()}…`;
}

function cloneEmail(email: Email): Email {
  return JSON.parse(JSON.stringify(email)) as Email;
}

function isEmailContent(value: unknown): value is Email {
  let current = value;
  for (let depth = 0; depth < 3; depth += 1) {
    if (typeof current === "string") {
      try {
        current = JSON.parse(current);
        continue;
      } catch {
        return false;
      }
    }
    if (typeof current !== "object" || current === null) return false;
    const record = current as { content?: unknown };
    if (Array.isArray(record.content)) return true;
    current = record.content;
  }
  return false;
}

function parseEmailContent(raw: unknown): Email {
  let value = raw;
  for (let depth = 0; depth < 3; depth += 1) {
    if (typeof value === "string") {
      try {
        value = JSON.parse(value);
        continue;
      } catch {
        return cloneEmail(defaultEmail);
      }
    }
    if (typeof value !== "object" || value === null) break;
    const record = value as { content?: unknown };
    if (Array.isArray(record.content)) return cloneEmail(value as Email);
    value = record.content;
  }
  return cloneEmail(defaultEmail);
}

function getItems<T>(value: ApiList<T> | unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== "object" || value === null) return [];
  const record = value as {
    items?: unknown;
    data?: unknown;
    templates?: unknown;
  };
  for (const candidate of [record.items, record.data, record.templates]) {
    if (Array.isArray(candidate)) return candidate as T[];
  }
  return [];
}

async function getError(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    message?: string;
    details?: { reason?: string };
  } | null;
  return body?.details?.reason || body?.message || fallback;
}

function getSequenceStatusError(message: string, action: "activate" | "pause") {
  if (/no published emails/i.test(message)) {
    return {
      title: "Publish an email first",
      description:
        "Publish at least one email before activating this sequence.",
    };
  }
  return {
    title: `Unable to ${action} sequence`,
    description: `We couldn't ${action} this sequence. Please try again.`,
  };
}

async function apiRequest<T>(
  schoolId: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("x-school-id", schoolId);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
  });
  if (!response.ok) throw new Error(await getError(response, "Mail request failed."));
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function normalizeEmail(raw: ApiSequenceEmail, fallbackContent?: Email): SequenceEmail {
  const emailId = raw.emailId || raw.id || "";
  return {
    emailId,
    subject: raw.subject || "Untitled email",
    content: isEmailContent(raw.content)
      ? parseEmailContent(raw.content)
      : cloneEmail(fallbackContent || defaultEmail),
    delayInMillis: Number.isFinite(raw.delayInMillis) ? Number(raw.delayInMillis) : 0,
    published: raw.published === true,
    templateId: raw.templateId ?? null,
    actionType: raw.actionType ?? null,
    actionData: raw.actionData ?? null,
    createdAt: raw.createdAt || "",
    updatedAt: raw.updatedAt || "",
  };
}

function normalizeSequence(raw: Record<string, unknown>): SequenceDocument {
  const rawEmails = Array.isArray(raw.emails) ? (raw.emails as ApiSequenceEmail[]) : [];
  const emails = rawEmails.map((item) => normalizeEmail(item));
  const ids = emails.map((item) => item.emailId).filter(Boolean);
  const remoteOrder = Array.isArray(raw.emailsOrder)
    ? raw.emailsOrder.filter(
        (id): id is string => typeof id === "string" && ids.includes(id),
      )
    : [];
  const emailsOrder = [
    ...remoteOrder,
    ...ids.filter((id) => !remoteOrder.includes(id)),
  ];

  return {
    sequenceId: String(raw.sequenceId || raw.id || ""),
    title: typeof raw.title === "string" ? raw.title : "Untitled sequence",
    type: typeof raw.type === "string" ? raw.type : "sequence",
    status: typeof raw.status === "string" ? raw.status : "draft",
    triggerType: typeof raw.triggerType === "string" ? raw.triggerType : null,
    triggerData: typeof raw.triggerData === "string" ? raw.triggerData : null,
    emailsOrder,
    emails,
  };
}

function formatDelay(delayInMillis: number): string {
  if (delayInMillis <= 0) return "Immediately";
  const hours = delayInMillis / 3_600_000;
  if (hours % 24 === 0) return `${hours / 24} day${hours === 24 ? "" : "s"} later`;
  return `${hours} hour${hours === 1 ? "" : "s"} later`;
}

export function MailSequenceEditor({ sequenceId }: { sequenceId: string }) {
  const router = useRouter();
  const [school, setSchool] = useState<School | null>(null);
  const [sequence, setSequence] = useState<SequenceDocument | null>(null);
  const [systemTemplates, setSystemTemplates] = useState<SystemTemplateSummary[]>([
    DEFAULT_BLANK_TEMPLATE,
  ]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | undefined>();
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mailingAddressDialogOpen, setMailingAddressDialogOpen] = useState(false);
  const [sequenceStatusError, setSequenceStatusError] = useState<{
    title: string;
    description: string;
  } | null>(null);

  const sequenceRef = useRef<SequenceDocument | null>(null);
  const dirtyMetadataRef = useRef(false);
  const dirtyEmailsRef = useRef(new Set<string>());
  const revisionRef = useRef(0);
  const savingRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canWrite = hasSchoolPermission(school, "contacts:write");
  const selectedEmail = sequence?.emails.find(
    (email) => email.emailId === selectedEmailId,
  );

  useSetBreadcrumb([
    { label: "Mails", href: "/mails/broadcasts" },
    { label: "Sequences", href: "/mails/sequences" },
    { label: sequence?.title || "Sequence" },
  ]);

  function replaceSequence(next: SequenceDocument) {
    sequenceRef.current = next;
    setSequence(next);
  }

  function queueSave() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void saveChanges();
    }, 900);
  }

  function markDirty() {
    revisionRef.current += 1;
    setError(null);
    queueSave();
  }

  function updateMetadata(patch: Partial<SequenceDocument>) {
    const current = sequenceRef.current;
    if (!current || !canWrite) return;
    replaceSequence({ ...current, ...patch });
    dirtyMetadataRef.current = true;
    markDirty();
  }

  function updateEmail(emailId: string, patch: Partial<SequenceEmail>) {
    const current = sequenceRef.current;
    if (!current || !canWrite) return;
    replaceSequence({
      ...current,
      emails: current.emails.map((email) =>
        email.emailId === emailId ? { ...email, ...patch } : email,
      ),
    });
    dirtyEmailsRef.current.add(emailId);
    markDirty();
  }

  async function saveChanges(): Promise<boolean> {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const current = sequenceRef.current;
    if (!school || !current) return false;
    if (savingRef.current) return false;

    const emailIds = [...dirtyEmailsRef.current];
    const saveMetadata = dirtyMetadataRef.current;
    if (!saveMetadata && emailIds.length === 0) {
      return true;
    }

    const revision = revisionRef.current;
    const snapshot = current;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const updates: Promise<unknown>[] = [];
      if (saveMetadata) {
        const metadata: Record<string, unknown> = {
          title: snapshot.title,
          emailsOrder: snapshot.emailsOrder,
        };
        if (snapshot.triggerType !== null) {
          metadata.triggerType = snapshot.triggerType;
        }
        if (snapshot.triggerData !== null) {
          metadata.triggerData = snapshot.triggerData;
        }
        updates.push(
          apiRequest(
            school.id,
            `/api/v1/school/mails/sequences/${encodeURIComponent(sequenceId)}`,
            {
              method: "PATCH",
              body: JSON.stringify(metadata),
            },
          ),
        );
      }
      for (const emailId of emailIds) {
        const email = snapshot.emails.find((item) => item.emailId === emailId);
        if (!email) continue;
        updates.push(
          apiRequest(
            school.id,
            `/api/v1/school/mails/sequences/${encodeURIComponent(sequenceId)}/emails/${encodeURIComponent(emailId)}`,
            {
              method: "PATCH",
              body: JSON.stringify({
                subject: email.subject,
                content: email.content,
                delayInMillis: email.delayInMillis,
                published: email.published,
                ...(email.actionType
                  ? {
                      actionType: email.actionType,
                      ...(email.actionData ? { actionData: email.actionData } : {}),
                    }
                  : {}),
              }),
            },
          ),
        );
      }
      await Promise.all(updates);
      if (revision === revisionRef.current) {
        dirtyMetadataRef.current = false;
        emailIds.forEach((emailId) => dirtyEmailsRef.current.delete(emailId));
        return true;
      }
      return false;
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to save sequence changes.",
      );
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
      if (revision !== revisionRef.current) queueSave();
    }
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadingTemplates(true);
    setError(null);
    setSequence(null);
    sequenceRef.current = null;
    dirtyMetadataRef.current = false;
    dirtyEmailsRef.current.clear();
    setSelectedEmailId(undefined);

    async function load() {
      try {
        const schoolsResponse = await fetch("/api/v1/schools", {
          credentials: "include",
          cache: "no-store",
        });
        if (!schoolsResponse.ok)
          throw new Error(await getError(schoolsResponse, "Unable to load schools."));
        const schoolsBody = (await schoolsResponse.json()) as { items?: School[] };
        const selectedSchool =
          schoolsBody.items?.find((item) => item.selected) ?? schoolsBody.items?.[0];
        if (!selectedSchool)
          throw new Error("Select a school before editing sequences.");
        if (!active) return;
        setSchool(selectedSchool);

        const sequencePromise = apiRequest<Record<string, unknown>>(
          selectedSchool.id,
          `/api/v1/school/mails/sequences/${encodeURIComponent(sequenceId)}`,
        );
        const templatesPromise = apiRequest<unknown>(
          selectedSchool.id,
          "/api/v1/school/mails/templates",
        ).catch(() => null);
        const systemTemplatesPromise = apiRequest<unknown>(
          selectedSchool.id,
          "/api/v1/school/mails/system-templates",
        ).catch(() => null);
        const [rawSequence, rawTemplates, rawSystemTemplates] = await Promise.all([
          sequencePromise,
          templatesPromise,
          systemTemplatesPromise,
        ]);
        if (!active) return;

        const nextSequence = normalizeSequence(rawSequence);
        sequenceRef.current = nextSequence;
        setSequence(nextSequence);
        setSelectedEmailId(
          nextSequence.emailsOrder[0] || nextSequence.emails[0]?.emailId,
        );
        const mappedSystemTemplates = getItems<ApiMailResource>(rawSystemTemplates)
          .map((item) => ({
            templateId: item.templateId || item.id || "",
            title: item.title || item.name || "Untitled template",
            description: item.description || "",
            content: parseEmailContent(item.content),
          }))
          .filter((item) => item.templateId);
        const systemList = [
          ...mappedSystemTemplates.filter((item) => item.templateId !== "system:blank"),
          mappedSystemTemplates.find((item) => item.templateId === "system:blank") ??
            DEFAULT_BLANK_TEMPLATE,
        ];
        setSystemTemplates(systemList);

        setTemplates(
          getItems<ApiMailResource>(rawTemplates)
            .map((item) => {
              const id = item.templateId || item.id || "";
              return {
                id,
                teamId: "",
                templateId: id,
                title: item.title || item.name || "Untitled template",
                content: parseEmailContent(item.content),
                createdAt: item.createdAt || "",
                updatedAt: item.updatedAt || "",
              };
            })
            .filter((item) => item.templateId),
        );
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error ? caught.message : "Unable to load sequence.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
          setLoadingTemplates(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [sequenceId]);

  async function addEmail(templateId: string) {
    if (!school || !sequence || !canWrite) return;
    setError(null);
    try {
      const sourceTemplate =
        systemTemplates.find((template) => template.templateId === templateId) ??
        templates.find((template) => template.templateId === templateId);
      const nextDelayHours = sequence.emails.length === 0 ? 0 : 24;
      const created = await apiRequest<ApiSequenceEmail>(
        school.id,
        `/api/v1/school/mails/sequences/${encodeURIComponent(sequenceId)}/emails`,
        {
          method: "POST",
          body: JSON.stringify({
            subject: sourceTemplate?.title || "New email",
            templateId,
            delayHours: nextDelayHours,
          }),
        },
      );
      const nextEmail = normalizeEmail(created, sourceTemplate?.content);
      if (!nextEmail.emailId)
        throw new Error("Unable to create the email. Please try again.");
      const current = sequenceRef.current;
      if (!current) return;
      const nextOrder = [...current.emailsOrder, nextEmail.emailId];
      replaceSequence({
        ...current,
        emails: [...current.emails, nextEmail],
        emailsOrder: nextOrder,
      });
      setSelectedEmailId(nextEmail.emailId);
      if (!isEmailContent(created.content) && sourceTemplate?.content) {
        dirtyEmailsRef.current.add(nextEmail.emailId);
        markDirty();
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to add an email.",
      );
    }
  }

  async function deleteEmail(emailId: string) {
    if (!school || !canWrite) return;
    try {
      await apiRequest(
        school.id,
        `/api/v1/school/mails/sequences/${encodeURIComponent(sequenceId)}/emails/${encodeURIComponent(emailId)}`,
        { method: "DELETE" },
      );
      const current = sequenceRef.current;
      if (!current) return;
      const nextEmails = current.emails.filter((email) => email.emailId !== emailId);
      const nextOrder = current.emailsOrder.filter((id) => id !== emailId);
      replaceSequence({ ...current, emails: nextEmails, emailsOrder: nextOrder });
      dirtyEmailsRef.current.delete(emailId);
      if (selectedEmailId === emailId)
        setSelectedEmailId(nextOrder[0] || nextEmails[0]?.emailId);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to delete the email.",
      );
    }
  }

  async function changeSequenceStatus() {
    if (!school || !sequence || !canWrite) return;
    if (sequence.status !== "active" && !(await saveChanges())) return;
    const action = sequence.status === "active" ? "pause" : "start";
    try {
      const updated = await apiRequest<Record<string, unknown>>(
        school.id,
        `/api/v1/school/mails/sequences/${encodeURIComponent(sequenceId)}/${action}`,
        { method: "POST" },
      );
      const current = sequenceRef.current;
      if (current) {
        const next = {
          ...current,
          status: String(updated.status || (action === "start" ? "active" : "paused")),
        };
        replaceSequence(next);
      }
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Unable to update sequence status.";
      if (isMailingAddressRequiredError(message)) {
        setError(null);
        setMailingAddressDialogOpen(true);
      } else {
        setError(null);
        setSequenceStatusError(
          getSequenceStatusError(message, action === "start" ? "activate" : "pause"),
        );
      }
    }
  }

  async function editEmailContent() {
    if (!selectedEmail || !canWrite) return;
    if (!(await saveChanges())) return;
    const query = new URLSearchParams({ emailId: selectedEmail.emailId });
    router.push(
      `/mails/editor/${encodeURIComponent(sequenceId)}?${query.toString()}`,
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center bg-background p-6">
        <CourseLitLoading label="Loading sequence editor…" />
      </div>
    );
  }

  if (!sequence || (error && !school)) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-4 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-destructive">
            Unable to open sequence
          </h2>
          <p className="text-sm text-muted-foreground">
            {error || "Sequence not found."}
          </p>
          <Button asChild variant="outline">
            <Link href="/mails/sequences">
              <ArrowLeft className="mr-2 size-4" />
              Back to sequences
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col bg-background">
      {error ? (
        <div
          className="border-b bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {!canWrite ? (
        <div className="border-b bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
          You have view-only access to this sequence.
        </div>
      ) : null}

      <main className="min-w-0 flex-1">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <h1
                className="min-w-0 flex-1 truncate text-2xl font-semibold"
                title={sequence.title}
              >
                {truncateSequenceTitle(sequence.title)}
              </h1>
              <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">
                {sequence.status}
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => void changeSequenceStatus()}
              disabled={!canWrite || saving}
            >
              {sequence.status === "active" ? (
                <Pause className="size-4" />
              ) : (
                <Play className="size-4" />
              )}
              {sequence.status === "active" ? "Pause" : "Activate"}
            </Button>
          </div>

          <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Details &amp; trigger</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose when the sequence starts.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void saveChanges()}
                disabled={!canWrite || saving}
              >
                <Save className="size-4" />
                Save
              </Button>
            </div>

            <div className="grid gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="sequence-title">Title</Label>
                  <span className="text-xs text-muted-foreground" aria-live="polite">
                    {sequence.title.length}/{MAX_SEQUENCE_TITLE_LENGTH}
                  </span>
                </div>
                <Input
                  id="sequence-title"
                  value={sequence.title}
                  maxLength={MAX_SEQUENCE_TITLE_LENGTH}
                  onChange={(event) => updateMetadata({ title: event.target.value })}
                  placeholder="Sequence name"
                  disabled={!canWrite}
                />
              </div>
              <div className="space-y-1.5">
                <TriggerPicker
                  triggerType={sequence.triggerType}
                  triggerData={sequence.triggerData}
                  onChange={(value) =>
                    updateMetadata({
                      triggerType: value.triggerType || null,
                      triggerData: value.triggerData || null,
                    })
                  }
                />
              </div>
            </div>

          </section>

          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <section className="min-w-0 space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">Emails</h2>
              {canWrite ? (
                <div className={saving ? "pointer-events-none opacity-60" : undefined}>
                  <SequenceEmailList
                    emails={sequence.emails}
                    emailsOrder={sequence.emailsOrder}
                    selectedEmailId={selectedEmailId}
                    onSelect={setSelectedEmailId}
                    onAdd={(templateId) => void addEmail(templateId)}
                    onDelete={(emailId) => void deleteEmail(emailId)}
                    onReorder={(emailsOrder) => updateMetadata({ emailsOrder })}
                    systemTemplates={systemTemplates}
                    templates={templates}
                    templatesLoading={loadingTemplates}
                    addButtonLabel="Add email"
                    dialogTitle="Choose an email template"
                    dialogDescription="Choose a template, then customize the email in the editor."
                    emptyMessage="Add an email to begin building this sequence."
                    formatDelay={formatDelay}
                    className="min-h-64"
                  />
                </div>
              ) : sequence.emails.length ? (
                <div className="space-y-2">
                  {sequence.emails.map((email) => (
                    <button
                      key={email.emailId}
                      type="button"
                      className="w-full rounded-lg border bg-card p-3 text-left"
                      onClick={() => setSelectedEmailId(email.emailId)}
                    >
                      <span className="block truncate text-sm font-medium">
                        {email.subject}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {formatDelay(email.delayInMillis)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
                  No emails.
                </p>
              )}
            </section>

            <section className="min-w-0 rounded-xl border bg-card shadow-sm">
              {selectedEmail ? (
                <>
                  <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                    <h2 className="text-base font-semibold">Edit email</h2>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void saveChanges()}
                      disabled={!canWrite || saving}
                    >
                      <Save className="size-4" />
                      Save
                    </Button>
                  </div>
                  <div className="space-y-5 p-4 sm:p-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="sequence-email-subject">Subject</Label>
                        <Input
                          id="sequence-email-subject"
                          value={selectedEmail.subject}
                          onChange={(event) =>
                            updateEmail(selectedEmail.emailId, {
                              subject: event.target.value,
                            })
                          }
                          placeholder="Your subject line"
                          disabled={!canWrite}
                        />
                      </div>
                      <div className="flex items-center gap-3 sm:justify-end">
                        <Label htmlFor="sequence-email-published">Published</Label>
                        <Switch
                          id="sequence-email-published"
                          checked={selectedEmail.published}
                          onCheckedChange={(published) =>
                            updateEmail(selectedEmail.emailId, { published })
                          }
                          disabled={!canWrite}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="sequence-email-delay">Send after (days)</Label>
                        <Input
                          id="sequence-email-delay"
                          type="number"
                          min={0}
                          step={0.25}
                          value={Number((selectedEmail.delayInMillis / 86_400_000).toFixed(2))}
                          onChange={(event) => {
                            const days = Math.max(0, Number(event.target.value) || 0);
                            updateEmail(selectedEmail.emailId, {
                              delayInMillis: days * 86_400_000,
                            });
                          }}
                          disabled={!canWrite}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>On send, tag contact</Label>
                        <Select
                          value={selectedEmail.actionType || "none"}
                          onValueChange={(value) =>
                            updateEmail(selectedEmail.emailId, {
                              actionType:
                                value === "none" ? null : (value as EmailActionType),
                            })
                          }
                          disabled={!canWrite}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No action</SelectItem>
                            <SelectItem value="tag:add">Add tag</SelectItem>
                            <SelectItem value="tag:remove">Remove tag</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {selectedEmail.actionType ? (
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label>Tag name</Label>
                          <TagEditor
                            aria-label="Tag name"
                            tags={
                              typeof selectedEmail.actionData?.tag === "string"
                                ? [selectedEmail.actionData.tag]
                                : []
                            }
                            onAdd={(tag) =>
                              updateEmail(selectedEmail.emailId, {
                                actionData: { tag },
                              })
                            }
                            onRemove={() =>
                              updateEmail(selectedEmail.emailId, { actionData: {} })
                            }
                          />
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-2 border-t pt-4">
                      <div className="flex items-center justify-between gap-3">
                        <Label>Content</Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void editEmailContent()}
                          disabled={!canWrite || saving}
                        >
                          <Pencil className="size-4" />
                          Edit content
                        </Button>
                      </div>
                      <EmailPreview
                        content={selectedEmail.content}
                        className="w-full"
                        minHeight="420px"
                        iframeTitle={`${selectedEmail.subject} preview`}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex min-h-72 items-center justify-center p-8 text-center">
                  <div className="max-w-sm space-y-2">
                    <h2 className="text-lg font-semibold">Build your sequence</h2>
                    <p className="text-sm text-muted-foreground">
                      Add an email to the sequence, then select it here to edit its
                      settings and content.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <Dialog
        open={mailingAddressDialogOpen}
        onOpenChange={setMailingAddressDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add your mailing address</DialogTitle>
            <DialogDescription>
              Add a mailing address in Mail settings before activating this sequence.
              It will be included in your email footers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMailingAddressDialogOpen(false)}
            >
              Not now
            </Button>
            <Button asChild>
              <Link
                href="/mails/settings"
                onClick={() => setMailingAddressDialogOpen(false)}
              >
                Open mail settings
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(sequenceStatusError)}
        onOpenChange={(open) => {
          if (!open) setSequenceStatusError(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{sequenceStatusError?.title}</DialogTitle>
            <DialogDescription>{sequenceStatusError?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => setSequenceStatusError(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

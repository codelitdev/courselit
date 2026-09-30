"use client";

import {
  Clock,
  Copy,
  Edit2,
  FileText,
  Layers,
  Mail,
  Pause,
  Play,
  Plus,
  Radio,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EmailPreview,
  TemplateChooser,
  type EmailTemplate as ChooserEmailTemplate,
  type SystemTemplateSummary,
  defaultTemplateEmail,
} from "@sendlit/email-blocks";
import type { Email } from "@sendlit/email-editor";
import { BUILTIN_SYSTEM_TEMPLATES } from "@/lib/system-email-templates";
import { AuthGate } from "@/components/auth-gate";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@codelitdev/design-system";
import { CourseLitLoading } from "@/components/loading";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/codelit/textarea";
import { hasSchoolPermission } from "@/lib/school-permissions";
import {
  getBroadcastSentAt,
  getFutureBroadcastDeliveryDate,
  isBroadcastScheduled,
} from "@/lib/broadcast-status";

type School = {
  id: string;
  name: string;
  subdomain: string;
  permissions?: readonly string[];
  selected?: boolean;
};

type BroadcastEmail = {
  emailId: string;
  subject: string;
  content?: unknown;
  delayInMillis: number;
  published: boolean;
};

type BroadcastItem = {
  sequenceId: string;
  id?: string;
  title?: string;
  type: "broadcast" | "sequence";
  status?: "draft" | "active" | "paused" | "completed" | string;
  templateId?: string;
  emails?: BroadcastEmail[];
  entrantsCount?: number;
  report?: { broadcast?: { lockedAt?: number | null; sentAt?: number | string | null } };
  updatedAt?: string;
};

type SequenceItem = {
  id?: string;
  sequenceId?: string;
  title?: string;
  status: "active" | "draft" | "paused";
  type: string;
  emailsCount?: number;
  entrantsCount?: number;
  createdAt?: string;
};

type TemplateItem = {
  id: string;
  name: string;
  templateId?: string;
  title?: string;
  subject?: string;
  updatedAt?: string;
  content?: Email | null;
};

const MAILS_TABS = ["broadcasts", "sequences", "templates"] as const;
type MailsTab = (typeof MAILS_TABS)[number];

const MAIL_TABLE_CLASS = "w-full min-w-[720px] border-collapse text-left text-sm";
const MAIL_TABLE_HEAD_CLASS = "border-b bg-muted/40 text-xs text-muted-foreground";
const MAIL_TABLE_HEADING_CLASS = "px-4 py-3 font-medium";
const MAIL_TABLE_ROW_CLASS =
  "border-b border-border transition-colors hover:bg-muted/30";
const MAIL_TABLE_CELL_CLASS = "px-4 py-3 align-middle";

function isMailsTab(value: string): value is MailsTab {
  return MAILS_TABS.includes(value as MailsTab);
}

function getBroadcastStatus(broadcast: BroadcastItem): {
  label: "Draft" | "Scheduled" | "Sending" | "Sent";
  variant: "neutral" | "warning" | "default" | "success";
  scheduledAt?: Date;
  scheduleNote?: string;
} {
  const deliveryDate = getFutureBroadcastDeliveryDate(broadcast);
  const sequenceStatus = String(broadcast.status ?? "").toLowerCase();

  if (sequenceStatus === "completed") {
    return {
      label: "Sent",
      variant: "success",
    };
  }
  if (sequenceStatus === "active") {
    if (isBroadcastScheduled(broadcast)) {
      return {
        label: "Scheduled",
        variant: "warning",
        scheduledAt: deliveryDate ?? undefined,
      };
    }
    return {
      label: "Sending",
      variant: "default",
    };
  }
  return {
    label: "Draft",
    variant: "neutral",
    ...(deliveryDate
      ? {
          scheduledAt: deliveryDate,
          scheduleNote: "Delivery time saved · not active",
        }
      : {}),
  };
}

async function getResponseError(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    details?: { reason?: string };
    message?: string;
    error?: string;
  } | null;
  return body?.details?.reason || body?.message || body?.error || fallback;
}

export default function MailsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const pathTab = pathname.split("/")[2] ?? "broadcasts";
  const selectedTab = isMailsTab(pathTab)
    ? pathTab
    : "broadcasts";
  const pageDetails = {
    broadcasts: {
      title: "Broadcasts",
      description: "One-time emails sent immediately or scheduled for later delivery.",
    },
    sequences: {
      title: "Sequences",
      description: "Automated email campaigns triggered by contact activity.",
    },
    templates: {
      title: "Templates",
      description: "Custom layouts and reusable branded marketing email templates.",
    },
  }[selectedTab];

  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Broadcasts state
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
  const [newBroadcastOpen, setNewBroadcastOpen] = useState(false);
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("system:blank");
  const [selectedTemplateTitle, setSelectedTemplateTitle] = useState("Blank");
  const [systemTemplates, setSystemTemplates] = useState<SystemTemplateSummary[]>(
    BUILTIN_SYSTEM_TEMPLATES,
  );
  const [savingBroadcast, setSavingBroadcast] = useState(false);
  const [broadcastToDelete, setBroadcastToDelete] = useState<BroadcastItem | null>(null);
  const [deletingBroadcast, setDeletingBroadcast] = useState(false);
  const [broadcastDeleteError, setBroadcastDeleteError] = useState<string | null>(null);

  // Sequences state
  const [sequences, setSequences] = useState<SequenceItem[]>([]);
  const [newSequenceOpen, setNewSequenceOpen] = useState(false);
  const [sequenceTitle, setSequenceTitle] = useState("");
  const [savingSequence, setSavingSequence] = useState(false);

  // Templates state
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [templateToDelete, setTemplateToDelete] = useState<TemplateItem | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState(false);
  const [templateDeleteError, setTemplateDeleteError] = useState<string | null>(null);
  const [newTemplateOpen, setNewTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateSubject, setTemplateSubject] = useState("");
  const [selectedNewTemplateId, setSelectedNewTemplateId] = useState("system:blank");
  const [selectedNewTemplateTitle, setSelectedNewTemplateTitle] = useState("Blank");
  const [savingTemplate, setSavingTemplate] = useState(false);

  const canWriteMails = hasSchoolPermission(school, "contacts:write");

  useEffect(() => {
    if (pathname === "/mails") {
      router.replace("/mails/broadcasts", { scroll: false });
    }
  }, [pathname, router]);

  const loadTabData = useCallback(async (selectedSchool: School, tab: MailsTab) => {
    setLoading(true);
    setError(null);
    const headers = { "x-school-id": selectedSchool.id };
    try {
      if (tab === "broadcasts") {
        const [res, tmplRes, sysTmplRes] = await Promise.all([
          fetch("/api/v1/school/mails/sequences?type=broadcast", {
            credentials: "include",
            cache: "no-store",
            headers,
          }),
          fetch("/api/v1/school/mails/templates", {
            credentials: "include",
            cache: "no-store",
            headers,
          }).catch(() => null),
          fetch("/api/v1/school/mails/system-templates", {
            credentials: "include",
            cache: "no-store",
            headers,
          }).catch(() => null),
        ]);
        if (res.ok) {
          const data = await res.json();
          const rawItems: any[] = Array.isArray(data)
            ? data
            : Array.isArray(data?.items)
              ? data.items
              : Array.isArray(data?.sequences)
                ? data.sequences
                : Array.isArray(data?.data)
                  ? data.data
                  : [];
          const normalizedBroadcasts: BroadcastItem[] = rawItems.map((item) => ({
            ...item,
            sequenceId: item.sequenceId || item.id || "",
            id: item.id || item.sequenceId || "",
            title: item.title || "Untitled broadcast",
            type: item.type || "broadcast",
            status: item.status || "draft",
            emails: Array.isArray(item.emails)
              ? item.emails.map((e: any) => ({
                  ...e,
                  emailId: e.emailId || e.id || "",
                }))
              : [],
            entrantsCount:
              typeof item.entrantsCount === "number"
                ? item.entrantsCount
                : Array.isArray(item.entrants)
                  ? item.entrants.length
                  : 0,
          }));
          setBroadcasts(normalizedBroadcasts);
        } else {
          const errData = await res.json().catch(() => null);
          setError(
            errData?.details?.reason || errData?.message || "Failed to load broadcasts",
          );
          setBroadcasts([]);
        }
        if (tmplRes && tmplRes.ok) {
          const tmplData = await tmplRes.json();
          const rawTmpls: any[] = Array.isArray(tmplData)
            ? tmplData
            : Array.isArray(tmplData?.items)
              ? tmplData.items
              : Array.isArray(tmplData?.templates)
                ? tmplData.templates
                : Array.isArray(tmplData?.data)
                  ? tmplData.data
                  : [];
          setTemplates(
            rawTmpls.map((item) => ({
              ...item,
              templateId: item.templateId || item.id || "",
              id: item.id || item.templateId || "",
              title: item.title || item.name || "Untitled Template",
              name: item.name || item.title || "Untitled Template",
            })),
          );
        }
        if (sysTmplRes && sysTmplRes.ok) {
          const sysData = (await sysTmplRes.json()) as {
            items?: Array<{ templateId: string; title: string; content: unknown }>;
          };
          if (sysData.items && sysData.items.length > 0) {
            setSystemTemplates(
              sysData.items.map((item) => ({
                templateId: item.templateId,
                title: item.title,
                description: "",
                content: (item.content as unknown as Email) || defaultTemplateEmail,
              })),
            );
          }
        }
      } else if (tab === "sequences") {
        const seqRes = await fetch("/api/v1/school/mails/sequences?type=sequence", {
          credentials: "include",
          cache: "no-store",
          headers,
        });
        if (seqRes.ok) {
          const data = await seqRes.json();
          const rawItems: any[] = Array.isArray(data)
            ? data
            : Array.isArray(data?.items)
              ? data.items
              : Array.isArray(data?.sequences)
                ? data.sequences
                : Array.isArray(data?.data)
                  ? data.data
                  : [];
          const normalizedSequences: SequenceItem[] = rawItems.map((item) => ({
            ...item,
            sequenceId: item.sequenceId || item.id || "",
            id: item.id || item.sequenceId || "",
            title: item.title || "Untitled Sequence",
            status: item.status || "draft",
            type: item.type || "sequence",
            emailsCount:
              item.emailsCount ??
              (Array.isArray(item.emails) ? item.emails.length : undefined),
            entrantsCount:
              typeof item.entrantsCount === "number"
                ? item.entrantsCount
                : 0,
          }));
          setSequences(normalizedSequences);
          return normalizedSequences;
        } else {
          const errData = await seqRes.json().catch(() => null);
          setError(
            errData?.details?.reason || errData?.message || "Failed to load sequences",
          );
          setSequences([]);
        }
      } else if (tab === "templates") {
        const [tmplRes, sysTmplRes] = await Promise.all([
          fetch("/api/v1/school/mails/templates", {
            credentials: "include",
            cache: "no-store",
            headers,
          }),
          fetch("/api/v1/school/mails/system-templates", {
            credentials: "include",
            cache: "no-store",
            headers,
          }).catch(() => null),
        ]);
        if (tmplRes.ok) {
          const data = await tmplRes.json();
          const rawTmpls: any[] = Array.isArray(data)
            ? data
            : Array.isArray(data?.items)
              ? data.items
              : Array.isArray(data?.templates)
                ? data.templates
                : Array.isArray(data?.data)
                  ? data.data
                  : [];
          setTemplates(
            rawTmpls.map((item) => ({
              ...item,
              templateId: item.templateId || item.id || "",
              id: item.id || item.templateId || "",
              title: item.title || item.name || "Untitled Template",
              name: item.name || item.title || "Untitled Template",
            })),
          );
        } else {
          const errData = await tmplRes.json().catch(() => null);
          setError(
            errData?.details?.reason || errData?.message || "Failed to load templates",
          );
          setTemplates([]);
        }
        if (sysTmplRes && sysTmplRes.ok) {
          const sysData = (await sysTmplRes.json()) as {
            items?: Array<{ templateId: string; title: string; content: unknown }>;
          };
          if (sysData.items && sysData.items.length > 0) {
            setSystemTemplates(
              sysData.items.map((item) => ({
                templateId: item.templateId,
                title: item.title,
                description: "",
                content: (item.content as unknown as Email) || defaultTemplateEmail,
              })),
            );
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load mailing data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (pathname === "/mails") return;

    void fetch("/api/v1/schools", { credentials: "include", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then(async (body: { items?: School[] }) => {
        const selected =
          body.items?.find((item) => item.selected) ?? body.items?.[0] ?? null;
        setSchool(selected);
        if (selected) {
          await loadTabData(selected, selectedTab);
        }
      })
      .catch(() => setError("Unable to load school context."))
      .finally(() => setLoading(false));
  }, [loadTabData, pathname, selectedTab]);

  const customChooserTemplates: ChooserEmailTemplate[] = useMemo(() => {
    return templates.map((t) => ({
      id: t.id,
      teamId: "",
      templateId: t.id,
      title: t.name || "Untitled template",
      content: t.content ?? defaultTemplateEmail,
      createdAt: t.updatedAt ?? "",
      updatedAt: t.updatedAt ?? "",
    }));
  }, [templates]);

  // Broadcast actions
  async function handleCreateBroadcast() {
    if (!school || savingBroadcast) return;
    setSavingBroadcast(true);
    setError(null);
    try {
      const title =
        broadcastSubject.trim() || selectedTemplateTitle || "Untitled broadcast";

      // 1. Create the broadcast sequence on SendLit
      const createRes = await fetch("/api/v1/school/mails/sequences", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-school-id": school.id,
        },
        body: JSON.stringify({
          title,
          type: "broadcast",
          templateId: selectedTemplateId || "system:blank",
        }),
      });
      if (!createRes.ok) {
        throw new Error("Unable to create broadcast.");
      }
      const created = (await createRes.json()) as any;
      const sequenceId = created.sequenceId || created.id;
      if (!sequenceId) {
        throw new Error("Unable to create broadcast: no sequence ID returned.");
      }

      // 2. If subject was provided, update the first email's subject
      const rawEmails: any[] = Array.isArray(created.emails) ? created.emails : [];
      const firstEmail = rawEmails[0];
      const emailId = firstEmail?.emailId || firstEmail?.id;

      if (emailId && broadcastSubject.trim()) {
        await fetch(`/api/v1/school/mails/sequences/${sequenceId}/emails/${emailId}`, {
          method: "PATCH",
          credentials: "include",
          headers: {
            "content-type": "application/json",
            "x-school-id": school.id,
          },
          body: JSON.stringify({
            subject: broadcastSubject.trim(),
            published: true,
          }),
        }).catch(() => null);
      }

      // Prepend to local broadcasts state immediately
      const newBroadcastItem: BroadcastItem = {
        ...created,
        sequenceId,
        id: sequenceId,
        title,
        type: "broadcast",
        status: created.status || "draft",
        emails:
          rawEmails.length > 0
            ? rawEmails.map((e: any) => ({
                ...e,
                emailId: e.emailId || e.id || "",
                subject:
                  e === firstEmail && broadcastSubject.trim()
                    ? broadcastSubject.trim()
                    : e.subject || title,
              }))
            : emailId
              ? [
                  {
                    emailId,
                    subject: broadcastSubject.trim() || title,
                    delayInMillis: 0,
                    published: true,
                  },
                ]
              : [],
      };

      setBroadcasts((prev) => [
        newBroadcastItem,
        ...prev.filter((b) => (b.sequenceId || (b as any).id) !== sequenceId),
      ]);

      // Reset form
      setBroadcastSubject("");
      setSelectedTemplateId("system:blank");
      setSelectedTemplateTitle("Blank");
      setNewBroadcastOpen(false);

      // Configure the broadcast audience before opening the content editor.
      router.push(`/mails/broadcasts/${encodeURIComponent(sequenceId)}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create broadcast.");
    } finally {
      setSavingBroadcast(false);
    }
  }

  function openBroadcastDeleteDialog(broadcast: BroadcastItem) {
    setBroadcastDeleteError(null);
    setBroadcastToDelete(broadcast);
  }

  function closeBroadcastDeleteDialog() {
    if (deletingBroadcast) return;
    setBroadcastToDelete(null);
    setBroadcastDeleteError(null);
  }

  async function handleDeleteBroadcast() {
    const sequenceId = broadcastToDelete?.sequenceId || broadcastToDelete?.id;
    if (!school || !broadcastToDelete || !sequenceId || deletingBroadcast) return;
    setDeletingBroadcast(true);
    setBroadcastDeleteError(null);
    try {
      const response = await fetch(
        `/api/v1/school/mails/sequences/${encodeURIComponent(sequenceId)}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { "x-school-id": school.id },
        },
      );
      if (!response.ok) {
        throw new Error(await getResponseError(response, "Unable to delete broadcast."));
      }
      setBroadcasts((prev) =>
        prev.filter((b) => (b.sequenceId || b.id) !== sequenceId),
      );
      setBroadcastToDelete(null);
    } catch (err) {
      setBroadcastDeleteError(
        err instanceof Error ? err.message : "Unable to delete broadcast.",
      );
    } finally {
      setDeletingBroadcast(false);
    }
  }

  // Sequence actions
  async function handleCreateSequence() {
    if (!school || !sequenceTitle.trim() || savingSequence) return;
    setSavingSequence(true);
    setError(null);
    let sequenceCreated = false;
    try {
      const titleToCreate = sequenceTitle.trim();
      const response = await fetch("/api/v1/school/mails/sequences", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-school-id": school.id,
        },
        body: JSON.stringify({ title: titleToCreate, type: "sequence" }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(
          errData?.details?.reason || errData?.message || "Unable to create sequence.",
        );
      }
      const created = await response.json().catch(() => null);
      sequenceCreated = true;
      setSequenceTitle("");
      setNewSequenceOpen(false);

      // Use the refreshed list item as the source of truth for the editor URL,
      // matching the same canonical ID used when opening a row from the table.
      const refreshedSequences = await loadTabData(school, "sequences");
      const createdId = created?.sequenceId || created?.id;
      const createdSequenceFromId = refreshedSequences?.find(
        (sequence) =>
          sequence.sequenceId === createdId || sequence.id === createdId,
      );
      const createdSequenceFromTitle = refreshedSequences
        ?.filter((sequence) => sequence.title === titleToCreate)
        .sort((left, right) => {
          const leftCreatedAt = Date.parse(left.createdAt ?? "");
          const rightCreatedAt = Date.parse(right.createdAt ?? "");
          return (Number.isFinite(rightCreatedAt) ? rightCreatedAt : 0) -
            (Number.isFinite(leftCreatedAt) ? leftCreatedAt : 0);
        })[0];
      const newSequenceId =
        createdSequenceFromId?.sequenceId ||
        createdSequenceFromTitle?.sequenceId;
      if (!newSequenceId) {
        throw new Error(
          "Sequence was created, but it could not be found in the refreshed sequence list. Return to Sequences and try opening it from there.",
        );
      }
      router.push(`/mails/sequences/${encodeURIComponent(newSequenceId)}/edit`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : sequenceCreated
            ? "Sequence was created, but it could not be opened. Return to Sequences and open it from there."
            : "Unable to create sequence.",
      );
    } finally {
      setSavingSequence(false);
    }
  }

  async function toggleSequenceStatus(sequence: SequenceItem) {
    if (!school) return;
    const seqId = sequence.sequenceId || sequence.id;
    if (!seqId) return;
    const action = sequence.status === "active" ? "pause" : "start";
    try {
      const response = await fetch(
        `/api/v1/school/mails/sequences/${seqId}/${action}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "x-school-id": school.id },
        },
      );
      if (response.ok) {
        setSequences((prev) =>
          prev.map((s) =>
            (s.sequenceId || s.id) === seqId
              ? { ...s, status: action === "start" ? "active" : "paused" }
              : s,
          ),
        );
      }
    } catch {
      /* ignore */
    }
  }

  async function handleDeleteSequence(sequenceId: string) {
    if (!school) return;
    try {
      const response = await fetch(`/api/v1/school/mails/sequences/${sequenceId}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "x-school-id": school.id },
      });
      if (response.ok) {
        setSequences((prev) =>
          prev.filter((s) => (s.sequenceId || s.id) !== sequenceId),
        );
      }
    } catch {
      /* ignore */
    }
  }

  // Template actions
  async function handleCreateTemplate() {
    if (!school || !templateName.trim() || savingTemplate) return;
    setSavingTemplate(true);
    setError(null);
    try {
      const chosenTmpl =
        systemTemplates.find((t) => t.templateId === selectedNewTemplateId) ??
        customChooserTemplates.find((t) => t.templateId === selectedNewTemplateId);
      const content = chosenTmpl?.content ?? defaultTemplateEmail;
      const titleToCreate = templateName.trim();

      const response = await fetch("/api/v1/school/mails/templates", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-school-id": school.id,
        },
        body: JSON.stringify({
          name: titleToCreate,
          title: titleToCreate,
          subject: templateSubject.trim(),
          content,
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(
          errData?.details?.reason || errData?.message || "Unable to create template.",
        );
      }
      const created = await response.json().catch(() => null);
      if (created) {
        const normalized: TemplateItem = {
          ...created,
          templateId: created.templateId || created.id || `tmpl_${Date.now()}`,
          id: created.id || created.templateId || `tmpl_${Date.now()}`,
          title: created.title || created.name || titleToCreate,
          name: created.name || created.title || titleToCreate,
        };
        setTemplates((prev) => [
          normalized,
          ...prev.filter(
            (t) => (t.templateId || t.id) !== (normalized.templateId || normalized.id),
          ),
        ]);
      }
      setTemplateName("");
      setTemplateSubject("");
      setSelectedNewTemplateId("system:blank");
      setSelectedNewTemplateTitle("Blank");
      setNewTemplateOpen(false);
      await loadTabData(school, "templates");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create template.");
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleDuplicateTemplate(templateId: string) {
    if (!school) return;
    try {
      const response = await fetch(
        `/api/v1/school/mails/templates/${templateId}/duplicate`,
        {
          method: "POST",
          credentials: "include",
          headers: { "x-school-id": school.id },
        },
      );
      if (response.ok) {
        await loadTabData(school, "templates");
      }
    } catch {
      /* ignore */
    }
  }

  function openTemplateDeleteDialog(template: TemplateItem) {
    setTemplateDeleteError(null);
    setTemplateToDelete(template);
  }

  function closeTemplateDeleteDialog() {
    if (deletingTemplate) return;
    setTemplateToDelete(null);
    setTemplateDeleteError(null);
  }

  async function handleDeleteTemplate() {
    if (!school || !templateToDelete || deletingTemplate) return;
    setDeletingTemplate(true);
    setTemplateDeleteError(null);
    try {
      const response = await fetch(
        `/api/v1/school/mails/templates/${encodeURIComponent(templateToDelete.id)}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { "x-school-id": school.id },
        },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
          details?: { reason?: string };
        } | null;
        throw new Error(
          body?.details?.reason || body?.message || "Unable to delete template.",
        );
      }
      setTemplates((prev) => prev.filter((t) => t.id !== templateToDelete.id));
      setTemplateToDelete(null);
    } catch (caught) {
      setTemplateDeleteError(
        caught instanceof Error ? caught.message : "Unable to delete template.",
      );
    } finally {
      setDeletingTemplate(false);
    }
  }

  return (
    <AuthGate>
      <div className="page-shell">
        <PageHeader
          title={pageDetails.title}
          description={pageDetails.description}
          action={canWriteMails ? (
            <div className="flex items-center gap-2">
              {selectedTab === "broadcasts" ? (
                <Button size="sm" onClick={() => setNewBroadcastOpen(true)}>
                  <Plus className="size-4 mr-1" />
                  New broadcast
                </Button>
              ) : null}
              {selectedTab === "sequences" ? (
                <Button size="sm" onClick={() => setNewSequenceOpen(true)}>
                  <Plus className="size-4 mr-1" />
                  New sequence
                </Button>
              ) : null}
              {selectedTab === "templates" ? (
                <Button size="sm" onClick={() => setNewTemplateOpen(true)}>
                  <Plus className="size-4 mr-1" />
                  New template
                </Button>
              ) : null}
            </div>
          ) : undefined}
        />

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {selectedTab === "broadcasts" ? (
          loading && broadcasts.length === 0 ? (
            <CourseLitLoading label="Loading broadcasts…" className="min-h-64" />
          ) : broadcasts.length === 0 ? (
            <EmptyState
              icon={Radio}
              title="No broadcasts yet"
              description="Send a one-time announcement, newsletter, or update to your audience."
              action={
                canWriteMails ? (
                  <Button onClick={() => setNewBroadcastOpen(true)}>
                    <Plus className="size-4" />
                    New broadcast
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="max-w-full overflow-x-auto">
                    <table className={MAIL_TABLE_CLASS}>
                      <caption className="sr-only">Email broadcasts</caption>
                      <thead className={MAIL_TABLE_HEAD_CLASS}>
                        <tr>
                          <th scope="col" className={MAIL_TABLE_HEADING_CLASS}>
                            Title
                          </th>
                          <th scope="col" className={MAIL_TABLE_HEADING_CLASS}>
                            Status
                          </th>
                          <th
                            scope="col"
                            className={MAIL_TABLE_HEADING_CLASS}
                            title="Recipients captured for this broadcast"
                          >
                            Recipients
                          </th>
                          <th
                            scope="col"
                            className={`${MAIL_TABLE_HEADING_CLASS} text-right`}
                          >
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {broadcasts.map((b) => {
                          const broadcastId = b.sequenceId || (b as any).id || "";
                          const status = getBroadcastStatus(b);
                          const subject = b.emails?.[0]?.subject || "No subject";
                          const sentAt = getBroadcastSentAt(b);

                          return (
                            <tr
                              key={broadcastId}
                              className={`${MAIL_TABLE_ROW_CLASS} ${canWriteMails ? "cursor-pointer" : ""}`}
                              onClick={
                                canWriteMails
                                  ? () => router.push(`/mails/broadcasts/${encodeURIComponent(broadcastId)}/edit`)
                                  : undefined
                              }
                            >
                              <td className={`${MAIL_TABLE_CELL_CLASS} min-w-0`}>
                                <Link
                                  href={`/mails/broadcasts/${encodeURIComponent(broadcastId)}/edit`}
                                  onClick={(event) => event.stopPropagation()}
                                  className="block max-w-[36rem] truncate font-medium hover:underline"
                                  title={b.title || "Untitled Broadcast"}
                                >
                                  {b.title || "Untitled Broadcast"}
                                </Link>
                                <p
                                  className="mt-0.5 max-w-[36rem] truncate text-xs text-muted-foreground"
                                  title={subject}
                                >
                                  {subject}
                                </p>
                              </td>
                              <td className={MAIL_TABLE_CELL_CLASS}>
                                <div className="flex flex-col items-start gap-1">
                                  <Badge variant={status.variant}>{status.label}</Badge>
                                  {status.scheduledAt ? (
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Clock className="size-3.5" />
                                      {status.scheduleNote
                                        ? `${status.scheduleNote}: ${status.scheduledAt.toLocaleString()}`
                                        : status.scheduledAt.toLocaleString()}
                                    </span>
                                  ) : sentAt ? (
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Clock className="size-3.5" />
                                      Sent {sentAt.toLocaleString()}
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td
                                className={`${MAIL_TABLE_CELL_CLASS} tabular-nums`}
                                title="Recipients captured for this broadcast"
                              >
                                {b.entrantsCount ?? 0}
                              </td>
                              <td className={`${MAIL_TABLE_CELL_CLASS} text-right`}>
                                {canWriteMails ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        openBroadcastDeleteDialog(b);
                                      }}
                                      aria-label="Delete broadcast"
                                      title="Delete broadcast"
                                    >
                                      <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                                    </Button>
                                  </div>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
              </div>
            </div>
          )
        ) : null}

        {selectedTab === "sequences" ? (
          loading && sequences.length === 0 ? (
            <CourseLitLoading label="Loading sequences…" className="min-h-64" />
          ) : sequences.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No sequences yet"
              description="Automate welcome series, course onboarding, or re-engagement flows."
              action={
                canWriteMails ? (
                  <Button onClick={() => setNewSequenceOpen(true)}>
                    <Plus className="size-4" />
                    New sequence
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="max-w-full overflow-x-auto">
                    <table className={MAIL_TABLE_CLASS}>
                      <caption className="sr-only">Email sequences</caption>
                      <thead className={MAIL_TABLE_HEAD_CLASS}>
                        <tr>
                          <th scope="col" className={MAIL_TABLE_HEADING_CLASS}>
                            Title
                          </th>
                          <th scope="col" className={MAIL_TABLE_HEADING_CLASS}>
                            Status
                          </th>
                          <th scope="col" className={MAIL_TABLE_HEADING_CLASS}>
                            Emails
                          </th>
                          <th
                            scope="col"
                            className={MAIL_TABLE_HEADING_CLASS}
                            title="Contacts currently enrolled in the sequence"
                          >
                            Entrants
                          </th>
                          <th
                            scope="col"
                            className={`${MAIL_TABLE_HEADING_CLASS} text-right`}
                          >
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sequences.map((seq) => {
                          const seqId = seq.sequenceId || seq.id || "";
                          return (
                            <tr
                              key={seqId}
                              className={`${MAIL_TABLE_ROW_CLASS} cursor-pointer`}
                              onClick={() =>
                                router.push(`/mails/sequences/${encodeURIComponent(seqId)}/edit`)
                              }
                            >
                              <td className={MAIL_TABLE_CELL_CLASS}>
                                <Link
                                  href={`/mails/sequences/${encodeURIComponent(seqId)}/edit`}
                                  onClick={(event) => event.stopPropagation()}
                                  className="block max-w-[36rem] truncate font-medium hover:underline"
                                  title={seq.title || "Untitled Sequence"}
                                >
                                  {seq.title || "Untitled Sequence"}
                                </Link>
                              </td>
                              <td className={MAIL_TABLE_CELL_CLASS}>
                                <Badge
                                  variant={
                                    seq.status === "active"
                                      ? "success"
                                      : seq.status === "paused"
                                        ? "warning"
                                        : "neutral"
                                  }
                                >
                                  {seq.status.charAt(0).toUpperCase() +
                                    seq.status.slice(1)}
                                </Badge>
                              </td>
                              <td className={`${MAIL_TABLE_CELL_CLASS} tabular-nums`}>
                                {seq.emailsCount ?? 0}
                              </td>
                              <td
                                className={`${MAIL_TABLE_CELL_CLASS} tabular-nums`}
                                title="Contacts currently enrolled in this sequence"
                              >
                                {seq.entrantsCount ?? 0}
                              </td>
                              <td className={`${MAIL_TABLE_CELL_CLASS} text-right`}>
                                {canWriteMails ? (
                                  <div
                                    className="flex items-center justify-end gap-1"
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => void toggleSequenceStatus(seq)}
                                      aria-label={
                                        seq.status === "active"
                                          ? "Pause sequence"
                                          : "Activate sequence"
                                      }
                                      title={
                                        seq.status === "active"
                                          ? "Pause sequence"
                                          : "Activate sequence"
                                      }
                                    >
                                      {seq.status === "active" ? (
                                        <Pause className="size-4 text-muted-foreground" />
                                      ) : (
                                        <Play className="size-4 text-primary" />
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => void handleDeleteSequence(seqId)}
                                      aria-label="Delete sequence"
                                      title="Delete sequence"
                                    >
                                      <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                                    </Button>
                                  </div>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
              </div>
            </div>
          )
        ) : null}

        {selectedTab === "templates" ? (
          loading && templates.length === 0 ? (
            <CourseLitLoading label="Loading templates…" className="min-h-64" />
          ) : templates.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No templates yet"
              description="Design templates to keep your email styling consistent across campaigns."
              action={
                canWriteMails ? (
                  <Button onClick={() => setNewTemplateOpen(true)}>
                    <Plus className="size-4" />
                    New template
                  </Button>
                ) : undefined
              }
            />
          ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {templates.map((tmpl) => (
                      <Card key={tmpl.id} className="relative">
                        <Link
                          href={`/mails/templates/${encodeURIComponent(tmpl.id)}/edit`}
                          aria-label={`Edit email template ${tmpl.name}`}
                          className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                        <CardHeader className="pointer-events-none relative z-10 px-4 pb-2">
                          <CardTitle className="text-base">{tmpl.name}</CardTitle>
                          {tmpl.subject ? (
                            <CardDescription>Subject: {tmpl.subject}</CardDescription>
                          ) : null}
                        </CardHeader>
                        <CardContent className="space-y-3 px-4 pt-0">
                          <div className="pointer-events-none relative z-10">
                            {selectedTab === "templates" ? (
                              tmpl.content ? (
                                <EmailPreview
                                  key={`${tmpl.id}-${tmpl.updatedAt ?? ""}`}
                                  content={tmpl.content}
                                  className="w-full"
                                  iframeTitle={`${tmpl.name} preview`}
                                />
                              ) : (
                                <div className="flex h-60 items-center justify-center rounded-md border bg-muted/20 text-sm text-muted-foreground">
                                  Preview unavailable
                                </div>
                              )
                            ) : null}
                          </div>
                          {canWriteMails ? (
                            <div className="relative z-20 flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => void handleDuplicateTemplate(tmpl.id)}
                              >
                                <Copy className="size-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openTemplateDeleteDialog(tmpl)}
                              >
                                <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
          )
        ) : null}

        {/* New Broadcast Dialog */}
        <Dialog open={newBroadcastOpen} onOpenChange={setNewBroadcastOpen}>
          <DialogContent className="w-[95vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle>New broadcast</DialogTitle>
              <DialogDescription>
                Enter a subject and choose a starting template for your broadcast.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-6">
              <div className="space-y-1.5">
                <Label htmlFor="broadcast-subject">Subject</Label>
                <Input
                  id="broadcast-subject"
                  placeholder="e.g. Exciting news and course releases this month"
                  value={broadcastSubject}
                  onChange={(e) => setBroadcastSubject(e.target.value)}
                  disabled={savingBroadcast}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Choose a template</Label>
                  {selectedTemplateTitle ? (
                    <span className="text-xs text-muted-foreground">
                      Selected:{" "}
                      <strong className="font-semibold text-foreground">
                        {selectedTemplateTitle}
                      </strong>
                    </span>
                  ) : null}
                </div>

                <div className="rounded-lg border bg-muted/20 p-4">
                  <TemplateChooser
                    systemTemplates={systemTemplates}
                    templates={customChooserTemplates}
                    onSelect={(choice) => {
                      setSelectedTemplateId(choice.templateId);
                      setSelectedTemplateTitle(choice.title);
                    }}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-muted/10">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewBroadcastOpen(false)}
                disabled={savingBroadcast}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleCreateBroadcast()}
                disabled={savingBroadcast}
              >
                {savingBroadcast ? "Creating…" : "Start editing"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Sequence Dialog */}
        <Dialog open={newSequenceOpen} onOpenChange={setNewSequenceOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New automated sequence</DialogTitle>
              <DialogDescription>
                Create a drip sequence that automatically emails contacts based on
                triggers.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="seq-title">Sequence title *</Label>
                <Input
                  id="seq-title"
                  placeholder="e.g. New Student Onboarding"
                  value={sequenceTitle}
                  onChange={(e) => setSequenceTitle(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewSequenceOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleCreateSequence()}
                disabled={!sequenceTitle || savingSequence}
              >
                {savingSequence ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Template Dialog */}
        <Dialog open={newTemplateOpen} onOpenChange={setNewTemplateOpen}>
          <DialogContent className="w-[95vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle>New template</DialogTitle>
              <DialogDescription>
                Enter a template name and choose a starting template.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tmpl-name">Template name *</Label>
                  <Input
                    id="tmpl-name"
                    placeholder="e.g. Weekly Digest"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    disabled={savingTemplate}
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tmpl-subj">Default subject</Label>
                  <Input
                    id="tmpl-subj"
                    placeholder="e.g. Your Weekly Digest"
                    value={templateSubject}
                    onChange={(e) => setTemplateSubject(e.target.value)}
                    disabled={savingTemplate}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Choose a template</Label>
                  {selectedNewTemplateTitle ? (
                    <span className="text-xs text-muted-foreground">
                      Selected:{" "}
                      <strong className="font-semibold text-foreground">
                        {selectedNewTemplateTitle}
                      </strong>
                    </span>
                  ) : null}
                </div>

                <div className="rounded-lg border bg-muted/20 p-4">
                  <TemplateChooser
                    systemTemplates={systemTemplates}
                    templates={customChooserTemplates}
                    onSelect={(choice) => {
                      setSelectedNewTemplateId(choice.templateId);
                      setSelectedNewTemplateTitle(choice.title);
                    }}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-muted/10">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewTemplateOpen(false)}
                disabled={savingTemplate}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleCreateTemplate()}
                disabled={!templateName.trim() || savingTemplate}
              >
                {savingTemplate ? "Creating…" : "Create template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(broadcastToDelete)}
          onOpenChange={(open) => {
            if (!open) closeBroadcastDeleteDialog();
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete “{broadcastToDelete?.title}”?</DialogTitle>
              <DialogDescription>
                This will permanently delete this broadcast and its email content. This
                action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {broadcastDeleteError ? (
              <p role="alert" className="text-sm text-destructive">
                {broadcastDeleteError}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeBroadcastDeleteDialog}
                disabled={deletingBroadcast}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void handleDeleteBroadcast()}
                disabled={deletingBroadcast}
              >
                {deletingBroadcast ? "Deleting…" : "Delete broadcast"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(templateToDelete)}
          onOpenChange={(open) => {
            if (!open) closeTemplateDeleteDialog();
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete “{templateToDelete?.name}”?</DialogTitle>
              <DialogDescription>
                This will permanently delete this email template. This action cannot
                be undone.
              </DialogDescription>
            </DialogHeader>
            {templateDeleteError ? (
              <p role="alert" className="text-sm text-destructive">
                {templateDeleteError}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeTemplateDeleteDialog}
                disabled={deletingTemplate}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void handleDeleteTemplate()}
                disabled={deletingTemplate}
              >
                {deletingTemplate ? "Deleting…" : "Delete template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGate>
  );
}

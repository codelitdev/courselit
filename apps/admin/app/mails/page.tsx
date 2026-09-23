"use client";

import { PlatformTabs, PlatformTabsContent } from "@courselit/components-library";
import {
  Calendar,
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
  RefreshCw,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TemplateChooser,
  type EmailTemplate as ChooserEmailTemplate,
  type SystemTemplateSummary,
  defaultTemplateEmail,
} from "@sendlit/email-blocks";
import type { Email } from "@sendlit/email-editor";
import { BUILTIN_SYSTEM_TEMPLATES } from "@/lib/system-email-templates";
import { AuthGate } from "@/components/auth-gate";
import { PageHeader } from "@/components/layout/page-header";
import { CourseLitLoading, CourseLitLoadingIcon } from "@/components/loading";
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
  createdAt?: string;
  updatedAt?: string;
};

type SequenceItem = {
  id?: string;
  sequenceId?: string;
  title?: string;
  status: "active" | "draft" | "paused";
  type: string;
  emailsCount?: number;
  createdAt?: string;
};

type TemplateItem = {
  id: string;
  name: string;
  templateId?: string;
  title?: string;
  subject?: string;
  updatedAt?: string;
};

const MAILS_TABS = ["broadcasts", "sequences", "templates"] as const;
type MailsTab = (typeof MAILS_TABS)[number];

function isMailsTab(value: string | null): value is MailsTab {
  return MAILS_TABS.includes(value as MailsTab);
}

function getBroadcastStatus(broadcast: BroadcastItem): {
  label: "Draft" | "Scheduled" | "Sending" | "Sent";
  badgeClass: string;
  scheduledAt?: Date;
} {
  const firstEmail = broadcast.emails?.[0];
  const delay = firstEmail?.delayInMillis;
  const isScheduled = typeof delay === "number" && delay > Date.now();

  if (broadcast.status === "completed") {
    return {
      label: "Sent",
      badgeClass: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
    };
  }
  if (broadcast.status === "active") {
    if (isScheduled) {
      return {
        label: "Scheduled",
        badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
        scheduledAt: new Date(delay),
      };
    }
    return {
      label: "Sending",
      badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    };
  }
  return {
    label: "Draft",
    badgeClass: "bg-muted text-muted-foreground",
  };
}

export default function MailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedTab = isMailsTab(searchParams.get("tab"))
    ? (searchParams.get("tab") as MailsTab)
    : "broadcasts";

  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(false);
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

  // Quick Schedule modal state
  const [scheduleTarget, setScheduleTarget] = useState<BroadcastItem | null>(null);
  const [scheduleDateTime, setScheduleDateTime] = useState("");
  const [scheduling, setScheduling] = useState(false);

  // Edit Broadcast modal state
  const [editTarget, setEditTarget] = useState<BroadcastItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Sequences state
  const [sequences, setSequences] = useState<SequenceItem[]>([]);
  const [newSequenceOpen, setNewSequenceOpen] = useState(false);
  const [sequenceTitle, setSequenceTitle] = useState("");
  const [savingSequence, setSavingSequence] = useState(false);

  // Templates state
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [newTemplateOpen, setNewTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateSubject, setTemplateSubject] = useState("");
  const [selectedNewTemplateId, setSelectedNewTemplateId] = useState("system:blank");
  const [selectedNewTemplateTitle, setSelectedNewTemplateTitle] = useState("Blank");
  const [savingTemplate, setSavingTemplate] = useState(false);

  const canWriteMails = hasSchoolPermission(school, "contacts:write");

  function selectTab(tab: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/mails?${params.toString()}`, { scroll: false });
  }

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
          }));
          setSequences(normalizedSequences);
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
      .catch(() => setError("Unable to load school context."));
  }, [loadTabData, selectedTab]);

  const customChooserTemplates: ChooserEmailTemplate[] = useMemo(() => {
    return templates.map((t) => ({
      id: t.id,
      teamId: "",
      templateId: t.id,
      title: t.name || "Untitled template",
      content: defaultTemplateEmail,
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
        createdAt: created.createdAt || new Date().toISOString(),
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

      // Navigate to the full screen email editor
      router.push(`/mails/editor/${sequenceId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create broadcast.");
    } finally {
      setSavingBroadcast(false);
    }
  }

  async function handleSendNow(broadcast: BroadcastItem) {
    if (!school) return;
    if (
      !confirm(
        `Are you sure you want to send "${broadcast.title || "this broadcast"}" right away?`,
      )
    ) {
      return;
    }
    try {
      const seqId = broadcast.sequenceId || (broadcast as any).id;
      const firstEmail = broadcast.emails?.[0];
      const emailId = firstEmail?.emailId || (firstEmail as any)?.id;
      if (emailId) {
        await fetch(`/api/v1/school/mails/sequences/${seqId}/emails/${emailId}`, {
          method: "PATCH",
          credentials: "include",
          headers: {
            "content-type": "application/json",
            "x-school-id": school.id,
          },
          body: JSON.stringify({ delayInMillis: 0, published: true }),
        });
      }
      const response = await fetch(`/api/v1/school/mails/sequences/${seqId}/start`, {
        method: "POST",
        credentials: "include",
        headers: { "x-school-id": school.id },
      });
      if (response.ok) {
        await loadTabData(school, "broadcasts");
      }
    } catch {
      /* ignore */
    }
  }

  async function handleConfirmSchedule() {
    if (!school || !scheduleTarget || !scheduleDateTime || scheduling) return;
    setScheduling(true);
    try {
      const seqId = scheduleTarget.sequenceId || (scheduleTarget as any).id;
      const delayInMillis = new Date(scheduleDateTime).getTime();
      const firstEmail = scheduleTarget.emails?.[0];
      const emailId = firstEmail?.emailId || (firstEmail as any)?.id;
      if (emailId) {
        await fetch(`/api/v1/school/mails/sequences/${seqId}/emails/${emailId}`, {
          method: "PATCH",
          credentials: "include",
          headers: {
            "content-type": "application/json",
            "x-school-id": school.id,
          },
          body: JSON.stringify({ delayInMillis, published: true }),
        });
      }
      await fetch(`/api/v1/school/mails/sequences/${seqId}/start`, {
        method: "POST",
        credentials: "include",
        headers: { "x-school-id": school.id },
      });
      setScheduleTarget(null);
      setScheduleDateTime("");
      await loadTabData(school, "broadcasts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to schedule broadcast.");
    } finally {
      setScheduling(false);
    }
  }

  async function handleCancelSchedule(broadcast: BroadcastItem) {
    if (!school) return;
    try {
      const seqId = broadcast.sequenceId || (broadcast as any).id;
      const response = await fetch(`/api/v1/school/mails/sequences/${seqId}/pause`, {
        method: "POST",
        credentials: "include",
        headers: { "x-school-id": school.id },
      });
      if (response.ok) {
        await loadTabData(school, "broadcasts");
      }
    } catch {
      /* ignore */
    }
  }

  async function handleDeleteBroadcast(sequenceId: string) {
    if (!school) return;
    if (!confirm("Are you sure you want to delete this broadcast?")) return;
    try {
      const response = await fetch(`/api/v1/school/mails/sequences/${sequenceId}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "x-school-id": school.id },
      });
      if (response.ok) {
        setBroadcasts((prev) =>
          prev.filter((b) => (b.sequenceId || (b as any).id) !== sequenceId),
        );
      }
    } catch {
      /* ignore */
    }
  }

  function openEditBroadcast(broadcast: BroadcastItem) {
    setEditTarget(broadcast);
    setEditTitle(broadcast.title || "");
    const firstEmail = broadcast.emails?.[0];
    setEditSubject(firstEmail?.subject || "");
  }

  async function handleSaveEditBroadcast() {
    if (!school || !editTarget || savingEdit) return;
    setSavingEdit(true);
    try {
      const seqId = editTarget.sequenceId || (editTarget as any).id;
      // 1. Update sequence title
      await fetch(`/api/v1/school/mails/sequences/${seqId}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-school-id": school.id,
        },
        body: JSON.stringify({ title: editTitle.trim() }),
      });

      // 2. Update email subject if available
      const firstEmail = editTarget.emails?.[0];
      const emailId = firstEmail?.emailId || (firstEmail as any)?.id;
      if (emailId && editSubject.trim()) {
        await fetch(`/api/v1/school/mails/sequences/${seqId}/emails/${emailId}`, {
          method: "PATCH",
          credentials: "include",
          headers: {
            "content-type": "application/json",
            "x-school-id": school.id,
          },
          body: JSON.stringify({ subject: editSubject.trim() }),
        });
      }

      setEditTarget(null);
      await loadTabData(school, "broadcasts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save broadcast.");
    } finally {
      setSavingEdit(false);
    }
  }

  // Sequence actions
  async function handleCreateSequence() {
    if (!school || !sequenceTitle.trim() || savingSequence) return;
    setSavingSequence(true);
    setError(null);
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
      if (created) {
        const normalized: SequenceItem = {
          ...created,
          sequenceId: created.sequenceId || created.id || `seq_${Date.now()}`,
          id: created.id || created.sequenceId || `seq_${Date.now()}`,
          title: created.title || titleToCreate,
          status: created.status || "draft",
          type: "sequence",
          emailsCount: Array.isArray(created.emails) ? created.emails.length : 1,
        };
        setSequences((prev) => [
          normalized,
          ...prev.filter(
            (s) => (s.sequenceId || s.id) !== (normalized.sequenceId || normalized.id),
          ),
        ]);
      }
      setSequenceTitle("");
      setNewSequenceOpen(false);
      await loadTabData(school, "sequences");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create sequence.");
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

  async function handleDeleteTemplate(templateId: string) {
    if (!school) return;
    try {
      const response = await fetch(`/api/v1/school/mails/templates/${templateId}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "x-school-id": school.id },
      });
      if (response.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <AuthGate>
      <div className="page-shell">
        <PageHeader
          title="Mails"
          description="Reach your audience with automated email sequences, broadcasts, and branded templates."
          action={
            <Button
              type="button"
              variant="outline"
              disabled={!school || loading}
              onClick={() => {
                if (school) void loadTabData(school, selectedTab);
              }}
            >
              {loading ? <CourseLitLoadingIcon size={16} /> : <RefreshCw className="mr-2 size-4" />}
              Refresh
            </Button>
          }
        />

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <PlatformTabs
          value={selectedTab}
          onValueChange={selectTab}
          ariaLabel="Mailing navigation"
          items={[
            {
              value: "broadcasts",
              label: "Broadcasts",
              icon: <Radio className="size-4" />,
            },
            {
              value: "sequences",
              label: "Sequences",
              icon: <Layers className="size-4" />,
            },
            {
              value: "templates",
              label: "Templates",
              icon: <FileText className="size-4" />,
            },
          ]}
        >
          {/* One-off Broadcasts Tab */}
          <PlatformTabsContent value="broadcasts" className="space-y-4 pt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Broadcasts</CardTitle>
                  <CardDescription>
                    One-time emails sent immediately or scheduled for later delivery.
                  </CardDescription>
                </div>
                {canWriteMails ? (
                  <Button size="sm" onClick={() => setNewBroadcastOpen(true)}>
                    <Plus className="size-4 mr-1" />
                    New broadcast
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent>
                {loading && broadcasts.length === 0 ? (
                  <CourseLitLoading label="Loading broadcasts…" className="py-8" />
                ) : broadcasts.length === 0 ? (
                  <div className="py-12 text-center">
                    <Radio className="mx-auto size-6 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">No broadcasts yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Send a one-time announcement, newsletter, or update to your
                      audience.
                    </p>
                    {canWriteMails ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-4"
                        onClick={() => setNewBroadcastOpen(true)}
                      >
                        <Plus className="size-4 mr-1" />
                        Create broadcast
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {broadcasts.map((b) => {
                      const broadcastId = b.sequenceId || (b as any).id || "";
                      const status = getBroadcastStatus(b);
                      const email = b.emails?.[0];
                      const subject = email?.subject || b.title;

                      return (
                        <div
                          key={broadcastId}
                          className="flex flex-col sm:flex-row sm:items-center justify-between py-4 px-2 hover:bg-muted/40 rounded transition-colors gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">
                                {b.title || "Untitled Broadcast"}
                              </span>
                              <span
                                className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${status.badgeClass}`}
                              >
                                {status.label}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              Subject: {subject}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {status.label === "Scheduled" && status.scheduledAt ? (
                                <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
                                  <Clock className="size-3.5" />
                                  Scheduled for {status.scheduledAt.toLocaleString()}
                                </span>
                              ) : null}
                              {b.createdAt ? (
                                <span>
                                  Created {new Date(b.createdAt).toLocaleDateString()}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          {canWriteMails ? (
                            <div className="flex items-center gap-2 self-end sm:self-center">
                              {status.label === "Draft" ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => void handleSendNow(b)}
                                  >
                                    <Send className="size-3.5 mr-1 text-green-600" />
                                    Send now
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setScheduleTarget(b);
                                      setScheduleDateTime("");
                                    }}
                                  >
                                    <Calendar className="size-3.5 mr-1 text-blue-600" />
                                    Schedule
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      router.push(`/mails/editor/${broadcastId}`)
                                    }
                                    title="Edit broadcast in email editor"
                                  >
                                    <Edit2 className="size-4" />
                                  </Button>
                                </>
                              ) : null}

                              {status.label === "Scheduled" ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => void handleCancelSchedule(b)}
                                  >
                                    <XCircle className="size-3.5 mr-1 text-amber-600" />
                                    Cancel schedule
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      router.push(`/mails/editor/${broadcastId}`)
                                    }
                                    title="Edit broadcast in email editor"
                                  >
                                    <Edit2 className="size-4" />
                                  </Button>
                                </>
                              ) : null}

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => void handleDeleteBroadcast(broadcastId)}
                              >
                                <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </PlatformTabsContent>

          {/* Automated Sequences Tab */}
          <PlatformTabsContent value="sequences" className="space-y-4 pt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Sequences</CardTitle>
                  <CardDescription>
                    Automated drip campaigns triggered by user events or enrollments.
                  </CardDescription>
                </div>
                {canWriteMails ? (
                  <Button size="sm" onClick={() => setNewSequenceOpen(true)}>
                    <Plus className="size-4 mr-1" />
                    New sequence
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent>
                {loading && sequences.length === 0 ? (
                  <CourseLitLoading label="Loading sequences…" className="py-8" />
                ) : sequences.length === 0 ? (
                  <div className="py-12 text-center">
                    <Layers className="mx-auto size-6 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">No sequences yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Automate welcome series, course onboarding, or re-engagement
                      flows.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {sequences.map((seq) => {
                      const seqId = seq.sequenceId || seq.id || "";
                      return (
                        <div
                          key={seqId}
                          className="flex items-center justify-between py-3 px-2 hover:bg-muted/50 rounded transition-colors"
                        >
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium">
                              {seq.title || "Untitled Sequence"}
                            </p>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  seq.status === "active"
                                    ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {seq.status}
                              </span>
                              {seq.emailsCount !== undefined ? (
                                <span className="text-xs text-muted-foreground">
                                  {seq.emailsCount} emails
                                </span>
                              ) : null}
                            </div>
                          </div>
                          {canWriteMails ? (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => void toggleSequenceStatus(seq)}
                              >
                                {seq.status === "active" ? (
                                  <Pause className="size-4 text-amber-600" />
                                ) : (
                                  <Play className="size-4 text-green-600" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => void handleDeleteSequence(seqId)}
                              >
                                <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </PlatformTabsContent>

          {/* Templates Tab */}
          <PlatformTabsContent value="templates" className="space-y-4 pt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Templates</CardTitle>
                  <CardDescription>
                    Custom layouts and reusable branded marketing email templates.
                  </CardDescription>
                </div>
                {canWriteMails ? (
                  <Button size="sm" onClick={() => setNewTemplateOpen(true)}>
                    <Plus className="size-4 mr-1" />
                    New template
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent>
                {loading && templates.length === 0 ? (
                  <CourseLitLoading label="Loading templates…" className="py-8" />
                ) : templates.length === 0 ? (
                  <div className="py-12 text-center">
                    <FileText className="mx-auto size-6 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">No templates yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Design templates to keep your email styling consistent across
                      campaigns.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map((tmpl) => (
                      <Card key={tmpl.id} className="relative">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{tmpl.name}</CardTitle>
                          {tmpl.subject ? (
                            <CardDescription>Subject: {tmpl.subject}</CardDescription>
                          ) : null}
                        </CardHeader>
                        {canWriteMails ? (
                          <CardContent className="flex items-center justify-end gap-1 pt-0">
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
                              onClick={() => void handleDeleteTemplate(tmpl.id)}
                            >
                              <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </CardContent>
                        ) : null}
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </PlatformTabsContent>
        </PlatformTabs>

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

        {/* Quick Schedule Modal */}
        <Dialog
          open={Boolean(scheduleTarget)}
          onOpenChange={(open) => {
            if (!open) setScheduleTarget(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule broadcast</DialogTitle>
              <DialogDescription>
                Choose when "{scheduleTarget?.title}" should be sent to your
                subscribers.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="schedule-time">Delivery date & time *</Label>
                <Input
                  id="schedule-time"
                  type="datetime-local"
                  value={scheduleDateTime}
                  onChange={(e) => setScheduleDateTime(e.target.value)}
                  disabled={scheduling}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setScheduleTarget(null)}
                disabled={scheduling}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleConfirmSchedule()}
                disabled={!scheduleDateTime || scheduling}
              >
                {scheduling ? "Scheduling…" : "Schedule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Broadcast Modal */}
        <Dialog
          open={Boolean(editTarget)}
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit broadcast</DialogTitle>
              <DialogDescription>
                Update the broadcast title and email subject line.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-title">Broadcast title *</Label>
                <Input
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  disabled={savingEdit}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-subject">Email subject</Label>
                <Input
                  id="edit-subject"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  disabled={savingEdit}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditTarget(null)}
                disabled={savingEdit}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleSaveEditBroadcast()}
                disabled={!editTitle.trim() || savingEdit}
              >
                {savingEdit ? "Saving…" : "Save changes"}
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
      </div>
    </AuthGate>
  );
}

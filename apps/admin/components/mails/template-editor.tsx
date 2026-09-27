"use client";

import { defaultTemplateEmail } from "@sendlit/email-blocks";
import { defaultEmail, EmailEditor, type Email } from "@sendlit/email-editor";
import { ArrowLeft, Check, Save } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CourseLitLoading, CourseLitLoadingIcon } from "@/components/loading";
import { Button } from "@/components/ui/codelit/button";
import { Input } from "@/components/ui/codelit/input";

type MailTemplate = {
  id: string;
  name?: string;
  title?: string;
  content?: unknown;
};

type SchoolsResponse = {
  items?: Array<{ id: string; selected?: boolean }>;
};

function cloneEmail(email: Email): Email {
  return JSON.parse(JSON.stringify(email)) as Email;
}

function parseEmailContent(raw: unknown): Email {
  if (typeof raw === "string") {
    try {
      return parseEmailContent(JSON.parse(raw));
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

async function errorMessage(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    message?: string;
    details?: { reason?: string };
  } | null;
  return body?.details?.reason || body?.message || fallback;
}

export function MailTemplateEditor({ templateId }: { templateId: string }) {
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [email, setEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef("");
  const emailRef = useRef<Email | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revisionRef = useRef(0);
  const savingRef = useRef(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setSchoolId(null);
    setTemplateName("");
    setEmail(null);
    setSaved(false);
    nameRef.current = "";
    emailRef.current = null;
    revisionRef.current = 0;
    savingRef.current = false;

    async function loadTemplate() {
      try {
        const schoolsResponse = await fetch("/api/v1/schools", {
          credentials: "include",
          cache: "no-store",
        });
        if (!schoolsResponse.ok) {
          throw new Error(await errorMessage(schoolsResponse, "Unable to load school."));
        }
        const schools = (await schoolsResponse.json()) as SchoolsResponse;
        const selectedSchool =
          schools.items?.find((item) => item.selected) ?? schools.items?.[0];
        if (!selectedSchool) throw new Error("Select a school before editing templates.");

        const response = await fetch(
          `/api/v1/school/mails/templates/${encodeURIComponent(templateId)}`,
          {
            credentials: "include",
            cache: "no-store",
            headers: { "x-school-id": selectedSchool.id },
          },
        );
        if (!response.ok) {
          throw new Error(await errorMessage(response, "Unable to load email template."));
        }
        const template = (await response.json()) as MailTemplate;
        if (!active) return;

        const nextName = template.name || template.title || "Untitled template";
        const nextEmail = parseEmailContent(template.content);
        setSchoolId(selectedSchool.id);
        nameRef.current = nextName;
        emailRef.current = nextEmail;
        setTemplateName(nextName);
        setEmail(nextEmail);
        setSaved(true);
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Unable to load email template.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadTemplate();
    return () => {
      active = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [templateId]);

  function queueSave() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void saveTemplate();
    }, 800);
  }

  function markChanged() {
    revisionRef.current += 1;
    setSaved(false);
    setError(null);
    queueSave();
  }

  async function saveTemplate() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!schoolId || !emailRef.current || savingRef.current) return;

    const revision = revisionRef.current;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/school/mails/templates/${encodeURIComponent(templateId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "content-type": "application/json",
            "x-school-id": schoolId,
          },
          body: JSON.stringify({
            title: nameRef.current.trim() || "Untitled template",
            content: emailRef.current,
          }),
        },
      );
      if (!response.ok) {
        throw new Error(await errorMessage(response, "Unable to save email template."));
      }
      if (revision === revisionRef.current) setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save email template.");
    } finally {
      savingRef.current = false;
      setSaving(false);
      if (revision !== revisionRef.current) queueSave();
    }
  }

  function changeName(value: string) {
    nameRef.current = value;
    setTemplateName(value);
    markChanged();
  }

  function changeEmail(nextEmail: Email) {
    emailRef.current = nextEmail;
    setEmail(nextEmail);
    markChanged();
  }

  if (loading) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background p-6">
        <CourseLitLoading label="Loading email template…" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-4 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-destructive">Unable to open editor</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button asChild variant="outline">
            <Link href="/mails/templates">
              <ArrowLeft className="mr-2 size-4" />
              Back to templates
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-card px-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/mails/templates">
              <ArrowLeft className="mr-1.5 size-4" />
              Templates
            </Link>
          </Button>
          <Input
            aria-label="Template name"
            value={templateName}
            onChange={(event) => changeName(event.target.value)}
            placeholder="Template name"
            className="h-8 w-64 max-w-full text-sm font-medium md:w-96"
          />
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status" aria-live="polite">
            {saving ? (
              <>
                <CourseLitLoadingIcon size={14} />
                <span>Saving…</span>
              </>
            ) : saved ? (
              <>
                <Check className="size-3.5 text-emerald-600" />
                <span className="font-medium text-emerald-600">Saved</span>
              </>
            ) : (
              <span>Unsaved changes</span>
            )}
          </div>
          <Button type="button" size="sm" onClick={() => void saveTemplate()} disabled={saving}>
            <Save className="size-4" />
            Save
          </Button>
        </div>
      </header>
      {error ? (
        <div className="border-b bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive" role="alert">
          {error}
        </div>
      ) : null}
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-muted/10">
        <EmailEditor email={email} onChange={changeEmail} />
      </main>
    </div>
  );
}

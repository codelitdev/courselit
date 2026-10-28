"use client";

import {
  defaultEmail,
  type Email,
  EmailEditor,
  renderEmailToHtml,
} from "@sendlit/email-editor";
import { ArrowLeft, Check, Save } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CourseLitLoading, CourseLitLoadingIcon } from "@/components/loading";
import { Button } from "@/components/ui/codelit/button";
import { Input } from "@/components/ui/codelit/input";
import { Label } from "@/components/ui/codelit/label";
import { Switch } from "@/components/ui/codelit/switch";

type DripEmail = {
  sectionId: string;
  enabled: boolean;
  subject: string;
  content: unknown;
  updatedAt: string | null;
};

type SchoolsResponse = {
  items?: Array<{ id: string; selected?: boolean }>;
};

// Unlock emails are transactional: no marketing footer or unsubscribe link.
const DEFAULT_UNLOCK_EMAIL: Email = {
  ...defaultEmail,
  content: [
    {
      blockType: "text",
      settings: {
        content:
          "# A new section is open\n\nThe next part of your course is now available. Sign in to pick up where you left off.",
        alignment: "left",
      },
    },
  ],
};

function cloneEmail(email: Email): Email {
  return JSON.parse(JSON.stringify(email)) as Email;
}

function parseEmailContent(raw: unknown): Email {
  if (
    typeof raw === "object" &&
    raw !== null &&
    Array.isArray((raw as { content?: unknown }).content)
  ) {
    return cloneEmail(raw as Email);
  }
  return cloneEmail(DEFAULT_UNLOCK_EMAIL);
}

async function errorMessage(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    message?: string;
    details?: { reason?: string };
  } | null;
  return body?.details?.reason || body?.message || fallback;
}

/** Full-screen editor for the email a learner gets when a dripped section
 * unlocks for them. */
export function DripEmailEditor({
  productId,
  sectionId,
}: {
  productId: string;
  sectionId: string;
}) {
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [email, setEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subjectRef = useRef("");
  const emailRef = useRef<Email | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revisionRef = useRef(0);
  const savingRef = useRef(false);
  const pendingPatchRef = useRef<{ enabled?: boolean } | null>(null);
  const sectionPath = `/products/${encodeURIComponent(productId)}/content/section/${encodeURIComponent(sectionId)}`;
  const apiPath = `/api/v1/sections/${encodeURIComponent(sectionId)}/drip-email`;

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const schoolsResponse = await fetch("/api/v1/schools", {
          credentials: "include",
          cache: "no-store",
        });
        if (!schoolsResponse.ok) {
          throw new Error(
            await errorMessage(schoolsResponse, "Unable to load school."),
          );
        }
        const schools = (await schoolsResponse.json()) as SchoolsResponse;
        const selectedSchool =
          schools.items?.find((item) => item.selected) ?? schools.items?.[0];
        if (!selectedSchool) throw new Error("Select a school before editing emails.");

        const response = await fetch(apiPath, {
          credentials: "include",
          cache: "no-store",
          headers: { "x-school-id": selectedSchool.id },
        });
        if (!response.ok) {
          throw new Error(await errorMessage(response, "Unable to load the email."));
        }
        const dripEmail = (await response.json()) as DripEmail;
        if (!active) return;
        const nextEmail = parseEmailContent(dripEmail.content);
        setSchoolId(selectedSchool.id);
        subjectRef.current = dripEmail.subject;
        emailRef.current = nextEmail;
        setSubject(dripEmail.subject);
        setEnabled(dripEmail.enabled);
        setEmail(nextEmail);
        setSaved(Boolean(dripEmail.updatedAt));
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error ? caught.message : "Unable to load the email.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [apiPath]);

  function queueSave() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void save();
    }, 800);
  }

  function markChanged() {
    revisionRef.current += 1;
    setSaved(false);
    setError(null);
    queueSave();
  }

  async function save(patch: { enabled?: boolean } = {}): Promise<boolean> {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!schoolId || !emailRef.current) return false;
    if (savingRef.current) {
      // Run a toggle once the save in flight finishes instead of dropping it.
      if (patch.enabled !== undefined) pendingPatchRef.current = patch;
      return false;
    }

    const revision = revisionRef.current;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const html = await renderEmailToHtml({ email: emailRef.current });
      const response = await fetch(apiPath, {
        method: "PUT",
        credentials: "include",
        headers: { "content-type": "application/json", "x-school-id": schoolId },
        body: JSON.stringify({
          subject: subjectRef.current,
          content: emailRef.current,
          html,
          ...patch,
        }),
      });
      if (!response.ok) {
        throw new Error(await errorMessage(response, "Unable to save the email."));
      }
      const updated = (await response.json()) as DripEmail;
      setEnabled(updated.enabled);
      if (revision === revisionRef.current) setSaved(true);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save the email.");
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
      const pending = pendingPatchRef.current;
      pendingPatchRef.current = null;
      if (pending) void save(pending);
      else if (revision !== revisionRef.current) queueSave();
    }
  }

  if (loading) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background p-6">
        <CourseLitLoading label="Loading email…" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-4 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-destructive">
            Unable to open editor
          </h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button asChild variant="outline">
            <Link href={sectionPath}>
              <ArrowLeft className="mr-2 size-4" />
              Back to section
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
            <Link href={sectionPath}>
              <ArrowLeft className="mr-1.5 size-4" />
              Section
            </Link>
          </Button>
          <Input
            aria-label="Subject"
            value={subject}
            onChange={(event) => {
              subjectRef.current = event.target.value;
              setSubject(event.target.value);
              markChanged();
            }}
            placeholder="Subject, e.g. A new section is available"
            className="h-8 w-64 max-w-full text-sm font-medium md:w-96"
          />
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="drip-email-enabled"
              checked={enabled}
              onCheckedChange={(next) => void save({ enabled: next })}
              disabled={saving}
            />
            <Label htmlFor="drip-email-enabled" className="text-sm">
              Send when the section unlocks
            </Label>
          </div>
          <div
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
            role="status"
            aria-live="polite"
          >
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
          <Button type="button" size="sm" onClick={() => void save()} disabled={saving}>
            <Save className="size-4" />
            Save
          </Button>
        </div>
      </header>
      {error ? (
        <div
          className="border-b bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-muted/10">
        <EmailEditor
          email={email}
          onChange={(nextEmail) => {
            emailRef.current = nextEmail;
            setEmail(nextEmail);
            markChanged();
          }}
        />
      </main>
    </div>
  );
}

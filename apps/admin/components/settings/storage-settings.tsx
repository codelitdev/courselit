"use client";

import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/codelit/button";
import { Input } from "@/components/ui/codelit/input";
import { Label } from "@/components/ui/codelit/label";

const MB = 1024 * 1024;
export const LEARNER_UPLOAD_MIN_MB = 1;
export const LEARNER_UPLOAD_MAX_MB = 1024;

/** The budget in whole megabytes, or an error message. */
export function parseLearnerUploadMb(value: string): { ok: true; mb: number } | { ok: false; error: string } {
  const mb = Number(value.trim());
  if (!Number.isInteger(mb) || mb < LEARNER_UPLOAD_MIN_MB || mb > LEARNER_UPLOAD_MAX_MB) {
    return {
      ok: false,
      error: `Enter a whole number of megabytes from ${LEARNER_UPLOAD_MIN_MB} to ${LEARNER_UPLOAD_MAX_MB}.`,
    };
  }
  return { ok: true, mb };
}

/**
 * How much each learner may upload to the school's communities and profile
 * (docs/wip/plan-limits.md, S2). Learner uploads also count toward the
 * school's storage.
 */
export function StorageSettings({ schoolId }: { schoolId: string | null }) {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId) return;
    let active = true;
    void fetch("/api/v1/schools", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((body: { items?: Array<{ id: string; learnerUploadLimitBytes?: number }> }) => {
        const school = body.items?.find((item) => item.id === schoolId);
        if (!active || !school?.learnerUploadLimitBytes) return;
        const mb = String(Math.round(school.learnerUploadLimitBytes / MB));
        setValue(mb);
        setSaved(mb);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [schoolId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!schoolId || saving) return;
    const parsed = parseLearnerUploadMb(value);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/schools/${encodeURIComponent(schoolId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json", "x-school-id": schoolId },
        body: JSON.stringify({ learnerUploadLimitBytes: parsed.mb * MB }),
      });
      if (!response.ok) throw new Error("Unable to save the upload limit.");
      setSaved(String(parsed.mb));
      toast.success("Upload limit saved.");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Unable to save the upload limit.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="w-full max-w-md space-y-4" onSubmit={(event) => void save(event)}>
      <div className="space-y-1.5">
        <Label htmlFor="learner-upload-limit">Upload limit per learner (MB)</Label>
        <Input
          id="learner-upload-limit"
          inputMode="numeric"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-describedby="learner-upload-limit-help"
        />
        <p id="learner-upload-limit-help" className="text-sm text-muted-foreground">
          How much each learner can upload to your communities and their profile. It
          counts toward your school&apos;s storage. Up to {LEARNER_UPLOAD_MAX_MB} MB.
        </p>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      <Button type="submit" disabled={!schoolId || saving || value === saved}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

"use client";

import { type FormEvent, useState } from "react";
import { CourseLitLoadingIcon } from "@/components/course-lit-loader";
import {
  LearnerButton,
  LearnerInput,
  LearnerLabel,
  LearnerText2,
} from "@/components/themed-page-builder";
import { saveLearnerName } from "@/lib/learner-sign-in";
import { useSchoolThemeStyle } from "@/lib/school-theme-context";

/**
 * Asks a learner who just signed in for the first time what to call them.
 * Until then their name is the start of their email address. Skipping keeps
 * that; they can change it later on their profile.
 */
export function LearnerNameStep({ onDone }: { onDone: () => void }) {
  const theme = useSchoolThemeStyle();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      await saveLearnerName(trimmed);
      onDone();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save your name.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <LearnerText2>What should we call you?</LearnerText2>
      <LearnerLabel theme={theme} htmlFor="learner-name" className="sr-only">
        Your name
      </LearnerLabel>
      <LearnerInput
        theme={theme}
        id="learner-name"
        name="name"
        autoComplete="name"
        maxLength={200}
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Your name"
        autoFocus
        required
      />
      {error ? (
        <LearnerText2 className="text-destructive" role="alert">
          {error}
        </LearnerText2>
      ) : null}
      <LearnerButton type="submit" disabled={saving || !name.trim()}>
        {saving ? <CourseLitLoadingIcon size={14} /> : "Continue"}
      </LearnerButton>
      <LearnerButton
        type="button"
        variant="link"
        size="sm"
        disabled={saving}
        onClick={onDone}
      >
        Skip for now
      </LearnerButton>
    </form>
  );
}

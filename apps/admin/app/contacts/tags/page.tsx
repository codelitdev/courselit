"use client";

import { TagManager } from "@sendlit/email-blocks";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { PageHeader } from "@/components/layout/page-header";
import { CourseLitLoading } from "@/components/loading";
import { contactTagsApi, tagSequenceHref } from "@/lib/contact-tags";

/** Every tag on the school's contacts: counts, rename and delete, from SendLit. */
export default function ContactTagsPage() {
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/v1/schools", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((body: { items?: Array<{ id: string; selected?: boolean }> }) => {
        const selected = body.items?.find((item) => item.selected) ?? body.items?.[0];
        if (selected) setSchoolId(selected.id);
        else setError("Unable to load school context.");
      })
      .catch(() => setError("Unable to load school context."));
  }, []);

  const api = useMemo(() => (schoolId ? contactTagsApi(schoolId) : null), [schoolId]);

  return (
    <AuthGate>
      <main className="page-shell">
        <PageHeader
          title="Tags"
          description="Every tag your contacts carry. Rename a tag to fix it everywhere it's used, or delete one you no longer need."
        />
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : api ? (
          <TagManager
            {...api}
            sequenceHref={tagSequenceHref}
            linkComponent={Link}
            loadingIndicator={<CourseLitLoading label="Loading tags…" className="py-12" />}
          />
        ) : (
          <CourseLitLoading label="Loading tags…" className="py-12" />
        )}
      </main>
    </AuthGate>
  );
}

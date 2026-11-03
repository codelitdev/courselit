"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { LearnerButton, LearnerText2 } from "@/components/themed-page-builder";
import { learnerHeaders } from "@/lib/school";

/** Prepares a fresh download link for a digital download the learner owns
 * and starts the download. Every learner path to a purchased download
 * product renders this. */
export function DownloadProductAction({
  productId,
  label = "Download files",
}: {
  productId: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/learner/products/${encodeURIComponent(productId)}/download`,
        {
          method: "POST",
          credentials: "include",
          headers: learnerHeaders({ "content-type": "application/json" }),
          body: JSON.stringify({}),
        },
      );
      if (response.status === 401) {
        window.location.assign(
          `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`,
        );
        return;
      }
      const result = response.ok
        ? ((await response.json()) as { token?: string })
        : null;
      if (!result?.token) {
        setError("Unable to prepare the download.");
        return;
      }
      window.location.assign(`/api/v1/learner/downloads/${result.token}`);
    } catch {
      setError("Unable to prepare the download.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <LearnerButton type="button" disabled={busy} onClick={() => void download()}>
        <Download className="size-4" />
        {busy ? "Preparing download…" : label}
      </LearnerButton>
      {error ? (
        <LearnerText2 role="alert" className="text-destructive">
          {error}
        </LearnerText2>
      ) : null}
    </div>
  );
}

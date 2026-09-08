"use client";

import { Button } from "@codelitdev/design-system";
// Course discussions are part of the protected course viewer.
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LearnerShell } from "@/components/layout/learner-shell";
import { learnerHeaders, writeSchoolId } from "@/lib/school";

type Learner = { id: string; email: string; name: string; schoolId: string };
type Summary = {
  productId: string;
  entityId: string;
  lessonTitle: string;
  commentsCount: number;
  repliesCount: number;
  totalCount: number;
  activityCountIncludingDeleted: number;
  lastActivityAt: string;
};

export default function CourseDiscussionIndexPage() {
  const params = useParams<{ productId: string }>();
  const productId = params.productId;
  const [learner, setLearner] = useState<Learner | null>(null);
  const [items, setItems] = useState<Summary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [previewChecked, setPreviewChecked] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token =
      new URLSearchParams(window.location.search).get("preview") ?? hash.get("preview");
    setPreviewToken(token && token.trim().length > 0 ? token : null);
    setPreviewChecked(true);
  }, []);

  useEffect(() => {
    if (!previewChecked || previewToken) return;
    let active = true;
    void fetch("/api/v1/learner/me", {
      credentials: "include",
      cache: "no-store",
      headers: learnerHeaders(),
    })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          setDenied(true);
          setLoading(false);
          return;
        }
        const body = (await response.json()) as Learner;
        writeSchoolId(body.schoolId);
        setLearner(body);
      })
      .catch(() => {
        if (active) {
          setError("Unable to load discussions.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [previewChecked, previewToken]);

  const load = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      setError(null);
      const query = new URLSearchParams();
      if (cursor) query.set("cursor", cursor);
      const endpoint = previewToken
        ? `/api/v1/preview/products/${encodeURIComponent(productId)}/discussions`
        : `/api/v1/learner/products/${encodeURIComponent(productId)}/discussions`;
      const response = await fetch(`${endpoint}?${query}`, {
        credentials: "include",
        cache: "no-store",
        headers: learnerHeaders(
          previewToken ? { "x-preview-token": previewToken } : undefined,
        ),
      });
      if (
        response.status === 401 ||
        response.status === 403 ||
        response.status === 404
      ) {
        setDenied(true);
        setLoading(false);
        return;
      }
      const body = (await response.json().catch(() => null)) as {
        items?: Summary[];
        nextCursor?: string | null;
        hasMore?: boolean;
        message?: string;
      } | null;
      if (!response.ok) {
        setError(body?.message ?? "Unable to load discussions.");
        setLoading(false);
        return;
      }
      setItems((current) =>
        cursor ? [...current, ...(body?.items ?? [])] : (body?.items ?? []),
      );
      setNextCursor(body?.nextCursor ?? null);
      setHasMore(Boolean(body?.hasMore));
      setLoading(false);
    },
    [productId, previewToken],
  );

  useEffect(() => {
    if (previewToken || learner) void load();
  }, [learner, load, previewToken]);

  const courseHref = `/dashboard/courses/${encodeURIComponent(productId)}${
    previewToken ? `#preview=${encodeURIComponent(previewToken)}` : ""
  }`;

  return (
    <LearnerShell user={learner}>
      <div className="page-shell">
        <header className="app-header">
          <div>
            <p className="eyebrow">Course</p>
            <h1>Discussions</h1>
            <p className="subtitle">Continue the conversation from each lesson.</p>
          </div>
          <Link
            href={courseHref}
            className="text-sm font-medium text-primary hover:underline"
          >
            Back to course
          </Link>
        </header>
        {denied ? (
          <section className="card stack">
            <h2 className="font-semibold">
              {previewToken ? "Preview unavailable" : "Discussions aren’t available"}
            </h2>
            <p className="muted">
              {previewToken
                ? "This preview has expired or is no longer available."
                : "Enroll in this course to view its discussions."}
            </p>
            <Link href={courseHref}>
              <Button type="button">Go to course</Button>
            </Link>
          </section>
        ) : null}
        {error ? (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        ) : null}
        {!denied && loading && items.length === 0 ? (
          <p className="muted">Loading discussions…</p>
        ) : null}
        {!denied && !loading && items.length === 0 ? (
          <section className="card">
            <p className="muted">No lesson discussions yet.</p>
          </section>
        ) : null}
        {!denied && items.length > 0 ? (
          <section className="card stack" aria-label="Lesson discussions">
            {items.map((item) => (
              <Link
                key={item.entityId}
                href={`/dashboard/courses/${encodeURIComponent(productId)}?discussion=open${previewToken ? `&preview=${encodeURIComponent(previewToken)}` : ""}#lesson-${encodeURIComponent(item.entityId)}`}
                className="rounded-lg border p-4 transition-colors hover:bg-muted"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{item.lessonTitle}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.commentsCount}{" "}
                      {item.commentsCount === 1 ? "comment" : "comments"} ·{" "}
                      {item.repliesCount}{" "}
                      {item.repliesCount === 1 ? "reply" : "replies"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.lastActivityAt).toLocaleString()}
                  </span>
                </div>
              </Link>
            ))}
            {hasMore && nextCursor ? (
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => void load(nextCursor)}
              >
                Load more discussions
              </Button>
            ) : null}
          </section>
        ) : null}
      </div>
    </LearnerShell>
  );
}

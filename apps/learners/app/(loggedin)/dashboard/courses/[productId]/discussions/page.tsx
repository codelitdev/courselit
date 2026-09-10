"use client";

// Course discussions are part of the protected course viewer.
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LearnerShell } from "@/components/layout/learner-shell";
import {
  LearnerButton as Button,
  LearnerCard as PageCard,
  LearnerCardContent as PageCardContent,
  LearnerHeader1,
  LearnerHeader2,
  LearnerText2,
} from "@/components/themed-page-builder";
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
      <div className="grid gap-7">
        <header className="flex items-start justify-between gap-4">
          <div>
            <LearnerText2 className="text-muted-foreground">Course</LearnerText2>
            <LearnerHeader1>Discussions</LearnerHeader1>
            <LearnerText2 className="mt-2 text-muted-foreground">
              Continue the conversation from each lesson.
            </LearnerText2>
          </div>
          <Link
            href={courseHref}
            className="text-sm font-medium text-primary hover:underline"
          >
            Back to course
          </Link>
        </header>
        {denied ? (
          <PageCard>
            <PageCardContent className="grid gap-4">
              <LearnerHeader2>
                {previewToken ? "Preview unavailable" : "Discussions aren’t available"}
              </LearnerHeader2>
              <LearnerText2 className="text-muted-foreground">
                {previewToken
                  ? "This preview has expired or is no longer available."
                  : "Enroll in this course to view its discussions."}
              </LearnerText2>
              <Link href={courseHref}>
                <Button type="button">Go to course</Button>
              </Link>
            </PageCardContent>
          </PageCard>
        ) : null}
        {error ? (
          <LearnerText2 role="alert" className="text-destructive">
            {error}
          </LearnerText2>
        ) : null}
        {!denied && loading && items.length === 0 ? (
          <LearnerText2 className="text-muted-foreground">
            Loading discussions…
          </LearnerText2>
        ) : null}
        {!denied && !loading && items.length === 0 ? (
          <PageCard>
            <PageCardContent>
              <LearnerText2 className="text-muted-foreground">
                No lesson discussions yet.
              </LearnerText2>
            </PageCardContent>
          </PageCard>
        ) : null}
        {!denied && items.length > 0 ? (
          <PageCard aria-label="Lesson discussions">
            <PageCardContent className="grid gap-4">
              {items.map((item) => (
                <Link
                  key={item.entityId}
                  href={`/dashboard/courses/${encodeURIComponent(productId)}?discussion=open${previewToken ? `&preview=${encodeURIComponent(previewToken)}` : ""}#lesson-${encodeURIComponent(item.entityId)}`}
                  className="rounded-lg border p-4 transition-colors hover:bg-muted"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <LearnerHeader2>{item.lessonTitle}</LearnerHeader2>
                      <LearnerText2 className="mt-1 text-muted-foreground">
                        {item.commentsCount}{" "}
                        {item.commentsCount === 1 ? "comment" : "comments"} ·{" "}
                        {item.repliesCount}{" "}
                        {item.repliesCount === 1 ? "reply" : "replies"}
                      </LearnerText2>
                    </div>
                    <LearnerText2
                      component="span"
                      className="text-xs text-muted-foreground"
                    >
                      {new Date(item.lastActivityAt).toLocaleString()}
                    </LearnerText2>
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
            </PageCardContent>
          </PageCard>
        ) : null}
      </div>
    </LearnerShell>
  );
}

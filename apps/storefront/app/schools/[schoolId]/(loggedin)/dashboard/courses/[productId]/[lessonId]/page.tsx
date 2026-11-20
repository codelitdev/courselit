"use client";

// Lesson viewing is protected, except for explicit preview tokens.
import { publicApiPath, useSchoolId } from "@/components/school-context";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLearnerSessionState } from "@/components/auth/learner-session";
import { CourseSpaceDiscussion } from "@/components/course-space-discussion";
import { CourseLitLoading } from "@/components/course-lit-loader";
import {
  type CourseViewerProduct,
  courseViewerHref,
} from "@/components/layout/course-viewer-sidebar";
import { LearnerShell } from "@/components/layout/learner-shell";
import {
  type LearnerLesson,
  LessonContent,
  LessonMediaContent,
} from "@/components/lesson-viewer";
import { requestLessonCompletion } from "@/lib/lesson-completion";
import { learnerHeaders } from "@/lib/school";
import {
  LearnerButton as Button,
  LearnerCard as PageCard,
  LearnerCardContent as PageCardContent,
  LearnerHeader1,
  LearnerText2,
} from "@/components/themed-page-builder";

type Product = {
  id: string;
  title: string;
  kind: "course" | "download";
  discussions: boolean;
  discussionSpaceId: string | null;
  sections: CourseViewerProduct["sections"];
  lessons: LearnerLesson[];
};

export default function LearnerLessonPage() {
  const params = useParams<{ productId: string; lessonId: string }>();
  const productId = params.productId;
  const lessonId = params.lessonId;
  const schoolId = useSchoolId();
  const [product, setProduct] = useState<Product | null>(null);
  const { learner: me } = useLearnerSessionState();
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [previewChecked, setPreviewChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [certificateId, setCertificateId] = useState<string | null>(null);
  // Bumped to load the lesson again, e.g. when its quiz changed.
  const [reloads, setReloads] = useState(0);
  const reloadLesson = useCallback(() => setReloads((count) => count + 1), []);
  const clearActionError = useCallback(() => setActionError(null), []);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = hash.get("preview");
    setPreviewToken(token && token.trim().length > 0 ? token : null);
    setPreviewChecked(true);
  }, []);

  useEffect(() => {
    if (!previewChecked) return;
    let active = true;
    // A reload keeps the lesson on screen; only the first load shows the loader.
    if (reloads === 0) setLoading(true);
    setError(null);
    const url = previewToken
      ? `/api/v1/preview/products/${encodeURIComponent(productId)}`
      : publicApiPath(schoolId, `/products/${encodeURIComponent(productId)}`);
    void fetch(url, {
      credentials: "include",
      cache: "no-store",
      headers: learnerHeaders(
        previewToken ? { "x-preview-token": previewToken } : undefined,
      ),
    })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          setProduct(null);
          setError("That lesson is not available.");
          return;
        }
        setProduct((await response.json()) as Product);
        if (!previewToken) {
          const progressResponse = await fetch(
            `/api/v1/learner/progress?productId=${encodeURIComponent(productId)}`,
            {
              credentials: "include",
              cache: "no-store",
              headers: learnerHeaders(),
            },
          );
          if (progressResponse.ok) {
            const body = (await progressResponse.json()) as {
              items?: Array<{
                lessonId: string;
                completedAt: string | null;
              }>;
            };
            const progress = body.items?.find((item) => item.lessonId === lessonId);
            setCompleted(Boolean(progress?.completedAt));
            setCompletedLessonIds(
              new Set(
                (body.items ?? [])
                  .filter((item) => item.completedAt)
                  .map((item) => item.lessonId),
              ),
            );
          }
        }
      })
      .catch(() => {
        if (active) setError("That lesson is not available.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [lessonId, previewChecked, previewToken, productId, reloads, schoolId]);

  const lesson = useMemo(
    () => product?.lessons.find((item) => item.id === lessonId) ?? null,
    [lessonId, product],
  );
  const lessonIndex = product?.lessons.findIndex((item) => item.id === lessonId) ?? -1;
  const previousLesson = lessonIndex > 0 ? product?.lessons[lessonIndex - 1] : null;
  const nextLesson =
    lessonIndex >= 0 && lessonIndex < (product?.lessons.length ?? 0) - 1
      ? product?.lessons[lessonIndex + 1]
      : null;

  async function completeLesson() {
    setActionError(null);
    const result = await requestLessonCompletion({ lessonId, headers: learnerHeaders });
    if (!result.ok) {
      setActionError(result.message);
      return;
    }
    setCompleted(true);
    setCompletedLessonIds((current) => new Set(current).add(lessonId));
    setCertificateId(result.certificateId);
  }

  if (loading) {
    return (
      <LearnerShell user={me} loading headerTitle="Course">
        <main className="p-6">
          <CourseLitLoading label="Loading lesson…" />
        </main>
      </LearnerShell>
    );
  }
  if (error || !product || !lesson) {
    return (
      <main className="grid gap-5">
        <LearnerText2 role="alert" className="text-destructive">{error ?? "That lesson is not available."}</LearnerText2>
        <Link
          className="font-medium text-primary hover:underline"
          href={`/dashboard/courses/${productId}`}
        >
          Back to course
        </Link>
      </main>
    );
  }

  const hasContent = Boolean(
    lesson.mediaId || (lesson.content && Object.keys(lesson.content).length > 0),
  );

  return (
    <LearnerShell
      user={me}
      course={product.kind === "course" ? product : undefined}
      previewToken={previewToken}
      completedLessonIds={completedLessonIds}
    >
      <div className="grid gap-7">
        <header className="flex items-start justify-between gap-4">
          <div>
            <Link
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
              href={courseViewerHref(
                `/dashboard/courses/${encodeURIComponent(productId)}`,
                previewToken,
              )}
            >
              ← {product.title}
            </Link>
            <LearnerText2 className="mt-4 text-muted-foreground">Lesson</LearnerText2>
            <LearnerHeader1>{lesson.title}</LearnerHeader1>
          </div>
          {previewToken ? <LearnerText2 className="text-muted-foreground">Preview mode</LearnerText2> : null}
        </header>

        <PageCard>
          <PageCardContent className="grid gap-5">
          {lesson.availableAt && !hasContent ? (
            <LearnerText2 className="text-muted-foreground">
              This lesson unlocks on {new Date(lesson.availableAt).toLocaleString()}.
            </LearnerText2>
          ) : lesson.mediaId ? (
            <LessonMediaContent
              lesson={lesson}
              previewToken={previewToken}
              productId={productId}
            />
          ) : lesson.content && Object.keys(lesson.content).length > 0 ? (
            <LessonContent
                content={lesson.content}
                lessonId={lesson.id}
                productId={productId}
                previewToken={previewToken}
                onQuizChanged={reloadLesson}
                onQuizPassed={clearActionError}
              />
          ) : (
            <LearnerText2 className="text-muted-foreground">Enroll to view this lesson.</LearnerText2>
          )}

          {!previewToken && me && hasContent ? (
            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
              {!completed ? (
                <Button type="button" onClick={() => void completeLesson()}>
                  Mark complete
                </Button>
              ) : (
                <LearnerText2>Lesson completed.</LearnerText2>
              )}
              {certificateId ? (
                <Link
                  className="font-medium text-primary hover:underline"
                  href={`/certificates/${encodeURIComponent(certificateId)}`}
                >
                  View certificate
                </Link>
              ) : null}
            </div>
          ) : null}
          {actionError ? <LearnerText2 role="alert" className="text-destructive">{actionError}</LearnerText2> : null}
          </PageCardContent>
        </PageCard>

        {(previewToken || (product.discussions && me)) &&
        product.discussionSpaceId &&
        hasContent ? (
          <CourseSpaceDiscussion
            spaceId={product.discussionSpaceId}
            previewToken={previewToken}
          />
        ) : null}

        {previewToken || (Boolean(me) && hasContent) ? (
          <nav
            className="sticky bottom-4 z-20 flex justify-end gap-2"
            aria-label="Lesson navigation"
          >
            <Link
              aria-label={
                previousLesson ? `Previous: ${previousLesson.title}` : "Course overview"
              }
              href={courseViewerHref(
                previousLesson
                  ? `/dashboard/courses/${encodeURIComponent(productId)}/${encodeURIComponent(previousLesson.id)}`
                  : `/dashboard/courses/${encodeURIComponent(productId)}`,
                previewToken,
              )}
            >
              <Button variant="secondary" size="sm">
                <ArrowLeft className="mr-1 size-4" />
                <span className="hidden sm:inline">
                  {previousLesson ? "Previous" : "Overview"}
                </span>
              </Button>
            </Link>
            <Link
              aria-label={nextLesson ? `Next: ${nextLesson.title}` : "Finish course"}
              href={courseViewerHref(
                nextLesson
                  ? `/dashboard/courses/${encodeURIComponent(productId)}/${encodeURIComponent(nextLesson.id)}`
                  : `/dashboard/courses/${encodeURIComponent(productId)}`,
                previewToken,
              )}
            >
              <Button variant="secondary" size="sm">
                <span className="hidden sm:inline">
                  {nextLesson ? "Next" : "Finish"}
                </span>
                <ArrowRight className="ml-1 size-4" />
              </Button>
            </Link>
          </nav>
        ) : null}
      </div>
    </LearnerShell>
  );
}

"use client";

// Lesson viewing is protected, except for explicit preview tokens.
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CourseDiscussions } from "@/components/course-discussions";
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
import { learnerHeaders, writeSchoolId } from "@/lib/school";
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
  sections: CourseViewerProduct["sections"];
  lessons: LearnerLesson[];
};

export default function LearnerLessonPage() {
  const params = useParams<{ productId: string; lessonId: string }>();
  const productId = params.productId;
  const lessonId = params.lessonId;
  const [product, setProduct] = useState<Product | null>(null);
  const [me, setMe] = useState<{
    id: string;
    email: string;
    name: string;
    schoolId: string;
  } | null>(null);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [previewChecked, setPreviewChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [certificateId, setCertificateId] = useState<string | null>(null);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = hash.get("preview");
    setPreviewToken(token && token.trim().length > 0 ? token : null);
    setPreviewChecked(true);
  }, []);

  useEffect(() => {
    if (!previewChecked || previewToken) return;
    void fetch("/api/v1/learner/me", {
      credentials: "include",
      cache: "no-store",
      headers: learnerHeaders(),
    }).then(async (response) => {
      if (!response.ok) return;
      const body = (await response.json()) as {
        id: string;
        email: string;
        name: string;
        schoolId: string;
      };
      writeSchoolId(body.schoolId);
      setMe(body);
    });
  }, [previewChecked, previewToken]);

  useEffect(() => {
    if (!previewChecked) return;
    let active = true;
    setLoading(true);
    setError(null);
    const url = previewToken
      ? `/api/v1/preview/products/${encodeURIComponent(productId)}`
      : `/api/v1/products/${encodeURIComponent(productId)}`;
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
  }, [lessonId, previewChecked, previewToken, productId]);

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
    const response = await fetch(
      `/api/v1/learner/lessons/${encodeURIComponent(lessonId)}/complete`,
      {
        method: "POST",
        credentials: "include",
        headers: learnerHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({}),
      },
    );
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        details?: { reason?: string };
      } | null;
      setActionError(
        body?.details?.reason === "need_to_pass"
          ? "Pass the quiz before marking this lesson complete."
          : body?.details?.reason === "scorm_content_incomplete"
            ? "Complete the SCORM activity before marking this lesson complete."
            : "Unable to complete the lesson.",
      );
      return;
    }
    const body = (await response.json()) as { certificateId?: string | null };
    setCompleted(true);
    setCompletedLessonIds((current) => new Set(current).add(lessonId));
    setCertificateId(body.certificateId ?? null);
  }

  if (loading) return <main className="p-6"><LearnerText2>Loading lesson…</LearnerText2></main>;
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
            previewToken && lesson.type === "quiz" ? (
              <LearnerText2 className="text-muted-foreground">Quiz content is available after enrollment.</LearnerText2>
            ) : (
              <LessonContent
                content={lesson.content}
                lessonId={lesson.id}
                productId={productId}
                type={lesson.type}
              />
            )
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

        {(previewToken || (product.discussions && me)) && hasContent ? (
          <CourseDiscussions
            enabled
            lessonId={lesson.id}
            productId={productId}
            viewerId={me?.id ?? "preview"}
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

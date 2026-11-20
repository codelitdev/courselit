"use client";

import { lessonProfile } from "@courselit/lesson-content";
import { type TextEditorContent, TextRenderer } from "@frontlit/text-editor";
import { useEffect, useState } from "react";
import { CourseLitLoading } from "@/components/course-lit-loader";
import { QuizViewer } from "@/components/quiz-viewer";
import { publicApiPath, useSchoolId } from "@/components/school-context";
import { ScormViewer } from "@/components/scorm-viewer";
import { LearnerText2 } from "@/components/themed-page-builder";
import { splitLessonPage } from "@/lib/lesson-page";
import { learnerHeaders } from "@/lib/school";
import { useSchoolThemeStyle } from "@/lib/school-theme-context";

export type LearnerLesson = {
  id: string;
  title: string;
  type: "page" | "scorm" | "file";
  status: string;
  requiresEnrollment: boolean;
  sectionId: string | null;
  mediaId: string | null;
  content: Record<string, unknown> | null;
  availableAt: string | null;
};

/**
 * A lesson page, temporarily: the document through FrontLit's renderer with
 * the lesson profile, then the quiz below it. Media blocks render nothing
 * yet (no `resolveMedia`). Step 4 of docs/wip/lesson-pages.md replaces this
 * with a page-builder renderer that resolves media through
 * `…/lessons/:lessonId/media/:mediaId` and places the quiz in the page.
 */
export function LessonContent({
  content,
  productId,
  lessonId,
  quizAvailable = true,
}: {
  content: Record<string, unknown>;
  productId: string;
  lessonId: string;
  /** False in previews: grading needs an enrolled learner. */
  quizAvailable?: boolean;
}) {
  const theme = useSchoolThemeStyle();
  const { document, quiz } = splitLessonPage(content);
  if (!document) {
    return (
      <LearnerText2 className="text-muted-foreground">
        This lesson type is not available in this viewer yet.
      </LearnerText2>
    );
  }
  return (
    <>
      <TextRenderer
        json={document as unknown as TextEditorContent}
        profile={lessonProfile}
        theme={theme}
        className="lesson-rich-text"
      />
      {quiz && quizAvailable ? (
        <QuizViewer content={quiz} lessonId={lessonId} productId={productId} />
      ) : quiz ? (
        <LearnerText2 className="text-muted-foreground">
          Quiz content is available after enrollment.
        </LearnerText2>
      ) : null}
    </>
  );
}

export function LessonMediaContent({
  productId,
  lesson,
  previewToken,
}: {
  productId: string;
  lesson: LearnerLesson;
  previewToken: string | null;
}) {
  const schoolId = useSchoolId();
  const [media, setMedia] = useState<{
    url: string;
    thumbnailUrl: string | null;
    fileName: string;
    mimeType: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setMedia(null);
    setFailed(false);
    setLoading(true);
    if (!lesson.mediaId) {
      setLoading(false);
      return;
    }
    let active = true;
    const base = previewToken
      ? `/api/v1/preview/products/${encodeURIComponent(productId)}/lessons/${encodeURIComponent(lesson.id)}/media`
      : publicApiPath(
          schoolId,
          `/products/${encodeURIComponent(productId)}/lessons/${encodeURIComponent(lesson.id)}/media`,
        );
    void fetch(base, {
      credentials: "include",
      cache: "no-store",
      headers: learnerHeaders(
        previewToken ? { "x-preview-token": previewToken } : undefined,
      ),
    })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          setFailed(true);
          setLoading(false);
          return;
        }
        setMedia(
          (await response.json()) as {
            url: string;
            thumbnailUrl: string | null;
            fileName: string;
            mimeType: string;
          },
        );
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setFailed(true);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [lesson.id, lesson.mediaId, previewToken, productId, schoolId]);

  if (loading) return <CourseLitLoading label="Loading lesson media…" />;
  if (failed || !media)
    return (
      <LearnerText2 className="text-muted-foreground">
        This media is unavailable.
      </LearnerText2>
    );
  if (lesson.type === "scorm") {
    if (previewToken) {
      return (
        <LearnerText2 className="text-muted-foreground">
          SCORM content is available after enrollment.
        </LearnerText2>
      );
    }
    const launchUrl =
      lesson.content && typeof lesson.content.launchUrl === "string"
        ? lesson.content.launchUrl
        : "index.html";
    return (
      <ScormViewer productId={productId} lessonId={lesson.id} launchUrl={launchUrl} />
    );
  }
  return (
    <a
      href={media.url}
      download={media.fileName}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-primary hover:underline"
    >
      <LearnerText2 component="span" className="font-medium text-primary">
        Open {media.fileName}
      </LearnerText2>
    </a>
  );
}

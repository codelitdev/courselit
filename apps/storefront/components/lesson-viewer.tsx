"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { CourseLitLoading } from "@/components/course-lit-loader";
import { LessonPageRenderer } from "@/components/lesson-page-renderer";
import { publicApiPath, useSchoolId } from "@/components/school-context";
import { ScormViewer } from "@/components/scorm-viewer";
import { LearnerButton, LearnerText2 } from "@/components/themed-page-builder";
import { readLessonPage } from "@/lib/lesson-page";
import { learnerHeaders } from "@/lib/school";

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

/** A page lesson's content; SCORM and file lessons render through `LessonMediaContent`. */
export function LessonContent({
  content,
  productId,
  lessonId,
  previewToken,
  onQuizChanged,
  onQuizPassed,
}: {
  content: Record<string, unknown>;
  productId: string;
  lessonId: string;
  previewToken: string | null;
  /** The author replaced the quiz since the lesson loaded: load it again. */
  onQuizChanged?: () => void;
  onQuizPassed?: () => void;
}) {
  const document = readLessonPage(content);
  if (!document) {
    return (
      <LearnerText2 className="text-muted-foreground">
        This lesson can't be shown.
      </LearnerText2>
    );
  }
  return (
    <LessonPageRenderer
      document={document}
      productId={productId}
      lessonId={lessonId}
      previewToken={previewToken}
      onQuizChanged={onQuizChanged ?? reloadWindow}
      onQuizPassed={onQuizPassed}
    />
  );
}

function reloadWindow() {
  window.location.reload();
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
    <LearnerButton asChild variant="outline" className="w-fit">
      <a href={media.url} download={media.fileName} target="_blank" rel="noreferrer">
        <Download aria-hidden className="size-4" />
        Open {media.fileName}
      </a>
    </LearnerButton>
  );
}

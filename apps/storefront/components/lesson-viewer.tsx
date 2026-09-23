"use client";

import { type TextEditorContent, TextRenderer } from "@frontlit/text-editor";
import { useEffect, useState } from "react";
import { EmbedViewer } from "@/components/embed-viewer";
import { QuizViewer } from "@/components/quiz-viewer";
import { ScormViewer } from "@/components/scorm-viewer";
import { CourseLitLoading } from "@/components/course-lit-loader";
import { LearnerText2 } from "@/components/themed-page-builder";
import { learnerHeaders } from "@/lib/school";
import { useSchoolThemeStyle } from "@/lib/school-theme-context";

export type LearnerLesson = {
  id: string;
  title: string;
  type: "text" | "video" | "audio" | "pdf" | "file" | "embed" | "quiz" | "scorm";
  status: string;
  downloadable: boolean;
  requiresEnrollment: boolean;
  sectionId: string | null;
  mediaId: string | null;
  content: Record<string, unknown> | null;
  availableAt: string | null;
};

export function LessonContent({
  content,
  productId,
  lessonId,
  type,
}: {
  content: Record<string, unknown>;
  productId: string;
  lessonId: string;
  type?: LearnerLesson["type"];
}) {
  const theme = useSchoolThemeStyle();
  if (type === "embed" && typeof content.value === "string") {
    return <EmbedViewer value={content.value} />;
  }
  if (Array.isArray(content.questions)) {
    return <QuizViewer content={content} lessonId={lessonId} productId={productId} />;
  }
  if (content.type === "doc" && Array.isArray(content.content)) {
    return (
      <TextRenderer
        json={content as unknown as TextEditorContent}
        theme={theme}
        className="lesson-rich-text"
      />
    );
  }
  if (typeof content.value === "string") {
    return <LearnerText2 className="lesson-body">{content.value}</LearnerText2>;
  }
  return (
    <LearnerText2 className="text-muted-foreground">
      This lesson type is not available in this viewer yet.
    </LearnerText2>
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
      : `/api/v1/products/${encodeURIComponent(productId)}/lessons/${encodeURIComponent(lesson.id)}/media`;
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
  }, [lesson.id, lesson.mediaId, previewToken, productId]);

  if (loading) return <CourseLitLoading label="Loading lesson media…" />;
  if (failed || !media)
    return (
      <LearnerText2 className="text-muted-foreground">
        This media is unavailable.
      </LearnerText2>
    );
  if (lesson.type === "video") {
    return (
      // MediaLit currently supplies no caption-track asset in this contract.
      // biome-ignore lint/a11y/useMediaCaption: caption tracks are not available for this media reference yet
      <video
        className="w-full rounded-lg"
        controls
        controlsList="nodownload"
        onContextMenu={(event) => event.preventDefault()}
        poster={media.thumbnailUrl ?? undefined}
        src={media.url}
      />
    );
  }
  if (lesson.type === "audio") {
    return (
      // MediaLit currently supplies no caption-track asset in this contract.
      // biome-ignore lint/a11y/useMediaCaption: caption tracks are not available for this media reference yet
      <audio
        className="w-full"
        controls
        controlsList="nodownload"
        onContextMenu={(event) => event.preventDefault()}
        src={media.url}
      />
    );
  }
  if (lesson.type === "pdf") {
    return (
      <iframe
        className="h-[500px] w-full rounded-lg border"
        title={media.fileName}
        src={`${media.url}#view=fit`}
      />
    );
  }
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
      download={lesson.downloadable ? media.fileName : undefined}
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

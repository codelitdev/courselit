"use client";

import { MediaUploadDialog, type SelectedMedia } from "@frontlit/media-uploader";
import { CheckCircle, FileWarning, Package, Upload } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/codelit/button";
import {
  type CourseLitMedia,
  filterCourseLitMediaAdapters,
  mediaMatchesAcceptedTypes,
  useCourseLitMediaUploader,
} from "@/lib/course-media-uploader";
import type { LessonContent, School } from "./product-types";

const SCORM_PACKAGE_SIZE_LIMIT = 300 * 1024 * 1024;
const SCORM_ACCEPTED_TYPES = [
  ".zip",
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
];

type ScormApiErrorBody = {
  message?: unknown;
  details?: {
    entryPoint?: unknown;
    reason?: unknown;
  };
};

async function scormResponseError(
  response: Response,
  fallback: string,
): Promise<string> {
  const body = (await response.json().catch(() => null)) as ScormApiErrorBody | null;
  const reason = body?.details?.reason;
  if (reason === "scorm_manifest_missing") {
    return "Invalid SCORM package: imsmanifest.xml not found";
  }
  if (reason === "scorm_entry_point_missing") {
    return "Invalid SCORM package: no entry point found in the manifest";
  }
  if (reason === "scorm_entry_point_not_found") {
    const entryPoint = body?.details?.entryPoint;
    return typeof entryPoint === "string" && entryPoint
      ? `Invalid SCORM package: Entry point "${entryPoint}" not found`
      : "Invalid SCORM package: entry point not found";
  }
  if (reason === "scorm_media_must_be_a_package") {
    return "Invalid SCORM package: the selected media is not a ZIP package";
  }
  if (reason === "scorm_package_too_large") {
    return "SCORM package exceeds the maximum allowed size (300MB)";
  }
  return typeof body?.message === "string" && body.message.trim()
    ? body.message
    : fallback;
}

export function ScormLessonUpload({
  school,
  lessonId,
  content,
  onUploadComplete,
}: {
  school: School;
  lessonId: string;
  content: LessonContent;
  onUploadComplete: (content: LessonContent, mediaId: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const adapters = useCourseLitMediaUploader({
    schoolId: school.id,
    purpose: "lesson_media",
    accessPolicy: "private",
  });
  const filteredAdapters = filterCourseLitMediaAdapters(adapters, SCORM_ACCEPTED_TYPES);

  async function processPackage(media: CourseLitMedia) {
    setUploading(true);
    setError(null);
    const headers = {
      "content-type": "application/json",
      "x-school-id": school.id,
    };
    try {
      const processResponse = await fetch(
        `/api/v1/lessons/${encodeURIComponent(lessonId)}/scorm/process`,
        {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify({ mediaId: media.id }),
        },
      );
      if (!processResponse.ok) {
        throw new Error(
          await scormResponseError(
            processResponse,
            "Unable to validate and process the SCORM package.",
          ),
        );
      }
      const processed = (await processResponse.json()) as {
        packageInfo?: {
          title: string;
          version: "1.2" | "2004";
          entryPoint: string;
          scoCount: number;
          fileCount: number;
        };
      };
      if (!processed.packageInfo) {
        throw new Error("SCORM package metadata was not returned.");
      }

      const nextContent: LessonContent = {
        ...content,
        mediaId: media.id,
        title: processed.packageInfo.title,
        launchUrl: processed.packageInfo.entryPoint,
        version: processed.packageInfo.version,
        scoCount: processed.packageInfo.scoCount,
        fileCount: processed.packageInfo.fileCount,
      };
      const lessonResponse = await fetch(
        `/api/v1/lessons/${encodeURIComponent(lessonId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers,
          body: JSON.stringify({ content: nextContent, mediaId: media.id }),
        },
      );
      if (!lessonResponse.ok) {
        throw new Error(
          await scormResponseError(
            lessonResponse,
            "Unable to attach the SCORM package to the lesson.",
          ),
        );
      }
      onUploadComplete(nextContent, media.id);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to process the SCORM package.",
      );
    } finally {
      setUploading(false);
    }
  }

  function selectPackage(selected: SelectedMedia<CourseLitMedia>) {
    if (!selected.media) {
      setError("SCORM packages must be stored in the private media library.");
      return;
    }
    if (!mediaMatchesAcceptedTypes(selected.media, SCORM_ACCEPTED_TYPES)) {
      setError("This media is not a valid SCORM ZIP package.");
      return;
    }
    void processPackage(selected.media);
  }

  const packageTitle = typeof content.title === "string" ? content.title : null;
  const packageVersion = typeof content.version === "string" ? content.version : null;
  const packageFileCount =
    typeof content.fileCount === "number" ? content.fileCount : null;

  return (
    <div className="space-y-4">
      {error ? (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <FileWarning className="size-4" />
          {error}
        </div>
      ) : null}
      {packageTitle ? (
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-primary/10 p-2">
              <Package className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{packageTitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Version {packageVersion ?? "1.2"} · {packageFileCount ?? 0} files
              </p>
            </div>
          </div>
          <CheckCircle className="size-5 text-green-500" />
        </div>
      ) : null}
      <div>
        <MediaUploadDialog<CourseLitMedia>
          {...filteredAdapters}
          title="Select SCORM package"
          acceptedTypes={SCORM_ACCEPTED_TYPES}
          maxUploadBytes={SCORM_PACKAGE_SIZE_LIMIT}
          allowUnsplash={false}
          defaultTab="upload"
          metadataMode="title"
          onSelect={selectPackage}
        >
          <Button
            type="button"
            variant={packageTitle ? "outline" : "primary"}
            disabled={uploading}
          >
            <Upload className="size-4" />
            {uploading
              ? "Processing…"
              : packageTitle
                ? "Replace package"
                : "Upload SCORM package"}
          </Button>
        </MediaUploadDialog>
        <p className="mt-2 text-xs text-muted-foreground">
          Upload a SCORM 1.2 or 2004 package as a ZIP file (maximum 300MB).
        </p>
      </div>
    </div>
  );
}

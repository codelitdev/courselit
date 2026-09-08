"use client";

import { MediaUploadDialog, type SelectedMedia } from "@frontlit/media-uploader";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/codelit/button";
import {
  type CourseLitMedia,
  filterCourseLitMediaAdapters,
  getCourseLitMedia,
  mediaMatchesAcceptedTypes,
  useCourseLitMediaUploader,
} from "@/lib/course-media-uploader";
import type { LessonType, School } from "./product-types";

function acceptedTypesForLesson(lessonType: LessonType): string[] | undefined {
  switch (lessonType) {
    case "video":
      return ["video/*"];
    case "audio":
      return ["audio/*"];
    case "pdf":
      return ["application/pdf", ".pdf"];
    case "scorm":
      return [
        ".zip",
        "application/zip",
        "application/x-zip-compressed",
        "application/octet-stream",
      ];
    case "file":
      return ["*/*"];
    default:
      return undefined;
  }
}

export function MediaPicker({
  school,
  lessonType,
  value,
  onChange,
}: {
  school: School;
  lessonType: LessonType;
  value: string | null;
  onChange: (mediaId: string | null) => void;
}) {
  const [selectedItem, setSelectedItem] = useState<CourseLitMedia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const adapters = useCourseLitMediaUploader({
    schoolId: school.id,
    purpose: "lesson_media",
    accessPolicy: "private",
  });
  const acceptedTypes = useMemo(() => acceptedTypesForLesson(lessonType), [lessonType]);
  const filteredAdapters = filterCourseLitMediaAdapters(adapters, acceptedTypes);

  useEffect(() => {
    if (!value) {
      setSelectedItem(null);
      setError(null);
      return;
    }
    let active = true;
    void getCourseLitMedia(school.id, value)
      .then((item) => {
        if (!active) return;
        setSelectedItem(item);
        if (item && !mediaMatchesAcceptedTypes(item, acceptedTypes)) {
          setError("The selected media does not match this lesson type.");
        } else {
          setError(null);
        }
      })
      .catch(() => {
        if (active) {
          setSelectedItem(null);
          setError(null);
        }
      });
    return () => {
      active = false;
    };
  }, [acceptedTypes, school.id, value]);

  function selectMedia(selected: SelectedMedia<CourseLitMedia>) {
    if (!selected.media) {
      setError("Lesson media must be stored in the private MediaLit library.");
      return;
    }
    if (!mediaMatchesAcceptedTypes(selected.media, acceptedTypes)) {
      setError("This media does not match the selected lesson type.");
      return;
    }
    setError(null);
    setSelectedItem(selected.media);
    onChange(selected.media.id);
  }

  return (
    <div className="space-y-3">
      {selectedItem ? (
        <div className="flex items-center gap-3 rounded-md border bg-card p-3">
          {selectedItem.thumbnailUrl ? (
            <Image
              src={selectedItem.thumbnailUrl}
              alt={selectedItem.fileName}
              width={56}
              height={56}
              unoptimized
              className="size-14 rounded object-cover"
            />
          ) : (
            <div className="flex size-14 items-center justify-center rounded bg-muted px-1 text-center text-[10px] text-muted-foreground">
              {selectedItem.mimeType}
            </div>
          )}
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium">{selectedItem.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {selectedItem.mimeType} · {selectedItem.accessPolicy}
            </p>
          </div>
        </div>
      ) : null}
      <div className="field block">
        <span>Media asset</span>
        <MediaUploadDialog<CourseLitMedia>
          {...filteredAdapters}
          title="Select lesson media"
          acceptedTypes={acceptedTypes}
          allowUnsplash={false}
          onSelect={selectMedia}
        >
          <Button type="button" variant="outline" size="sm" className="w-fit">
            {value ? "Change media" : "Select or upload media"}
          </Button>
        </MediaUploadDialog>
        {value ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedItem(null);
              setError(null);
              onChange(null);
            }}
          >
            Remove
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

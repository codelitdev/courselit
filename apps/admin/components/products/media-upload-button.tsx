"use client";

import { MediaUploadDialog, type SelectedMedia } from "@frontlit/media-uploader";
import { ImageIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/codelit/button";
import {
  type CourseLitMedia,
  filterCourseLitMediaAdapters,
  type MediaAccessPolicy,
  type MediaUploadPurpose,
  mediaMatchesAcceptedTypes,
  useCourseLitMediaUploader,
} from "@/lib/course-media-uploader";
import type { School } from "./product-types";

export type UploadedMedia = CourseLitMedia;

function mediaLabel(acceptedTypes?: string[]): "image" | "video" | "media" {
  if (acceptedTypes?.some((type) => type.startsWith("image/"))) return "image";
  if (acceptedTypes?.some((type) => type.startsWith("video/"))) return "video";
  return "media";
}

function acceptedTypesFromAttribute(accept: string): string[] | undefined {
  const values = accept
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return values.length > 0 ? values : undefined;
}

export function MediaField({
  school,
  purpose,
  media,
  onChange,
  accept = "image/*",
  accessPolicy = "public",
  allowUnsplash = false,
  disabled = false,
}: {
  school: School;
  purpose: MediaUploadPurpose;
  media: UploadedMedia | null;
  onChange: (media: UploadedMedia | null) => void | Promise<void>;
  accept?: string;
  accessPolicy?: MediaAccessPolicy;
  allowUnsplash?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const adapters = useCourseLitMediaUploader({
    schoolId: school.id,
    purpose,
    accessPolicy,
  });
  const acceptedTypes = acceptedTypesFromAttribute(accept);
  const filteredAdapters = filterCourseLitMediaAdapters(adapters, acceptedTypes);
  const label = mediaLabel(acceptedTypes);
  const displayName =
    media?.alt?.trim() ||
    media?.altText?.trim() ||
    media?.fileName ||
    media?.title?.trim() ||
    "Media";

  function selectMedia(selected: SelectedMedia<CourseLitMedia>) {
    if (!selected.media) {
      setError("Select a media library item or upload the file first.");
      return;
    }
    if (!mediaMatchesAcceptedTypes(selected.media, acceptedTypes)) {
      setError("This media does not match the accepted file type.");
      return;
    }
    setError(null);
    void Promise.resolve(onChange(selected.media)).catch((caught) => {
      setError(caught instanceof Error ? caught.message : "Unable to use this media.");
    });
  }

  function removeMedia() {
    setError(null);
    void Promise.resolve(onChange(null)).catch((caught) => {
      setError(
        caught instanceof Error ? caught.message : "Unable to remove this media.",
      );
    });
  }

  return (
    <div className="space-y-2">
      {media ? (
        <div className="flex items-start gap-3">
          <div className="flex h-24 w-36 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
            {media.thumbnailUrl ||
            (media.mimeType.startsWith("image/") && media.url) ? (
              <img
                src={media.thumbnailUrl || media.url}
                alt={displayName}
                className="size-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-1 px-2 text-center text-muted-foreground">
                <ImageIcon className="size-6" />
                <span className="text-xs">{media.mimeType}</span>
              </div>
            )}
          </div>
          <div className="min-w-0 space-y-2">
            <p className="truncate text-sm" title={displayName}>
              {displayName}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={removeMedia}
              disabled={disabled}
            >
              Remove {label}
            </Button>
          </div>
        </div>
      ) : null}
      <MediaUploadDialog<CourseLitMedia>
        {...filteredAdapters}
        open={open}
        onOpenChange={setOpen}
        title={`${media ? "Change" : "Select"} ${label}`}
        acceptedTypes={acceptedTypes}
        allowUnsplash={allowUnsplash}
        onSelect={selectMedia}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setError(null)}
          disabled={disabled}
        >
          {media ? `Change ${label}` : `Select ${label}`}
        </Button>
      </MediaUploadDialog>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

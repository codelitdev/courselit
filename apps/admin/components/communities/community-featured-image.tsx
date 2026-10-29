"use client";

import type { MediaRef } from "@courselit/api-contract";
import { ImageUploadDialog, type SelectedMedia } from "@frontlit/media-uploader";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/codelit/button";
import {
  type CourseLitMedia,
  filterCourseLitMediaAdapters,
  mediaMatchesAcceptedTypes,
  useCourseLitMediaUploader,
} from "@/lib/course-media-uploader";
import { toMediaRef } from "@/lib/media-ref";

const COMMUNITY_IMAGE_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export function CommunityFeaturedImage({
  school,
  value,
  disabled = false,
  onChange,
}: {
  school: { id: string };
  value: MediaRef | null;
  disabled?: boolean;
  onChange: (value: MediaRef | null) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const adapters = useCourseLitMediaUploader({
    schoolId: school.id,
    purpose: "community_artwork",
    accessPolicy: "public",
  });
  const filteredAdapters = filterCourseLitMediaAdapters(
    adapters,
    COMMUNITY_IMAGE_ACCEPTED_TYPES,
  );

  function selectImage(selected: SelectedMedia<CourseLitMedia>) {
    if (
      selected.media &&
      !mediaMatchesAcceptedTypes(selected.media, COMMUNITY_IMAGE_ACCEPTED_TYPES)
    ) {
      setError("Featured images must be JPEG, PNG, GIF, or WebP images.");
      return;
    }
    setError(null);
    onChange(toMediaRef(selected));
  }

  const details = [
    value?.byteSize ? formatBytes(value.byteSize) : null,
    value?.mimeType?.replace(/^image\//, "").toUpperCase(),
  ].filter(Boolean);

  return (
    <div className="field">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium">Featured image</span>
        <span className="text-xs text-muted-foreground">1200 × 630 works best</span>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {value ? (
          <Image
            src={value.thumbnailUrl ?? value.url}
            alt={value.alt || "Community featured image"}
            width={168}
            height={88}
            unoptimized
            className="h-[88px] w-[168px] rounded-md border object-cover"
          />
        ) : (
          <div className="flex h-[88px] w-[168px] items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
            No image
          </div>
        )}
        <div className="min-w-0 flex-1 text-sm">
          {value ? (
            <>
              <p className="truncate font-mono">
                {value.fileName || value.alt || "Featured image"}
              </p>
              {details.length > 0 ? (
                <p className="font-mono text-xs text-muted-foreground">
                  {details.join(" · ")}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-muted-foreground">
              Shown on your sales page and when learners discover the community.
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <ImageUploadDialog<CourseLitMedia>
            {...filteredAdapters}
            title="Select community image"
            acceptedTypes={COMMUNITY_IMAGE_ACCEPTED_TYPES}
            allowUnsplash
            metadataMode="alt"
            onSelect={selectImage}
          >
            <Button type="button" variant="ghost" size="sm" disabled={disabled}>
              {value ? "Replace" : "Add image"}
            </Button>
          </ImageUploadDialog>
          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => onChange(null)}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

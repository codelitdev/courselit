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

  return (
    <section className="card stack">
      <div>
        <h2 className="font-semibold">Featured image</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The image shown when learners discover this community.
        </p>
      </div>
      {value ? (
        <div className="flex flex-wrap items-start gap-4">
          <Image
            src={value.thumbnailUrl ?? value.url}
            alt={value.alt || "Community featured image"}
            width={176}
            height={112}
            unoptimized
            className="h-28 w-44 rounded-md border object-cover"
          />
          <div className="space-y-2 text-sm">
            <p className="font-medium">{value.alt || value.url}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => onChange(null)}
            >
              Remove image
            </Button>
          </div>
        </div>
      ) : null}
      <ImageUploadDialog<CourseLitMedia>
        {...filteredAdapters}
        title="Select community image"
        acceptedTypes={COMMUNITY_IMAGE_ACCEPTED_TYPES}
        allowUnsplash
        metadataMode="alt"
        onSelect={selectImage}
      >
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          {value ? "Change image" : "Select an image"}
        </Button>
      </ImageUploadDialog>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}

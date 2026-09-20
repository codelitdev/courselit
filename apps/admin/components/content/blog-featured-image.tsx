"use client";

import type { MediaRef } from "@courselit/api-contract";
import { ImageUploadDialog, type SelectedImage } from "@frontlit/media-uploader";
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

const BLOG_IMAGE_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

type BlogFeaturedImageValue = MediaRef;

function imageUrl(value: BlogFeaturedImageValue | null | undefined): string | null {
  return value?.thumbnailUrl ?? value?.url ?? null;
}

export function BlogFeaturedImage({
  school,
  value,
  disabled = false,
  onChange,
}: {
  school: { id: string };
  value: BlogFeaturedImageValue | null | undefined;
  disabled?: boolean;
  onChange: (value: BlogFeaturedImageValue | null) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const adapters = useCourseLitMediaUploader({
    schoolId: school.id,
    purpose: "blog_artwork",
    accessPolicy: "public",
  });
  const filteredAdapters = filterCourseLitMediaAdapters(
    adapters,
    BLOG_IMAGE_ACCEPTED_TYPES,
  );
  const previewUrl = imageUrl(value);

  function selectImage(selected: SelectedImage<CourseLitMedia>) {
    if (!selected.media) {
      setError("Featured images must be stored in the media library.");
      return;
    }
    if (!mediaMatchesAcceptedTypes(selected.media, BLOG_IMAGE_ACCEPTED_TYPES)) {
      setError("Featured images must be JPEG, PNG, GIF, or WebP images.");
      return;
    }
    setError(null);
    onChange(toMediaRef(selected));
  }

  return (
    <section className="border-t pt-6">
      <div>
        <h3 className="text-sm font-semibold">Featured image</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Shown on the public blog post and used for social previews.
        </p>
      </div>
      {previewUrl ? (
        <div className="mt-3 space-y-3">
          <Image
            src={previewUrl}
            alt={value?.alt ?? ""}
            width={640}
            height={360}
            unoptimized
            className="aspect-video w-full rounded-md border object-cover"
          />
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
      ) : null}
      <ImageUploadDialog<CourseLitMedia>
        {...filteredAdapters}
        title="Select blog featured image"
        acceptedTypes={BLOG_IMAGE_ACCEPTED_TYPES}
        allowUnsplash={false}
        metadataMode="alt"
        onSelect={selectImage}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          disabled={disabled}
        >
          {previewUrl ? "Change image" : "Select an image"}
        </Button>
      </ImageUploadDialog>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}

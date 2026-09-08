"use client";

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

const COMMUNITY_IMAGE_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export type CommunityFeaturedMedia = {
  id: string;
  canonicalUrl: string;
  thumbnailUrl: string | null;
  fileName: string;
  altText: string;
};

export function CommunityFeaturedImage({
  school,
  value,
  disabled = false,
  onChange,
}: {
  school: { id: string };
  value: CommunityFeaturedMedia | null;
  disabled?: boolean;
  onChange: (mediaId: string | null) => void;
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

  async function selectImage(selected: SelectedImage<CourseLitMedia>) {
    if (!selected.media) {
      const uploadMedia = adapters.uploadMedia;
      if (!uploadMedia) {
        setError("Featured images must be stored in the MediaLit library.");
        return;
      }
      try {
        const response = await fetch(selected.src);
        if (!response.ok) throw new Error("Unable to download the Unsplash image.");
        const blob = await response.blob();
        const fileName = selected.fileName || "unsplash-image.jpg";
        const mimeType = blob.type || selected.mimeType || "image/jpeg";
        if (
          !mediaMatchesAcceptedTypes(
            { fileName, mimeType },
            COMMUNITY_IMAGE_ACCEPTED_TYPES,
          )
        ) {
          setError("Featured images must be JPEG, PNG, GIF, or WebP images.");
          return;
        }
        const media = await uploadMedia(
          new File([blob], fileName, { type: mimeType }),
          {
            alt: selected.alt,
            fileName,
            mimeType,
          },
        );
        setError(null);
        onChange(media.id);
      } catch {
        setError("Unable to import the Unsplash image into the MediaLit library.");
      }
      return;
    }
    if (!mediaMatchesAcceptedTypes(selected.media, COMMUNITY_IMAGE_ACCEPTED_TYPES)) {
      setError("Featured images must be JPEG, PNG, GIF, or WebP images.");
      return;
    }
    setError(null);
    onChange(selected.media.id);
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
            src={value.thumbnailUrl ?? value.canonicalUrl}
            alt={value.altText || value.fileName}
            width={176}
            height={112}
            unoptimized
            className="h-28 w-44 rounded-md border object-cover"
          />
          <div className="space-y-2 text-sm">
            <p className="font-medium">{value.fileName}</p>
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

"use client";

import { ImageUploadDialog, type SelectedImage } from "@frontlit/media-uploader";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/codelit/button";
import {
  type CourseLitMedia,
  filterCourseLitMediaAdapters,
  mediaMatchesAcceptedTypes,
  useCourseLitMediaUploader,
} from "@/lib/course-media-uploader";
import type { Product, School } from "./product-types";

const PRODUCT_IMAGE_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export function ProductFeaturedImage({
  school,
  value,
  onChange,
}: {
  school: School;
  value: Product["featuredMedia"];
  onChange: (mediaId: string | null) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const adapters = useCourseLitMediaUploader({
    schoolId: school.id,
    purpose: "product_artwork",
    accessPolicy: "public",
  });
  const filteredAdapters = filterCourseLitMediaAdapters(
    adapters,
    PRODUCT_IMAGE_ACCEPTED_TYPES,
  );

  function selectImage(selected: SelectedImage<CourseLitMedia>) {
    if (!selected.media) {
      setError("Featured images must be stored in the MediaLit library.");
      return;
    }
    if (!mediaMatchesAcceptedTypes(selected.media, PRODUCT_IMAGE_ACCEPTED_TYPES)) {
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
          The hero image for your product. Images are selected from the MediaLit
          library.
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
              onClick={() => onChange(null)}
            >
              Remove image
            </Button>
          </div>
        </div>
      ) : null}
      <ImageUploadDialog<CourseLitMedia>
        {...filteredAdapters}
        title="Select featured image"
        acceptedTypes={PRODUCT_IMAGE_ACCEPTED_TYPES}
        allowUnsplash={false}
        metadataMode="alt"
        onSelect={selectImage}
      >
        <Button type="button" variant="outline" size="sm" className="w-fit">
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

"use client";

import type { MediaRef } from "@courselit/api-contract";
import { ImageUploadDialog, type SelectedImage } from "@frontlit/media-uploader";
import { ImageIcon } from "lucide-react";
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
import type { Product, School } from "./product-types";

const PRODUCT_IMAGE_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

function imageLabel(image: MediaRef): string | null {
  return image.alt?.trim() || image.title?.trim() || image.fileName?.trim() || null;
}

export function ProductFeaturedImage({
  school,
  value,
  onChange,
}: {
  school: School;
  value: Product["featuredImage"];
  onChange: (value: MediaRef | null) => void;
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
      setError("Featured images must be stored in the media library.");
      return;
    }
    if (!mediaMatchesAcceptedTypes(selected.media, PRODUCT_IMAGE_ACCEPTED_TYPES)) {
      setError("Featured images must be JPEG, PNG, GIF, or WebP images.");
      return;
    }
    setError(null);
    onChange(toMediaRef(selected));
  }

  return (
    <div className="field">
      <span>
        Featured image{" "}
        <em className="ml-1 text-xs font-normal not-italic text-muted-foreground">
          1200 × 630 works best
        </em>
      </span>
      <div className="flex flex-wrap items-center gap-3.5 rounded-[var(--radius)] border border-dashed border-input px-4 py-3.5">
        {value ? (
          <Image
            src={value.thumbnailUrl ?? value.url}
            alt={value.alt || "Product featured image"}
            width={128}
            height={68}
            unoptimized
            className="h-[68px] w-32 rounded-md border object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-10 place-items-center rounded-[12px] bg-muted text-muted-foreground"
          >
            <ImageIcon className="size-5" />
          </span>
        )}
        <span className="flex min-w-0 flex-[1_1_220px] flex-col gap-0.5">
          {/* Never show the storage URL: it is infrastructure, not something the
              creator chose. Older references may have no name at all. */}
          <b className="truncate text-sm font-semibold">
            {value
              ? (imageLabel(value) ?? "Featured image")
              : "Choose from your media library"}
          </b>
          <span className="text-[13px] text-muted-foreground">
            Shown on the sales page and when people share the link.
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-2">
          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
            >
              Remove
            </Button>
          ) : null}
          <ImageUploadDialog<CourseLitMedia>
            {...filteredAdapters}
            title="Select featured image"
            acceptedTypes={PRODUCT_IMAGE_ACCEPTED_TYPES}
            allowUnsplash={false}
            metadataMode="alt"
            onSelect={selectImage}
          >
            <Button type="button" variant="outline" size="sm">
              {value ? "Change image" : "Choose image"}
            </Button>
          </ImageUploadDialog>
        </span>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

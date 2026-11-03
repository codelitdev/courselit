"use client";

import { ImageUploadDialog, type SelectedImage } from "@frontlit/media-uploader";
import { type ReactNode, useState } from "react";
import {
  type CourseLitMedia,
  type MediaUploadPurpose,
  mediaMatchesAcceptedTypes,
  useCourseLitMediaUploader,
} from "@/lib/course-media-uploader";
import type { UploadedFile } from "./flow";

/**
 * Image slot for the wizard, backed by the shared media uploader dialog.
 * The dialog enforces the accepted types for picks, drops and uploads alike.
 * Unsplash and the existing-media tab are off: a new school has no library yet,
 * and only real uploads may enter it.
 */
export function WizardImagePicker({
  schoolId,
  purpose,
  title,
  acceptedTypes,
  disabled,
  onPick,
  children,
}: {
  schoolId: string | null;
  purpose: MediaUploadPurpose;
  title: string;
  acceptedTypes: string[];
  disabled?: boolean;
  onPick: (file: UploadedFile) => void;
  children: ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);
  const adapters = useCourseLitMediaUploader({
    schoolId: schoolId ?? "",
    purpose,
    accessPolicy: "public",
  });

  function select(selected: SelectedImage<CourseLitMedia>) {
    const media = selected.media;
    if (!media) {
      setError("Choose an image from your media library.");
      return;
    }
    if (!mediaMatchesAcceptedTypes(media, acceptedTypes)) {
      setError("That file type isn't supported.");
      return;
    }
    setError(null);
    onPick({
      id: media.id,
      name: media.fileName,
      size: media.byteSize,
      mediaId: media.id,
      url: media.url,
      thumbnailUrl: media.thumbnailUrl,
      mimeType: media.mimeType,
      status: "done",
      pct: 100,
    });
  }

  if (!schoolId || disabled) {
    return (
      <span aria-disabled className="pointer-events-none opacity-50">
        {children}
      </span>
    );
  }
  return (
    <>
      <ImageUploadDialog<CourseLitMedia>
        {...adapters}
        title={title}
        acceptedTypes={acceptedTypes}
        allowUnsplash={false}
        allowExistingMedia={false}
        metadataMode="alt"
        onSelect={select}
      >
        {children}
      </ImageUploadDialog>
      {error ? (
        <p role="alert" className="text-[12.5px] text-destructive">
          {error}
        </p>
      ) : null}
    </>
  );
}

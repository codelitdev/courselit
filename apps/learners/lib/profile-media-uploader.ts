"use client";

import type {
  LibraryMedia,
  MediaUploaderAdapters,
  MediaUploadMeta,
} from "@frontlit/media-uploader";
import { useCallback, useMemo, useState } from "react";
import type { LearnerCommunityMedia } from "./community-media-uploader";
import { type MediaUploadAuthorization, uploadAuthorizedMedia } from "./media-upload";

type ProfileMediaDto = {
  id: string;
  schoolId: string;
  canonicalUrl: string;
  thumbnailUrl: string | null;
  fileName: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  kind: "image";
  altText: string;
  caption: string;
  accessPolicy: "public";
  status: "active" | "deleting";
  usageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type LearnerAvatarMedia = LearnerCommunityMedia & LibraryMedia;

function mediaFromApi(item: ProfileMediaDto): LearnerAvatarMedia {
  return {
    ...item,
    url: item.canonicalUrl,
    alt: item.altText || null,
    title: item.caption || null,
  };
}

async function throwResponseError(response: Response, fallback: string): Promise<void> {
  if (response.ok) return;
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;
  const message =
    body && typeof body.message === "string" && body.message.trim()
      ? body.message
      : fallback;
  throw new Error(message);
}

export function useLearnerProfileMediaUploader(): MediaUploaderAdapters<LearnerAvatarMedia> {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadMedia = useCallback(async (file: File, meta: MediaUploadMeta) => {
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const authorizationResponse = await fetch(
        "/api/v1/learner/profile-media/upload-authorizations",
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            fileName: meta.fileName || file.name,
            mimeType: meta.mimeType || file.type || "application/octet-stream",
            byteSize: file.size,
          }),
        },
      );
      await throwResponseError(
        authorizationResponse,
        "Unable to authorize this profile photo upload.",
      );
      const authorization =
        (await authorizationResponse.json()) as MediaUploadAuthorization;
      const uploadId = await uploadAuthorizedMedia(file, authorization, {
        accessPolicy: "public",
        onProgress: setUploadProgress,
      });
      const finalizedResponse = await fetch("/api/v1/learner/profile-media", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          uploadId,
          altText: (meta.alt ?? "Profile photo").slice(0, 1_000),
          caption: (meta.title ?? "").slice(0, 2_000),
        }),
      });
      await throwResponseError(
        finalizedResponse,
        "Unable to register the profile photo.",
      );
      return mediaFromApi((await finalizedResponse.json()) as ProfileMediaDto);
    } finally {
      setIsUploading(false);
    }
  }, []);

  return useMemo(
    () => ({ uploadMedia, isUploading, uploadProgress }),
    [isUploading, uploadMedia, uploadProgress],
  );
}

"use client";

import type {
  LibraryMedia,
  MediaUploaderAdapters,
  MediaUploadMeta,
} from "@frontlit/media-uploader";
import { LEARNER_AVATAR_MAX_BYTES } from "@courselit/api-contract/learner-avatar";
import { useCallback, useMemo, useState } from "react";
import type { LearnerCommunityMedia } from "./community-media-uploader";
import { type MediaUploadAuthorization, uploadAuthorizedMedia } from "./media-upload";
import { learnerUploadErrorMessage } from "./upload-errors";

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
  category: "library" | "user_uploads";
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

const REASON_MESSAGES: Record<string, string> = {
  file_too_large: `Choose a photo under ${LEARNER_AVATAR_MAX_BYTES / (1024 * 1024)} MB.`,
  unsupported_avatar_type: "Choose a PNG, JPEG or WebP image.",
};

async function throwResponseError(response: Response, fallback: string): Promise<void> {
  if (response.ok) return;
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
    details?: { reason?: unknown };
  } | null;
  const reason = typeof body?.details?.reason === "string" ? body.details.reason : "";
  throw new Error(
    REASON_MESSAGES[reason] ?? learnerUploadErrorMessage(response.status, reason, fallback),
  );
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

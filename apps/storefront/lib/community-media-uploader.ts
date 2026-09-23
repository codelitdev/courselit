"use client";

import type {
  LibraryMedia,
  MediaUploaderAdapters,
  MediaUploadMeta,
} from "@frontlit/media-uploader";
import { useCallback, useMemo, useState } from "react";
import { type MediaUploadAuthorization, uploadAuthorizedMedia } from "./media-upload";

export type LearnerCommunityMediaRecord = {
  id: string;
  schoolId: string;
  canonicalUrl: string;
  thumbnailUrl: string | null;
  fileName: string;
  mimeType: string;
  byteSize: number;
  kind: "image" | "video" | "audio" | "document" | "other";
  category: "library" | "user_uploads";
  altText: string;
  caption: string;
  accessPolicy: "public" | "private";
  status: "active" | "deleting";
  usageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type LearnerCommunityMedia = LearnerCommunityMediaRecord &
  LibraryMedia & {
    url: string;
    thumbnailUrl: string | null;
    alt: string | null;
    title: string | null;
  };

function mediaFromApi(item: LearnerCommunityMediaRecord): LearnerCommunityMedia {
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

export function useLearnerCommunityMediaUploader(): MediaUploaderAdapters<LearnerCommunityMedia> {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadMedia = useCallback(async (file: File, meta: MediaUploadMeta) => {
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const authorizationResponse = await fetch(
        "/api/v1/learner/community-media/upload-authorizations",
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            fileName: meta.fileName || file.name,
            mimeType: meta.mimeType || file.type || "application/octet-stream",
            byteSize: file.size,
            accessPolicy: "private",
          }),
        },
      );
      await throwResponseError(
        authorizationResponse,
        "Unable to authorize this upload.",
      );
      const authorization =
        (await authorizationResponse.json()) as MediaUploadAuthorization;
      const uploadId = await uploadAuthorizedMedia(file, authorization, {
        accessPolicy: "private",
        onProgress: setUploadProgress,
      });
      const finalizedResponse = await fetch("/api/v1/learner/community-media", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          uploadId,
          altText: (meta.alt ?? "").slice(0, 1000),
          caption: (meta.title ?? "").slice(0, 2000),
          accessPolicy: "private",
        }),
      });
      await throwResponseError(
        finalizedResponse,
        "Unable to register the uploaded media.",
      );
      return mediaFromApi(
        (await finalizedResponse.json()) as LearnerCommunityMediaRecord,
      );
    } finally {
      setIsUploading(false);
    }
  }, []);
  const listMedia = useCallback(async (query: string) => {
    const params = new URLSearchParams({ limit: "50" });
    if (query.trim()) params.set("search", query.trim());
    const response = await fetch(`/api/v1/learner/community-media?${params}`, {
      credentials: "include",
      cache: "no-store",
    });
    await throwResponseError(response, "Unable to load your media.");
    const body = (await response.json()) as { items?: LearnerCommunityMediaRecord[] };
    return (body.items ?? []).map(mediaFromApi);
  }, []);

  return useMemo(
    () => ({ uploadMedia, listMedia, isUploading, uploadProgress }),
    [isUploading, listMedia, uploadMedia, uploadProgress],
  );
}

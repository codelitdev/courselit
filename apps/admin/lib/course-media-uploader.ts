"use client";

import type {
  LibraryMedia,
  MediaUploaderAdapters,
  MediaUploadMeta,
  UnsplashSearchResult,
} from "@frontlit/media-uploader";
import { matchesMime } from "@frontlit/media-uploader";
import { useCallback, useMemo, useState } from "react";
import { type MediaUploadAuthorization, uploadAuthorizedMedia } from "./media-upload";

export type MediaUploadPurpose =
  | "school_branding"
  | "blog_artwork"
  | "product_artwork"
  | "product_content"
  | "lesson_media"
  | "lesson_content"
  | "downloadable_file"
  | "community_artwork"
  | "community_content"
  | "learner_avatar"
  | "certificate_template";

export type MediaAccessPolicy = "public" | "private";

export type CourseLitMediaRecord = {
  id: string;
  schoolId: string;
  canonicalUrl: string;
  thumbnailUrl: string | null;
  fileName: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  kind: "image" | "video" | "audio" | "document" | "other";
  altText: string;
  caption: string;
  accessPolicy: MediaAccessPolicy;
  status: "active" | "deleting";
  usageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CourseLitMedia = CourseLitMediaRecord &
  LibraryMedia & {
    url: string;
    thumbnailUrl: string | null;
    alt: string | null;
    fileName: string;
    mimeType: string;
    byteSize: number;
    title: string | null;
  };

export type CourseLitMediaUploaderOptions = {
  schoolId: string;
  purpose: MediaUploadPurpose;
  accessPolicy: MediaAccessPolicy;
};

export type CourseLitMediaUploadCallbacks = {
  onProgress?: (progress: number) => void;
};

function mediaFromApi(item: CourseLitMediaRecord): CourseLitMedia {
  return {
    ...item,
    url: item.canonicalUrl,
    alt: item.altText || null,
    title: item.caption || null,
  };
}

export function mediaMatchesAcceptedTypes(
  media: Pick<CourseLitMedia, "fileName" | "mimeType">,
  acceptedTypes?: string[],
): boolean {
  return matchesMime(media.mimeType ?? "", media.fileName ?? undefined, acceptedTypes);
}

export function filterCourseLitMediaAdapters(
  adapters: MediaUploaderAdapters<CourseLitMedia>,
  acceptedTypes?: string[],
): MediaUploaderAdapters<CourseLitMedia> {
  if (!acceptedTypes?.length || !adapters.listMedia) return adapters;
  const listMedia = adapters.listMedia;
  return {
    ...adapters,
    listMedia: async (query) => {
      const items = await listMedia(query);
      return items.filter((item) => mediaMatchesAcceptedTypes(item, acceptedTypes));
    },
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

function requestHeaders(schoolId: string) {
  return {
    "content-type": "application/json",
    "x-school-id": schoolId,
  };
}

export async function uploadCourseLitMedia(
  options: CourseLitMediaUploaderOptions,
  file: File,
  meta: MediaUploadMeta,
  callbacks: CourseLitMediaUploadCallbacks = {},
): Promise<CourseLitMedia> {
  const headers = requestHeaders(options.schoolId);
  const authorizationResponse = await fetch("/api/v1/media/upload-authorizations", {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({
      fileName: meta.fileName || file.name,
      mimeType: meta.mimeType || file.type || "application/octet-stream",
      byteSize: file.size,
      purpose: options.purpose,
      accessPolicy: options.accessPolicy,
    }),
  });
  await throwResponseError(authorizationResponse, "Unable to authorize this upload.");
  const authorization =
    (await authorizationResponse.json()) as MediaUploadAuthorization;
  const uploadId = await uploadAuthorizedMedia(file, authorization, {
    accessPolicy: options.accessPolicy,
    onProgress: callbacks.onProgress,
  });

  const finalizedResponse = await fetch("/api/v1/media", {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({
      uploadId,
      altText: (meta.alt ?? "").slice(0, 1000),
      caption: (meta.title ?? "").slice(0, 2000),
      accessPolicy: options.accessPolicy,
    }),
  });
  await throwResponseError(finalizedResponse, "Unable to register the uploaded media.");
  return mediaFromApi((await finalizedResponse.json()) as CourseLitMediaRecord);
}

export async function listCourseLitMedia(
  schoolId: string,
  query = "",
): Promise<CourseLitMedia[]> {
  const params = new URLSearchParams({ limit: "50" });
  if (query.trim()) params.set("search", query.trim());
  const response = await fetch(`/api/v1/media?${params.toString()}`, {
    credentials: "include",
    cache: "no-store",
    headers: { "x-school-id": schoolId },
  });
  await throwResponseError(response, "Unable to load the media library.");
  const body = (await response.json()) as { items?: CourseLitMediaRecord[] };
  return (body.items ?? []).map(mediaFromApi);
}

export async function getCourseLitMedia(
  schoolId: string,
  mediaId: string,
): Promise<CourseLitMedia | null> {
  const response = await fetch(`/api/v1/media/${encodeURIComponent(mediaId)}`, {
    credentials: "include",
    cache: "no-store",
    headers: { "x-school-id": schoolId },
  });
  if (response.status === 404) return null;
  await throwResponseError(response, "Unable to load the media item.");
  return mediaFromApi((await response.json()) as CourseLitMediaRecord);
}

export async function searchCourseLitUnsplash(
  schoolId: string,
  query?: string,
): Promise<UnsplashSearchResult> {
  const params = new URLSearchParams();
  if (query?.trim()) params.set("q", query.trim());
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`/api/v1/media/unsplash${suffix}`, {
    credentials: "include",
    cache: "no-store",
    headers: { "x-school-id": schoolId },
  });
  await throwResponseError(response, "Unable to search Unsplash.");
  return (await response.json()) as UnsplashSearchResult;
}

export function useCourseLitMediaUploader(
  options: CourseLitMediaUploaderOptions,
): MediaUploaderAdapters<CourseLitMedia> {
  const { accessPolicy, purpose, schoolId } = options;
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadMedia = useCallback(
    async (file: File, meta: MediaUploadMeta) => {
      setIsUploading(true);
      setUploadProgress(0);
      try {
        return await uploadCourseLitMedia(
          { schoolId, purpose, accessPolicy },
          file,
          meta,
          {
            onProgress: setUploadProgress,
          },
        );
      } finally {
        setIsUploading(false);
      }
    },
    [accessPolicy, purpose, schoolId],
  );
  const listMedia = useCallback(
    (query: string) => listCourseLitMedia(schoolId, query),
    [schoolId],
  );
  const searchUnsplash = useCallback(
    (query?: string) => searchCourseLitUnsplash(schoolId, query),
    [schoolId],
  );

  return useMemo(
    () => ({ uploadMedia, listMedia, searchUnsplash, isUploading, uploadProgress }),
    [isUploading, listMedia, searchUnsplash, uploadMedia, uploadProgress],
  );
}

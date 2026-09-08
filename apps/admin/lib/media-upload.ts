"use client";

import { Upload as TusUpload, type UploadOptions } from "tus-js-client";

export type MediaUploadAuthorization = {
  uploadId: string;
  uploadUrl: string;
  uploadProtocol: "direct" | "tus";
  uploadMethod: "PUT" | "POST";
  uploadHeaders?: Record<string, string>;
  uploadFields?: Record<string, string>;
};

function mediaIdFromTusResponse(payload: {
  lastResponse: { getHeader(name: string): string | null | undefined };
}): string {
  const rawMedia = payload.lastResponse.getHeader("Media");
  if (!rawMedia) throw new Error("MediaLit returned no media metadata.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawMedia);
  } catch {
    throw new Error("MediaLit returned invalid media metadata.");
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as { mediaId?: unknown }).mediaId !== "string" ||
    !(parsed as { mediaId: string }).mediaId
  ) {
    throw new Error("MediaLit returned no media ID.");
  }
  return (parsed as { mediaId: string }).mediaId;
}

async function uploadDirect(
  file: File,
  authorization: MediaUploadAuthorization,
): Promise<string> {
  let body: BodyInit = file;
  const headers = { ...(authorization.uploadHeaders ?? {}) };
  if (authorization.uploadMethod === "POST") {
    const form = new FormData();
    for (const [key, value] of Object.entries(authorization.uploadFields ?? {})) {
      form.append(key, value);
    }
    form.append("file", file);
    body = form;
  } else {
    headers["content-type"] = file.type || "application/octet-stream";
  }

  const response = await fetch(authorization.uploadUrl, {
    method: authorization.uploadMethod,
    headers,
    body,
  });
  if (!response.ok) throw new Error("MediaLit rejected the upload.");

  const payload = (await response.json()) as { mediaId?: unknown };
  if (typeof payload.mediaId !== "string" || !payload.mediaId) {
    throw new Error("MediaLit returned no media ID.");
  }
  return payload.mediaId;
}

export function uploadAuthorizedMedia(
  file: File,
  authorization: MediaUploadAuthorization,
  input: {
    accessPolicy: "public" | "private";
    onProgress?: (progress: number) => void;
  },
): Promise<string> {
  if (authorization.uploadProtocol === "direct") {
    // The in-process development adapter records the upload at authorization
    // time and exposes a test URL only as a marker; there are no bytes to send.
    if (authorization.uploadUrl.startsWith("https://media.test/")) {
      input.onProgress?.(100);
      return Promise.resolve(authorization.uploadId);
    }
    input.onProgress?.(0);
    return uploadDirect(file, authorization).then((mediaId) => {
      input.onProgress?.(100);
      return mediaId;
    });
  }

  return new Promise((resolve, reject) => {
    const tusOptions: UploadOptions = {
      endpoint: authorization.uploadUrl,
      removeFingerprintOnSuccess: true,
      retryDelays: [0, 3000, 5000],
      headers: authorization.uploadHeaders ?? {},
      metadata: {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        access: input.accessPolicy,
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        input.onProgress?.((bytesUploaded / bytesTotal) * 100);
      },
      onError: reject,
      onSuccess: (payload) => {
        try {
          input.onProgress?.(100);
          resolve(mediaIdFromTusResponse(payload));
        } catch (error) {
          reject(error);
        }
      },
    };

    const upload = new TusUpload(file, tusOptions);
    upload
      .findPreviousUploads()
      .then((previousUploads) => {
        if (previousUploads.length > 0) {
          upload.resumeFromPreviousUpload(previousUploads[0]);
        }
        upload.start();
      })
      .catch(reject);
  });
}

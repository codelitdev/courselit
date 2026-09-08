import { randomBytes } from "node:crypto";
import type {
  MediaAccessPolicy,
  MediaLitAsset,
  MediaLitClient,
  MediaResourceType,
} from "./media.js";

type MediaLitResponse = {
  mediaId?: unknown;
  originalFileName?: unknown;
  fileName?: unknown;
  mimeType?: unknown;
  size?: unknown;
  group?: unknown;
  file?: unknown;
  thumbnail?: unknown;
};

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`medialit_invalid_${field}`);
  }
  return value;
}

function requiredNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw new Error(`medialit_invalid_${field}`);
  }
  return value;
}

function assetFromResponse(value: unknown): MediaLitAsset {
  const response = value as MediaLitResponse;
  return {
    mediaLitId: requiredString(response.mediaId, "media_id"),
    group: requiredString(response.group, "group"),
    canonicalUrl: requiredString(response.file, "file_url"),
    thumbnailUrl:
      typeof response.thumbnail === "string" && response.thumbnail.length > 0
        ? response.thumbnail
        : null,
    fileName: requiredString(
      response.originalFileName ?? response.fileName,
      "file_name",
    ),
    mimeType: requiredString(response.mimeType, "mime_type"),
    byteSize: requiredNumber(response.size, "size"),
    width: null,
    height: null,
  };
}

function endpointFromEnv(value: string | undefined): string {
  const endpoint = value?.trim();
  if (!endpoint) throw new Error("MEDIALIT_SERVER_AND_APIKEY_REQUIRED");
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error("MEDIALIT_SERVER_INVALID");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("MEDIALIT_SERVER_INVALID");
  }
  return url.toString().replace(/\/$/, "");
}

export class HttpMediaLitClient implements MediaLitClient {
  private readonly endpoint: string;
  private readonly apiKey: string;

  constructor(input: { endpoint: string; apiKey: string }) {
    this.endpoint = endpointFromEnv(input.endpoint);
    this.apiKey = input.apiKey.trim();
    if (!this.apiKey) throw new Error("MEDIALIT_SERVER_AND_APIKEY_REQUIRED");
  }

  private async request(path: string, init: RequestInit = {}): Promise<unknown> {
    const response = await fetch(`${this.endpoint}${path}`, {
      ...init,
      headers: {
        "x-medialit-apikey": this.apiKey,
        ...(init.headers ?? {}),
      },
    });
    if (!response.ok) throw new Error(`medialit_request_failed_${response.status}`);
    if (response.status === 204) return null;
    try {
      return await response.json();
    } catch {
      throw new Error("medialit_invalid_response");
    }
  }

  async authorizeUpload(input: {
    schoolId: string;
    fileName: string;
    mimeType: string;
    byteSize: number;
    purpose: MediaResourceType;
    accessPolicy: MediaAccessPolicy;
    expiresAt: Date;
  }) {
    void input.fileName;
    void input.mimeType;
    void input.byteSize;
    void input.purpose;
    const result = (await this.request("/media/signature/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ group: input.schoolId }),
    })) as { signature?: unknown };
    const signature = requiredString(result.signature, "signature");
    return {
      // MediaLit allocates its asset ID after the browser upload. The returned
      // ID is retained for the local provider; real clients finalize with the
      // mediaId returned by MediaLit's upload response.
      uploadId: `media_authorization_${randomBytes(12).toString("base64url")}`,
      uploadUrl: `${this.endpoint}/media/create/resumable`,
      uploadProtocol: "tus" as const,
      uploadMethod: "POST" as const,
      uploadHeaders: { "x-medialit-signature": signature },
      uploadFields: { access: input.accessPolicy, group: input.schoolId },
      expiresAt: input.expiresAt,
    };
  }

  async finalizeUpload(input: { schoolId: string; uploadId: string }) {
    void input.schoolId;
    const response = await this.request(
      `/media/seal/${encodeURIComponent(input.uploadId)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
      },
    );
    return assetFromResponse(response);
  }

  async getAsset(input: { schoolId: string; mediaLitId: string }) {
    void input.schoolId;
    const response = await this.request(
      `/media/get/${encodeURIComponent(input.mediaLitId)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
      },
    );
    return assetFromResponse(response);
  }

  async deleteAsset(input: { schoolId: string; mediaLitId: string }) {
    void input.schoolId;
    await this.request(`/media/delete/${encodeURIComponent(input.mediaLitId)}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
    });
  }
}

export function createMediaLitClientFromEnv(
  env: Record<string, string | undefined> = process.env,
): MediaLitClient {
  const apiKey = env.MEDIALIT_APIKEY?.trim();
  if (!apiKey) throw new Error("MEDIALIT_SERVER_AND_APIKEY_REQUIRED");
  return new HttpMediaLitClient({
    endpoint: env.MEDIALIT_SERVER ?? "",
    apiKey,
  });
}

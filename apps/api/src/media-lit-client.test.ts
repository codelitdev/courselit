import { afterEach, describe, expect, it } from "bun:test";
import { createMediaLitClientFromEnv, HttpMediaLitClient } from "./media-lit-client.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// Response bodies in MediaLit v0.8.0's shape (`MediaResponse` in its
// apps/api/src/media/schemas.ts). Unsealed media is served from the private
// `i/` prefix through a signed URL; for an app with WebP on, sealing converts
// the image and publishes it under `p/` as `main.webp`.
const mediaId = "medialit-asset-1";
const originalSize = 2048;
const webpSize = 612;

const unsealedPng = {
  mediaId,
  originalFileName: "cover.png",
  mimeType: "image/png",
  size: originalSize,
  access: "public",
  file: `https://cdn.example/i/${mediaId}/main.png?Expires=123&Signature=sig`,
  thumbnail: `https://cdn.example/i/${mediaId}/thumb.webp?Expires=123&Signature=sig`,
  group: "school-internal-id",
  processing: { status: "pending" },
  derivatives: {},
};

const sealedWebp = {
  ...unsealedPng,
  mimeType: "image/webp",
  size: webpSize,
  file: `https://cdn.example/p/${mediaId}/main.webp`,
  thumbnail: `https://cdn.example/p/${mediaId}/thumb.webp`,
  processing: { status: "ready" },
  derivatives: {
    thumbnail: {
      status: "ready",
      url: `https://cdn.example/p/${mediaId}/thumb.webp`,
      mimeType: "image/webp",
      size: 180,
    },
  },
};

// WebP conversion failed: MediaLit keeps and publishes the original.
const sealedFailedConversion = {
  ...unsealedPng,
  file: `https://cdn.example/p/${mediaId}/main.png`,
  thumbnail: `https://cdn.example/p/${mediaId}/thumb.webp`,
  processing: { status: "failed", error: "WebP conversion failed" },
  derivatives: {
    thumbnail: {
      status: "ready",
      url: `https://cdn.example/p/${mediaId}/thumb.webp`,
      mimeType: "image/webp",
      size: 180,
    },
    preview: { status: "failed", error: "unsupported" },
  },
};

function client() {
  return new HttpMediaLitClient({
    endpoint: "https://media.example/",
    apiKey: "server-only-key",
  });
}

function recordCalls(
  handle: (url: string) => Response,
): Array<{ url: string; method: string }> {
  const calls: Array<{ url: string; method: string }> = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    calls.push({ url, method: init?.method ?? "GET" });
    return handle(url);
  }) as typeof fetch;
  return calls;
}

describe("MediaLit HTTP client", () => {
  it("requests a scoped signature and maps the upload/seal lifecycle", async () => {
    // Stateful like MediaLit: `get` returns the original until sealed, and a
    // repeat seal of sealed media answers 200 with the sealed media.
    let sealed = false;
    const calls = recordCalls((url) => {
      if (url.endsWith("/media/signature/create")) {
        return Response.json({ signature: "short-lived-upload-token" });
      }
      if (url.endsWith(`/media/get/${mediaId}`)) {
        return Response.json(sealed ? sealedWebp : unsealedPng);
      }
      if (url.endsWith(`/media/seal/${mediaId}`)) {
        sealed = true;
        return Response.json(sealedWebp);
      }
      if (url.endsWith(`/media/delete/${mediaId}`)) {
        return new Response(null, { status: 204 });
      }
      return Response.json({ error: "unexpected request" }, { status: 404 });
    });

    const mediaLit = client();
    const authorization = await mediaLit.authorizeUpload({
      schoolId: "school-internal-id",
      fileName: "cover.png",
      mimeType: "image/png",
      byteSize: originalSize,
      purpose: "product_artwork",
      accessPolicy: "public",
      expiresAt: new Date("2026-03-02T00:10:00.000Z"),
    });
    expect(authorization).toMatchObject({
      uploadUrl: "https://media.example/media/create/resumable",
      uploadProtocol: "tus",
      uploadMethod: "POST",
      uploadHeaders: { "x-medialit-signature": "short-lived-upload-token" },
      uploadFields: { access: "public", group: "school-internal-id" },
    });

    // Before sealing, MediaLit reports the uploaded original. `processing`
    // and `derivatives` are not part of the asset.
    const inspected = await mediaLit.inspectUpload({
      schoolId: "school-internal-id",
      uploadId: mediaId,
    });
    expect(inspected).toEqual({
      mediaLitId: mediaId,
      group: "school-internal-id",
      canonicalUrl: unsealedPng.file,
      thumbnailUrl: unsealedPng.thumbnail,
      fileName: "cover.png",
      mimeType: "image/png",
      byteSize: originalSize,
      width: null,
      height: null,
    });

    // Sealing converts to WebP, so the finalized asset differs from the
    // inspected one.
    const finalized = await mediaLit.finalizeUpload({
      schoolId: "school-internal-id",
      uploadId: mediaId,
    });
    expect(finalized).toEqual({
      mediaLitId: mediaId,
      group: "school-internal-id",
      canonicalUrl: `https://cdn.example/p/${mediaId}/main.webp`,
      thumbnailUrl: `https://cdn.example/p/${mediaId}/thumb.webp`,
      fileName: "cover.png",
      mimeType: "image/webp",
      byteSize: webpSize,
      width: null,
      height: null,
    });

    expect(
      await mediaLit.getAsset({ schoolId: "school-internal-id", mediaLitId: mediaId }),
    ).toEqual(finalized);
    expect(
      await mediaLit.finalizeUpload({
        schoolId: "school-internal-id",
        uploadId: mediaId,
      }),
    ).toEqual(finalized);

    await mediaLit.deleteAsset({
      schoolId: "school-internal-id",
      mediaLitId: mediaId,
    });
    expect(calls.map((call) => call.url)).toEqual([
      "https://media.example/media/signature/create",
      `https://media.example/media/get/${mediaId}`,
      `https://media.example/media/seal/${mediaId}`,
      `https://media.example/media/get/${mediaId}`,
      `https://media.example/media/seal/${mediaId}`,
      `https://media.example/media/delete/${mediaId}`,
    ]);
  });

  it("finalizes media whose conversion failed with the kept original", async () => {
    recordCalls((url) =>
      url.endsWith(`/media/seal/${mediaId}`)
        ? Response.json(sealedFailedConversion)
        : Response.json({ error: "unexpected request" }, { status: 404 }),
    );

    const asset = await client().finalizeUpload({
      schoolId: "school-internal-id",
      uploadId: mediaId,
    });
    expect(asset).toEqual({
      mediaLitId: mediaId,
      group: "school-internal-id",
      canonicalUrl: `https://cdn.example/p/${mediaId}/main.png`,
      thumbnailUrl: `https://cdn.example/p/${mediaId}/thumb.webp`,
      fileName: "cover.png",
      mimeType: "image/png",
      byteSize: originalSize,
      width: null,
      height: null,
    });
  });

  it("surfaces a seal still running elsewhere as a failed request without retrying", async () => {
    // MediaLit waits for the other seal, then gives up with 503 and
    // Retry-After. The client does not retry; the caller sees the status.
    const calls = recordCalls((url) =>
      url.endsWith(`/media/seal/${mediaId}`)
        ? Response.json(
            {
              error: "The media is being sealed by another request. Try again shortly.",
            },
            { status: 503, headers: { "Retry-After": "1" } },
          )
        : Response.json({ error: "unexpected request" }, { status: 404 }),
    );

    await expect(
      client().finalizeUpload({ schoolId: "school-internal-id", uploadId: mediaId }),
    ).rejects.toThrow("medialit_request_failed_503");
    expect(calls).toEqual([
      { url: `https://media.example/media/seal/${mediaId}`, method: "POST" },
    ]);
  });

  it("requires both production settings without revealing the API key", () => {
    expect(() =>
      createMediaLitClientFromEnv({ MEDIALIT_SERVER: "https://media.example" }),
    ).toThrow("MEDIALIT_SERVER_AND_APIKEY_REQUIRED");
    expect(() =>
      createMediaLitClientFromEnv({ MEDIALIT_APIKEY: "server-only-key" }),
    ).toThrow("MEDIALIT_SERVER_AND_APIKEY_REQUIRED");
  });
});

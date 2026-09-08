import { afterEach, describe, expect, it } from "bun:test";
import { createMediaLitClientFromEnv, HttpMediaLitClient } from "./media-lit-client.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("MediaLit HTTP client", () => {
  it("requests a scoped signature and maps the upload/seal lifecycle", async () => {
    const calls: Array<{ url: string; method: string; body?: string }> = [];
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      calls.push({
        url,
        method: init?.method ?? "GET",
        body: typeof init?.body === "string" ? init.body : undefined,
      });
      if (url.endsWith("/media/signature/create")) {
        return Response.json({ signature: "short-lived-upload-token" });
      }
      if (url.endsWith("/media/seal/medialit-asset-1")) {
        return Response.json({
          mediaId: "medialit-asset-1",
          group: "school-internal-id",
          originalFileName: "cover.png",
          mimeType: "image/png",
          size: 2048,
          file: "https://cdn.example/cover.png",
          thumbnail: "https://cdn.example/cover-thumb.png",
        });
      }
      if (url.endsWith("/media/get/medialit-asset-1")) {
        return Response.json({
          mediaId: "medialit-asset-1",
          group: "school-internal-id",
          originalFileName: "cover.png",
          mimeType: "image/png",
          size: 2048,
          file: "https://signed.example/cover.png?expires=123",
          thumbnail: "https://signed.example/cover-thumb.png?expires=123",
        });
      }
      if (url.endsWith("/media/delete/medialit-asset-1")) {
        return new Response(null, { status: 204 });
      }
      return Response.json({ error: "unexpected request" }, { status: 404 });
    }) as typeof fetch;

    const client = new HttpMediaLitClient({
      endpoint: "https://media.example/",
      apiKey: "server-only-key",
    });
    const authorization = await client.authorizeUpload({
      schoolId: "school-internal-id",
      fileName: "cover.png",
      mimeType: "image/png",
      byteSize: 2048,
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

    const asset = await client.finalizeUpload({
      schoolId: "school-internal-id",
      uploadId: "medialit-asset-1",
    });
    expect(asset).toEqual({
      mediaLitId: "medialit-asset-1",
      group: "school-internal-id",
      canonicalUrl: "https://cdn.example/cover.png",
      thumbnailUrl: "https://cdn.example/cover-thumb.png",
      fileName: "cover.png",
      mimeType: "image/png",
      byteSize: 2048,
      width: null,
      height: null,
    });
    const delivered = await client.getAsset({
      schoolId: "school-internal-id",
      mediaLitId: "medialit-asset-1",
    });
    expect(delivered.canonicalUrl).toBe(
      "https://signed.example/cover.png?expires=123",
    );
    await client.deleteAsset({
      schoolId: "school-internal-id",
      mediaLitId: "medialit-asset-1",
    });
    expect(calls.map((call) => call.url)).toEqual([
      "https://media.example/media/signature/create",
      "https://media.example/media/seal/medialit-asset-1",
      "https://media.example/media/get/medialit-asset-1",
      "https://media.example/media/delete/medialit-asset-1",
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

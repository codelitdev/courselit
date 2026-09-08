import { unzipSync } from "fflate";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

const API_URL = (process.env.API_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");
const MAX_PACKAGE_BYTES = 300 * 1024 * 1024;
const CACHE_ROOT = process.env.SCORM_CACHE_DIR?.trim() || path.join(os.tmpdir(), "courselit-scorm");

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".htm": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".xml": "application/xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".swf": "application/x-shockwave-flash",
};

function safeRequestedPath(value: string): string | null {
  if (!value || value.includes("\\") || value.startsWith("/") || /^[a-zA-Z]:/.test(value)) {
    return null;
  }
  const segments = value.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    return null;
  }
  return segments.join("/");
}

function safeZipPath(value: string): string | null {
  if (!value || value.includes("\\") || value.startsWith("/") || /^[a-zA-Z]:/.test(value)) {
    return null;
  }
  const segments = value.split("/").filter((segment) => segment && segment !== ".");
  if (segments.some((segment) => segment === "..") || segments.length === 0) return null;
  return segments.join(path.sep);
}

async function findFileCaseInsensitive(baseDir: string, requestedPath: string) {
  let currentDir = baseDir;
  for (const [index, segment] of requestedPath.split("/").entries()) {
    const entries = await readdir(currentDir);
    const match = entries.find((entry) => entry.toLowerCase() === segment.toLowerCase());
    if (!match) return null;
    currentDir = path.join(currentDir, match);
    if (index === requestedPath.split("/").length - 1) {
      try {
        return await readFile(currentDir);
      } catch {
        return null;
      }
    }
  }
  return null;
}

async function extractPackage(mediaId: string, url: string): Promise<void> {
  const packageDir = path.join(CACHE_ROOT, mediaId);
  const marker = path.join(packageDir, ".extracted");
  try {
    await stat(marker);
    return;
  } catch {
    // The package has not been extracted yet.
  }
  await mkdir(CACHE_ROOT, { recursive: true });
  const lock = path.join(CACHE_ROOT, `${mediaId}.lock`);
  try {
    await writeFile(lock, "locked", { flag: "wx" });
  } catch {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      try {
        await stat(marker);
        return;
      } catch {
        // Keep waiting for the extractor.
      }
    }
    throw new Error("scorm_extraction_timeout");
  }
  try {
    try {
      await stat(marker);
      return;
    } catch {
      // Continue with extraction after acquiring the lock.
    }
    const response = await fetch(url, { redirect: "follow" });
    if (!response.ok) throw new Error("scorm_package_fetch_failed");
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_PACKAGE_BYTES) throw new Error("scorm_package_too_large");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_PACKAGE_BYTES) throw new Error("scorm_package_too_large");
    const files = unzipSync(bytes);
    await mkdir(packageDir, { recursive: true });
    const resolvedRoot = path.resolve(packageDir);
    for (const [entryName, content] of Object.entries(files) as Array<
      [string, Uint8Array]
    >) {
      const safePath = safeZipPath(entryName);
      if (!safePath) continue;
      const destination = path.resolve(packageDir, safePath);
      if (!destination.startsWith(`${resolvedRoot}${path.sep}`)) continue;
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, content);
    }
    await writeFile(marker, new Date().toISOString());
  } finally {
    const { unlink } = await import("node:fs/promises");
    await unlink(lock).catch(() => undefined);
  }
}

async function getMediaUrl(request: NextRequest, productId: string, lessonId: string) {
  const headers = new Headers();
  for (const name of ["cookie", "x-school-id", "x-forwarded-host"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const response = await fetch(
    `${API_URL}/v1/products/${encodeURIComponent(productId)}/lessons/${encodeURIComponent(lessonId)}/media`,
    { headers, cache: "no-store" },
  );
  if (!response.ok) return null;
  return (await response.json()) as { id: string; url: string; fileName: string };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string; lessonId: string; path: string[] }> },
) {
  const { productId, lessonId, path: pathParts } = await params;
  const requestedPath = safeRequestedPath(pathParts.join("/"));
  if (!requestedPath) {
    return NextResponse.json({ message: "Invalid SCORM path" }, { status: 400 });
  }
  try {
    const media = await getMediaUrl(request, productId, lessonId);
    if (!media) return NextResponse.json({ message: "SCORM package not found" }, { status: 404 });
    await extractPackage(media.id, media.url);
    const file = await findFileCaseInsensitive(path.join(CACHE_ROOT, media.id), requestedPath);
    if (!file) return NextResponse.json({ message: "File not found in SCORM package" }, { status: 404 });
    const contentType = MIME_TYPES[path.extname(requestedPath).toLowerCase()] ?? "application/octet-stream";
    return new NextResponse(file, {
      headers: {
        "content-type": contentType,
        "cache-control": "private, max-age=3600",
        "content-disposition": "inline",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    console.error("SCORM content fetch error", error);
    return NextResponse.json({ message: "Unable to load SCORM content" }, { status: 502 });
  }
}

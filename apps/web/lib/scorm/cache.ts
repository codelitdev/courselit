import { MediaLit } from "medialit";
import path from "path";
import AdmZip from "adm-zip";
import fs from "fs/promises";
import { error } from "@/services/logger";
import constants from "@config/constants";

/**
 * Get an extracted file from SCORM package (main API)
 * Extracts ZIP to disk and caches extracted files
 * Requires CACHE_DIR env var to be set (via constants.scormCacheDir)
 */
export async function getExtractedFile(
    mediaId: string,
    filePath: string,
    medialit: MediaLit,
): Promise<Buffer | null> {
    if (!constants.cacheEnabled) {
        throw new Error(
            "SCORM is not enabled. Set CACHE_DIR environment variable.",
        );
    }

    const cacheDir = constants.scormCacheDir;
    const extractDir = path.join(cacheDir, mediaId);
    const targetFile = path.join(extractDir, filePath);
    const markerFile = path.join(extractDir, ".extracted");
    const lockFile = path.join(cacheDir, `${mediaId}.lock`);

    await fs.mkdir(cacheDir, { recursive: true });

    // Check if already extracted (files persist indefinitely on disk)
    try {
        await fs.stat(markerFile);
        try {
            return await fs.readFile(targetFile);
        } catch {
            return await findFileCaseInsensitive(extractDir, filePath);
        }
    } catch {
        // Not extracted yet
    }

    // Acquire lock for extraction
    let lockHandle;
    try {
        lockHandle = await fs.open(lockFile, "wx");
    } catch (err: any) {
        if (err.code === "EEXIST") {
            // Another process is extracting, wait and retry
            await new Promise((r) => setTimeout(r, 500));
            return getExtractedFile(mediaId, filePath, medialit);
        }
        throw err;
    }

    try {
        // Double-check (another process might have extracted while we waited)
        try {
            await fs.stat(markerFile);
            try {
                return await fs.readFile(targetFile);
            } catch {
                return await findFileCaseInsensitive(extractDir, filePath);
            }
        } catch {
            // Continue to extract
        }

        // Fetch ZIP from MediaLit
        const zipBuffer = await fetchZipFromMediaLit(mediaId, medialit);
        if (!zipBuffer) return null;

        // Extract all files to disk
        await extractZipToDisk(zipBuffer, extractDir);

        // Create marker file
        await fs.writeFile(markerFile, new Date().toISOString());

        // Serve the requested file
        try {
            return await fs.readFile(targetFile);
        } catch {
            return await findFileCaseInsensitive(extractDir, filePath);
        }
    } catch (err) {
        error("Failed to extract SCORM package", { err: String(err) });
        return null;
    } finally {
        await lockHandle.close();
        await fs.unlink(lockFile).catch(() => {});
    }
}

/**
 * Fetch ZIP buffer from MediaLit
 */
async function fetchZipFromMediaLit(
    mediaId: string,
    medialit: MediaLit,
): Promise<Buffer | null> {
    try {
        const media = await medialit.get(mediaId);
        if (!media?.file) return null;

        const response = await fetch(media.file as string);
        if (!response.ok) return null;

        return Buffer.from(await response.arrayBuffer());
    } catch (err) {
        error("Failed to fetch ZIP from MediaLit", { err: String(err) });
        return null;
    }
}

/**
 * Sanitize ZIP entry name to prevent directory traversal.
 * Returns sanitized path or null if the entry is unsafe.
 */
function sanitizeZipEntryName(entryName: string): string | null {
    if (!entryName) return null;

    // ZIP specification uses '/' as directory separator; reject backslashes
    if (entryName.includes("\\")) return null;

    // Reject absolute paths or Windows drive-letter paths (e.g. "C:...").
    if (entryName.startsWith("/")) return null;
    if (/^[a-zA-Z]:/.test(entryName)) return null;

    // Normalize path segments and filter out dangerous ones
    const segments = entryName.split("/");
    const safeSegments: string[] = [];

    for (const segment of segments) {
        // Reject path traversal
        if (segment === "..") {
            return null;
        }
        // Skip empty segments and current directory references
        if (segment === "" || segment === ".") {
            continue;
        }
        safeSegments.push(segment);
    }

    if (safeSegments.length === 0) return null;

    // Return a new sanitized path string
    return safeSegments.join(path.sep);
}

/**
 * Extract ZIP to disk directory
 */
async function extractZipToDisk(
    zipBuffer: Buffer,
    extractDir: string,
): Promise<void> {
    const zip = new AdmZip(zipBuffer);

    // Remove old extraction if exists
    await fs.rm(extractDir, { recursive: true, force: true });
    await fs.mkdir(extractDir, { recursive: true });

    // Extract all files
    const resolvedExtractDir = path.resolve(extractDir);
    for (const entry of zip.getEntries()) {
        if (!entry.isDirectory) {
            // Sanitize entry name to prevent directory traversal (Zip Slip)
            const sanitizedName = sanitizeZipEntryName(entry.entryName);
            if (sanitizedName === null) {
                error("Skipping unsafe ZIP entry name during extraction", {
                    entryName: entry.entryName,
                });
                continue;
            }

            // Use sanitized name for path construction
            const targetPath = path.join(resolvedExtractDir, sanitizedName);
            const resolvedTargetPath = path.resolve(targetPath);

            // Defense in depth: ensure target stays within extractDir
            if (
                resolvedTargetPath !== resolvedExtractDir &&
                !resolvedTargetPath.startsWith(resolvedExtractDir + path.sep)
            ) {
                error("Skipping suspicious ZIP entry path during extraction", {
                    entryName: entry.entryName,
                    targetPath: resolvedTargetPath,
                });
                continue;
            }

            await fs.mkdir(path.dirname(resolvedTargetPath), {
                recursive: true,
            });
            await fs.writeFile(
                resolvedTargetPath,
                new Uint8Array(entry.getData()),
            );
        }
    }
}

/**
 * Find file with case-insensitive matching
 */
async function findFileCaseInsensitive(
    baseDir: string,
    targetPath: string,
): Promise<Buffer | null> {
    const parts = targetPath.split("/");
    let currentDir = baseDir;

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLastPart = i === parts.length - 1;

        try {
            const entries = await fs.readdir(currentDir);
            const match = entries.find(
                (e) => e.toLowerCase() === part.toLowerCase(),
            );

            if (!match) return null;

            currentDir = path.join(currentDir, match);

            if (isLastPart) {
                return await fs.readFile(currentDir);
            }
        } catch {
            return null;
        }
    }

    return null;
}

// MIME types for SCORM content
export const MIME_TYPES: Record<string, string> = {
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

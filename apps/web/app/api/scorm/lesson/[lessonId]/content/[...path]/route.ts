import { NextRequest } from "next/server";
import { auth } from "@/auth";
import DomainModel, { Domain } from "@models/Domain";
import User from "@models/User";
import Lesson from "@models/Lesson";
import { MediaLit } from "medialit";
import { isEnrolled } from "@/ui-lib/utils";
import path from "path";
import AdmZip from "adm-zip";

// Simple in-memory cache for extracted ZIP contents
const zipCache = new Map<string, { buffer: Buffer; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// MIME types for content
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

/**
 * Fetch ZIP from MediaLit with caching
 */
async function getZipBuffer(
    mediaId: string,
    medialit: MediaLit,
): Promise<Buffer | null> {
    const cached = zipCache.get(mediaId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.buffer;
    }

    try {
        const media = await medialit.get(mediaId);
        if (!media?.file) {
            return null;
        }

        const response = await fetch(media.file as string);
        if (!response.ok) {
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        zipCache.set(mediaId, { buffer, timestamp: Date.now() });

        // Clean up old cache entries
        for (const [key, value] of Array.from(zipCache.entries())) {
            if (Date.now() - value.timestamp > CACHE_TTL) {
                zipCache.delete(key);
            }
        }

        return buffer;
    } catch (error) {
        console.error("Failed to fetch ZIP from MediaLit:", error);
        return null;
    }
}

/**
 * Extract a specific file from ZIP buffer
 */
function extractFileFromZip(
    zipBuffer: Buffer,
    filePath: string,
): Buffer | null {
    try {
        const zip = new AdmZip(zipBuffer);
        const entry = zip.getEntry(filePath);
        if (!entry) {
            // Try case-insensitive match
            const entries = zip.getEntries();
            const match = entries.find(
                (e) => e.entryName.toLowerCase() === filePath.toLowerCase(),
            );
            if (match) {
                return match.getData();
            }
            return null;
        }
        return entry.getData();
    } catch (error) {
        console.error("Failed to extract file from ZIP:", error);
        return null;
    }
}

/**
 * GET: Serve SCORM content files from lesson's ZIP package
 * Uses lessonId to look up the lesson and get mediaId from content field
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ lessonId: string; path: string[] }> },
) {
    const { lessonId, path: pathParts } = await params;
    const filePath = pathParts.join("/");

    // Get domain
    const domain = await DomainModel.findOne<Domain>({
        name: req.headers.get("domain"),
    });
    if (!domain) {
        return Response.json({ message: "Domain not found" }, { status: 404 });
    }

    // Auth check
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
        return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findOne({
        email: session.user?.email,
        domain: domain._id,
        active: true,
    });
    if (!user) {
        return Response.json({ message: "User not found" }, { status: 404 });
    }

    // Get lesson
    const lesson = await Lesson.findOne({
        lessonId,
        domain: domain._id,
    });
    if (!lesson) {
        return Response.json({ message: "Lesson not found" }, { status: 404 });
    }

    // Check enrollment for the course this lesson belongs to
    const enrolled = isEnrolled(lesson.courseId, user);
    if (!enrolled) {
        return Response.json(
            { message: "Enrollment required" },
            { status: 403 },
        );
    }

    // Get mediaId from lesson content (SCORM lessons store package info in content)
    const scormContent = lesson.content as {
        mediaId?: string;
        launchUrl?: string;
    };
    if (!scormContent?.mediaId) {
        return Response.json(
            { message: "SCORM package not found for this lesson" },
            { status: 404 },
        );
    }

    const { mediaId } = scormContent;
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || "application/octet-stream";

    // Initialize MediaLit client
    const medialit = new MediaLit({
        apiKey: process.env.MEDIALIT_APIKEY,
        endpoint: process.env.MEDIALIT_SERVER,
    });

    try {
        // Get ZIP buffer (cached)
        const zipBuffer = await getZipBuffer(mediaId, medialit);
        if (!zipBuffer) {
            return Response.json(
                { message: "SCORM package not found" },
                { status: 404 },
            );
        }

        // Extract the requested file
        const fileContent = extractFileFromZip(zipBuffer, filePath);
        if (!fileContent) {
            return Response.json(
                { message: "File not found in SCORM package" },
                { status: 404 },
            );
        }

        // Return the file with appropriate headers
        return new Response(new Uint8Array(fileContent), {
            headers: {
                "Content-Type": mimeType,
                "Cache-Control": "public, max-age=3600",
            },
        });
    } catch (error) {
        console.error("SCORM content fetch error:", error);
        return Response.json(
            { message: "Failed to load content" },
            { status: 500 },
        );
    }
}

import { NextRequest } from "next/server";
import { auth } from "@/auth";
import DomainModel, { Domain } from "@models/Domain";
import User from "@models/User";
import Lesson from "@models/Lesson";
import { MediaLit } from "medialit";
import { isEnrolled } from "@/ui-lib/utils";
import path from "path";
import { getExtractedFile, MIME_TYPES } from "@/lib/scorm/cache";
import { error } from "@/services/logger";

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

    const domain = await DomainModel.findOne<Domain>({
        name: req.headers.get("domain"),
    });
    if (!domain) {
        return Response.json({ message: "Domain not found" }, { status: 404 });
    }

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

    const lesson = await Lesson.findOne({
        lessonId,
        domain: domain._id,
    });
    if (!lesson) {
        return Response.json({ message: "Lesson not found" }, { status: 404 });
    }

    const enrolled = isEnrolled(lesson.courseId, user);
    if (!enrolled) {
        return Response.json(
            { message: "Enrollment required" },
            { status: 403 },
        );
    }

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

    const medialit = new MediaLit({
        apiKey: process.env.MEDIALIT_APIKEY,
        endpoint: process.env.MEDIALIT_SERVER,
    });

    try {
        // Get extracted file directly (cached)
        const fileContent = await getExtractedFile(mediaId, filePath, medialit);
        if (!fileContent) {
            return Response.json(
                { message: "File not found in SCORM package" },
                { status: 404 },
            );
        }

        return new Response(new Uint8Array(fileContent), {
            headers: {
                "Content-Type": mimeType,
                "Cache-Control": "public, max-age=3600",
            },
        });
    } catch (err: any) {
        error("SCORM content fetch error", { stack: err.stack });
        return Response.json(
            { message: err.message || "Failed to load content" },
            { status: 500 },
        );
    }
}

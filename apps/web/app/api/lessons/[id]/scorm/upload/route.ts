import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { checkPermission } from "@courselit/utils";
import { UIConstants as constants, Constants } from "@courselit/common-models";
import DomainModel, { Domain } from "@courselit/orm-models/dao/domain";
import User from "@courselit/orm-models/dao/user";
import Lesson from "@courselit/orm-models/dao/lesson";
import { extractScormPackage } from "@/lib/scorm/extractor";
import { MediaLit } from "medialit";
import { error as logError } from "@/services/logger";
import appConstants from "@config/constants";

/**
 * POST: Process a SCORM package for a lesson
 * Expects: { mediaId: string } - the MediaLit file ID of the uploaded ZIP
 *
 * Flow:
 * 1. Fetch ZIP from MediaLit using mediaId
 * 2. Extract and validate imsmanifest.xml
 * 3. Update lesson content with mediaId and launchUrl
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    // Check if SCORM is enabled
    if (!appConstants.cacheEnabled) {
        return Response.json(
            {
                message:
                    "SCORM is not enabled. Set CACHE_DIR environment variable.",
            },
            { status: 400 },
        );
    }

    const { id: lessonId } = await params;

    // Get domain
    const domain = await DomainModel.queryOne<Domain>({
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

    const user = await User.queryOne({
        email: session.user?.email,
        domain: domain._id,
        active: true,
    });
    if (!user) {
        return Response.json({ message: "User not found" }, { status: 404 });
    }

    // Permission check
    if (
        !checkPermission(user.permissions, [
            constants.permissions.manageCourse,
            constants.permissions.manageAnyCourse,
        ])
    ) {
        return Response.json({ message: "Forbidden" }, { status: 403 });
    }

    // Get lesson
    const lesson = await Lesson.queryOne({
        lessonId,
        domain: domain._id,
    });
    if (!lesson) {
        return Response.json({ message: "Lesson not found" }, { status: 404 });
    }

    // Check if lesson type is SCORM
    if (lesson.type !== Constants.LessonType.SCORM) {
        return Response.json(
            { message: "Lesson is not a SCORM lesson" },
            { status: 400 },
        );
    }

    try {
        // Get mediaId from request body
        const body = await req.json();
        const { mediaId } = body;

        if (!mediaId) {
            return Response.json(
                { message: "mediaId is required" },
                { status: 400 },
            );
        }

        // Initialize MediaLit client
        const medialit = new MediaLit({
            apiKey: process.env.MEDIALIT_APIKEY,
            endpoint: process.env.MEDIALIT_SERVER,
        });

        // Get the uploaded ZIP file URL from MediaLit
        const media = await medialit.get(mediaId);
        if (!media?.file) {
            return Response.json(
                { message: "SCORM package not found in MediaLit" },
                { status: 404 },
            );
        }

        // Fetch the ZIP file content
        const zipResponse = await fetch(media.file as string);
        if (!zipResponse.ok) {
            return Response.json(
                { message: "Failed to fetch SCORM package" },
                { status: 500 },
            );
        }
        const arrayBuffer = await zipResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Extract and validate SCORM package
        const result = await extractScormPackage(buffer);
        if (!result.success || !result.packageInfo) {
            return Response.json(
                { message: result.error || "Invalid SCORM package" },
                { status: 400 },
            );
        }

        const { packageInfo } = result;

        if (lesson.content?.mediaId && lesson.content.mediaId !== mediaId) {
            await medialit.delete(lesson.content.mediaId);
        }
        await medialit.seal(mediaId);
        // Update lesson content with SCORM metadata
        await Lesson.patchOne(
            { lessonId, domain: domain._id },
            {
                $set: {
                    content: {
                        mediaId,
                        launchUrl: packageInfo.entryPoint,
                        version: packageInfo.version,
                        title: packageInfo.title,
                        scoCount: packageInfo.scos.length,
                        fileCount: packageInfo.files.length,
                    },
                },
            },
        );

        return Response.json({
            success: true,
            message: "SCORM package processed successfully",
            packageInfo: {
                version: packageInfo.version,
                title: packageInfo.title,
                entryPoint: packageInfo.entryPoint,
                scoCount: packageInfo.scos.length,
                fileCount: packageInfo.files.length,
            },
        });
    } catch (err: any) {
        logError("SCORM processing failed", {
            err: err.message,
            stack: err.stack,
        });
        return Response.json(
            { message: "Failed to process SCORM package" },
            { status: 500 },
        );
    }
}

import { NextRequest, NextResponse } from "next/server";
import { getMedia } from "@/services/medialit";
import { Constants } from "@courselit/common-models";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ mediaId: string }> },
) {
    const mediaId = (await params).mediaId;

    if (!mediaId) {
        return new NextResponse("Missing mediaId parameter", { status: 400 });
    }

    try {
        const media = await getMedia(mediaId);

        if (!media) {
            return new NextResponse("Media not found", { status: 404 });
        }

        if (media.access !== Constants.MediaAccessType.PUBLIC) {
            return new NextResponse("Media not found", { status: 404 });
        }

        if (!media.file) {
            return new NextResponse("Media file URL not available", {
                status: 404,
            });
        }

        const response = await fetch(media.file);

        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
        }

        const headers = new Headers();
        headers.set(
            "Content-Type",
            response.headers.get("Content-Type") ||
                media.mimeType ||
                "application/octet-stream",
        );

        const fileName = media.originalFileName || "file";
        headers.set(
            "Content-Disposition",
            `attachment; filename="${fileName}"`,
        );

        return new NextResponse(response.body, {
            status: 200,
            headers,
        });
    } catch (error) {
        console.error("Error downloading file:", error);
        return new NextResponse("Error downloading file", { status: 500 });
    }
}

import { NextRequest, NextResponse } from "next/server";
import { moveLesson } from "@/graphql/courses/logic";
import {
    publicApiError,
    validatePublicApiRequestWithJsonBody,
} from "@/app/api/public-api";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ productId: string; lessonId: string }> },
) {
    const auth = await validatePublicApiRequestWithJsonBody(req);
    if (auth.error) {
        return auth.error;
    }

    const { productId, lessonId } = await params;
    const body = auth.body as {
        destinationSectionId?: string;
        destinationGroupId?: string;
        destinationIndex?: number;
    };

    try {
        const product = await moveLesson({
            courseId: productId,
            lessonId,
            destinationGroupId:
                body.destinationSectionId || body.destinationGroupId || "",
            destinationIndex: body.destinationIndex ?? 0,
            ctx: auth.ctx as any,
        });

        return NextResponse.json(product ?? { ok: true });
    } catch (error: any) {
        return publicApiError(
            "unprocessable_entity",
            error.message || "Unable to move lesson",
            422,
        );
    }
}

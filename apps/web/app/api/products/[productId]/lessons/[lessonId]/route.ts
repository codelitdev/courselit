import { NextRequest, NextResponse } from "next/server";
import { Constants } from "@courselit/common-models";
import { getCourseLessonOrThrow } from "@/graphql/courses/logic";
import { deleteLesson, updateLesson } from "@/graphql/lessons/logic";
import {
    publicApiError,
    validatePublicApiRequest,
    validatePublicApiRequestWithJsonBody,
} from "@/app/api/public-api";
import { serializeLesson } from "../lesson-response";

const scormNotSupported = () =>
    publicApiError(
        "not_supported",
        "SCORM lessons are not supported by the public API.",
        422,
    );

const updateLessonFields = new Set([
    "title",
    "content",
    "media",
    "downloadable",
    "requiresEnrollment",
    "published",
]);

function getUnsupportedField(body: Record<string, unknown>) {
    return Object.keys(body).find((key) => !updateLessonFields.has(key));
}

function lessonNotFound() {
    return publicApiError("not_found", "Lesson not found", 404);
}

async function getProductLessonOrNull({
    productId,
    lessonId,
    ctx,
}: {
    productId: string;
    lessonId: string;
    ctx: any;
}) {
    try {
        return await getCourseLessonOrThrow({
            courseId: productId,
            lessonId,
            ctx,
        });
    } catch (error) {
        return null;
    }
}

function toExistingUpdatePayload(
    body: Record<string, unknown>,
    lessonId: string,
) {
    const payload: Record<string, unknown> = {
        ...body,
        lessonId,
        id: lessonId,
    };

    if (Object.prototype.hasOwnProperty.call(body, "content")) {
        payload.content = JSON.stringify(body.content);
    }

    return payload;
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ productId: string; lessonId: string }> },
) {
    const auth = await validatePublicApiRequest(req);
    if (auth.error) {
        return auth.error;
    }

    const { productId, lessonId } = await params;
    const lesson = await getProductLessonOrNull({
        productId,
        lessonId,
        ctx: auth.ctx as any,
    });

    if (!lesson) {
        return lessonNotFound();
    }

    return NextResponse.json(serializeLesson(lesson as any));
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ productId: string; lessonId: string }> },
) {
    const auth = await validatePublicApiRequestWithJsonBody(req);
    if (auth.error) {
        return auth.error;
    }

    const { productId, lessonId } = await params;
    const body = auth.body;
    if (body.type === Constants.LessonType.SCORM) {
        return scormNotSupported();
    }

    const unsupportedField = getUnsupportedField(body);
    if (unsupportedField) {
        return publicApiError(
            "bad_request",
            `Unsupported lesson field: ${unsupportedField}`,
            400,
        );
    }

    try {
        const existingLesson = await getProductLessonOrNull({
            productId,
            lessonId,
            ctx: auth.ctx as any,
        });
        if (!existingLesson) {
            return lessonNotFound();
        }

        const lesson = await updateLesson(
            toExistingUpdatePayload(body, lessonId) as any,
            auth.ctx as any,
        );

        return NextResponse.json(serializeLesson(lesson as any));
    } catch (error: any) {
        return publicApiError(
            "unprocessable_entity",
            error.message || "Unable to update lesson",
            422,
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ productId: string; lessonId: string }> },
) {
    const auth = await validatePublicApiRequest(req);
    if (auth.error) {
        return auth.error;
    }

    const { productId, lessonId } = await params;

    try {
        const existingLesson = await getProductLessonOrNull({
            productId,
            lessonId,
            ctx: auth.ctx as any,
        });
        if (!existingLesson) {
            return lessonNotFound();
        }

        await deleteLesson(lessonId, auth.ctx as any);
        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return publicApiError(
            "unprocessable_entity",
            error.message || "Unable to delete lesson",
            422,
        );
    }
}

import { NextRequest, NextResponse } from "next/server";
import { Constants } from "@courselit/common-models";
import { getCourseLessons } from "@/graphql/courses/logic";
import { createLesson } from "@/graphql/lessons/logic";
import {
    publicApiError,
    validatePublicApiRequest,
    validatePublicApiRequestWithJsonBody,
} from "@/app/api/public-api";
import { serializeLesson, toExistingLessonPayload } from "./lesson-response";

const scormNotSupported = () =>
    publicApiError(
        "not_supported",
        "SCORM lessons are not supported by the public API.",
        422,
    );

const createLessonFields = new Set([
    "title",
    "type",
    "content",
    "media",
    "downloadable",
    "groupId",
    "requiresEnrollment",
    "published",
]);

function getUnsupportedField(body: Record<string, unknown>) {
    return Object.keys(body).find((key) => !createLessonFields.has(key));
}

function groupLessonsByGroupId(sortedLessons: any[]) {
    const groups: { groupId: string; lessons: any[] }[] = [];
    for (const lesson of sortedLessons) {
        const lastGroup = groups[groups.length - 1];
        if (lastGroup && lastGroup.groupId === lesson.groupId) {
            lastGroup.lessons.push(lesson);
        } else {
            groups.push({ groupId: lesson.groupId, lessons: [lesson] });
        }
    }
    return groups;
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ productId: string }> },
) {
    const auth = await validatePublicApiRequest(req);
    if (auth.error) {
        return auth.error;
    }

    const { productId } = await params;
    try {
        const lessons = await getCourseLessons({
            courseId: productId,
            ctx: auth.ctx as any,
        });

        const groupedLessons = groupLessonsByGroupId(lessons as any[]);

        return NextResponse.json({
            data: groupedLessons.map((group) => ({
                groupId: group.groupId,
                lessons: group.lessons.map((lesson) =>
                    serializeLesson(lesson as any),
                ),
            })),
        });
    } catch (error: any) {
        return publicApiError(
            "not_found",
            error.message || "Product not found",
            404,
        );
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ productId: string }> },
) {
    const auth = await validatePublicApiRequestWithJsonBody(req);
    if (auth.error) {
        return auth.error;
    }

    const { productId } = await params;
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
        const lesson = await createLesson(
            toExistingLessonPayload(body, productId) as any,
            auth.ctx as any,
        );

        return NextResponse.json(serializeLesson(lesson as any), {
            status: 201,
        });
    } catch (error: any) {
        return publicApiError(
            "unprocessable_entity",
            error.message || "Unable to create lesson",
            422,
        );
    }
}

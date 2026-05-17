import { NextRequest, NextResponse } from "next/server";
import { evaluateLesson } from "@/graphql/lessons/logic";
import {
    publicApiError,
    validatePublicApiRequestWithJsonBody,
} from "@/app/api/public-api";
import { resolveLearnerLessonAction } from "../../learner-action";

function isAnswers(value: unknown): value is number[][] {
    return (
        Array.isArray(value) &&
        value.length > 0 &&
        value.every(
            (answer) =>
                Array.isArray(answer) &&
                answer.every((option) => typeof option === "number"),
        )
    );
}

export async function POST(
    req: NextRequest,
    {
        params,
    }: {
        params: Promise<{
            productId: string;
            userId: string;
            lessonId: string;
        }>;
    },
) {
    const auth = await validatePublicApiRequestWithJsonBody(req);
    if (auth.error) {
        return auth.error;
    }

    const answers = auth.body.answers;
    if (!isAnswers(answers)) {
        return publicApiError(
            "bad_request",
            "Answers must be an array of number arrays",
            400,
        );
    }

    const { productId, userId, lessonId } = await params;
    const action = await resolveLearnerLessonAction({
        auth,
        productId,
        userId,
        lessonId,
    });
    if (action.error) {
        return action.error;
    }

    try {
        const result = await evaluateLesson(
            lessonId,
            { answers },
            action.learnerCtx as any,
        );

        return NextResponse.json(result);
    } catch (error: any) {
        return publicApiError(
            "unprocessable_entity",
            error.message || "Unable to evaluate lesson",
            422,
        );
    }
}

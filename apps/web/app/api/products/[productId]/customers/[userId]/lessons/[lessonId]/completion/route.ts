import { NextRequest, NextResponse } from "next/server";
import { markLessonCompleted } from "@/graphql/lessons/logic";
import { publicApiError, validatePublicApiRequest } from "@/app/api/public-api";
import { resolveLearnerLessonAction } from "../../learner-action";

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
    const auth = await validatePublicApiRequest(req);
    if (auth.error) {
        return auth.error;
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
        await markLessonCompleted(lessonId, action.learnerCtx as any);
        return NextResponse.json({ completed: true });
    } catch (error: any) {
        return publicApiError(
            "unprocessable_entity",
            error.message || "Unable to mark lesson complete",
            422,
        );
    }
}

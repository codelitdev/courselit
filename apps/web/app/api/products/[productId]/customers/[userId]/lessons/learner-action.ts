import UserModel from "@models/User";
import { getLessonOrThrow } from "@/graphql/lessons/logic";
import { publicApiError } from "@/app/api/public-api";

export async function resolveLearnerLessonAction({
    auth,
    productId,
    userId,
    lessonId,
}: {
    auth: {
        domain: { _id: unknown };
        ctx: {
            user: unknown;
            subdomain: unknown;
            address: string;
        };
    };
    productId: string;
    userId: string;
    lessonId: string;
}) {
    let lesson;
    try {
        lesson = await getLessonOrThrow(lessonId, auth.ctx as any, {
            courseId: productId,
        });
    } catch {
        return {
            error: publicApiError("not_found", "Lesson not found", 404),
        };
    }

    const learner = await UserModel.findOne({
        domain: auth.domain._id,
        userId,
    });
    if (!learner) {
        return {
            error: publicApiError("not_found", "Customer not found", 404),
        };
    }

    return {
        lesson,
        learner,
        learnerCtx: {
            ...auth.ctx,
            user: learner,
        },
    };
}

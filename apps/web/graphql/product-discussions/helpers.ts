import { responses } from "@/config/strings";
import appConstants from "@/config/constants";
import CourseModel from "@/models/Course";
import LessonModel from "@/models/Lesson";
import GQLContext from "@/models/GQLContext";
import {
    Constants,
    TextEditorContent,
    ProductDiscussionEntityType,
    ProductDiscussionReportStatus,
} from "@courselit/common-models";
import { getLessonDetails } from "../lessons/logic";
import {
    checkPermission,
    extractTextFromTextEditorContent,
} from "@courselit/utils";
import {
    checkIfAuthenticated,
    checkOwnershipWithoutModel,
} from "@/lib/graphql";
import { getMembershipStatus } from "../users/logic";
import { LessonRepository, CourseRepository } from "@courselit/orm-models";

const courseRepo = new CourseRepository(CourseModel);
const lessonRepo = new LessonRepository(LessonModel);

const { permissions } = appConstants;

export const MAX_DISCUSSION_CONTENT_BYTES = 32768;
export const MAX_DISCUSSION_TEXT_LENGTH = 5000;

export function encodeCursor<T extends object>(cursor: T) {
    return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64");
}

export function decodeCursor<T>(cursor: string): T {
    try {
        return JSON.parse(Buffer.from(cursor, "base64").toString("utf8"));
    } catch {
        throw new Error(responses.invalid_input);
    }
}

export function getDiscussionSubjectId({
    productId,
    entityType,
    entityId,
}: {
    productId: string;
    entityType: ProductDiscussionEntityType;
    entityId: string;
}) {
    return `${productId}:${entityType}:${entityId}`;
}

export function getProductProgress(ctx: GQLContext, productId: string) {
    return ctx.user?.purchases?.find(
        (purchase: any) => purchase.courseId === productId,
    );
}

export async function isEnrolledInProduct(
    ctx: GQLContext,
    productId: string,
): Promise<boolean> {
    const status = await getMembershipStatus({
        entityType: Constants.MembershipEntityType.COURSE,
        entityId: productId,
        ctx,
    });
    return status === Constants.MembershipStatus.ACTIVE;
}

export async function validateDiscussionTargetForLearner({
    ctx,
    productId,
    entityType,
    entityId,
}: {
    ctx: GQLContext;
    productId: string;
    entityType: ProductDiscussionEntityType;
    entityId: string;
}) {
    checkIfAuthenticated(ctx);

    if (entityType === Constants.ProductDiscussionEntityType.PRODUCT) {
        throw new Error(responses.action_not_allowed);
    }

    const product = await courseRepo.findOne({
        domain: ctx.subdomain._id,
        courseId: productId,
    });

    if (!product || product.type !== Constants.CourseType.COURSE) {
        throw new Error(responses.item_not_found);
    }

    if (!product.discussions) {
        throw new Error(responses.action_not_allowed);
    }

    const isAdminOrCreator =
        ctx.user &&
        (checkPermission(ctx.user.permissions, [permissions.manageAnyCourse]) ||
            (checkPermission(ctx.user.permissions, [
                permissions.manageCourse,
            ]) &&
                checkOwnershipWithoutModel(product, ctx)));

    if (!product.published && !isAdminOrCreator) {
        throw new Error(responses.item_not_found);
    }

    if (!isAdminOrCreator && !(await isEnrolledInProduct(ctx, productId))) {
        throw new Error(responses.not_enrolled);
    }

    let lesson;
    if (isAdminOrCreator) {
        lesson = await lessonRepo.findOne({
            lessonId: entityId,
            domain: ctx.subdomain._id,
            courseId: productId,
        });
        if (!lesson) {
            throw new Error(responses.item_not_found);
        }
    } else {
        lesson = await getLessonDetails(entityId, ctx, productId);
    }

    return {
        product,
        lesson,
        productId,
        entityType,
        entityId,
    };
}

export function validateDiscussionContent(content: unknown): TextEditorContent {
    if (!content || typeof content !== "object") {
        throw new Error(responses.invalid_input);
    }

    const doc = content as TextEditorContent;
    if (doc.type !== "doc") {
        throw new Error(responses.invalid_input);
    }

    const contentBytes = Buffer.byteLength(JSON.stringify(doc), "utf8");
    if (contentBytes > MAX_DISCUSSION_CONTENT_BYTES) {
        throw new Error(responses.invalid_input);
    }

    const text = extractTextFromTextEditorContent(doc);
    if (!text.trim() || text.length > MAX_DISCUSSION_TEXT_LENGTH) {
        throw new Error(responses.invalid_input);
    }

    return doc;
}

export function getNextReportStatus(
    status: ProductDiscussionReportStatus,
): ProductDiscussionReportStatus {
    if (status === Constants.ProductDiscussionReportStatus.PENDING) {
        return Constants.ProductDiscussionReportStatus.ACCEPTED;
    }
    if (status === Constants.ProductDiscussionReportStatus.ACCEPTED) {
        return Constants.ProductDiscussionReportStatus.REJECTED;
    }
    return Constants.ProductDiscussionReportStatus.PENDING;
}

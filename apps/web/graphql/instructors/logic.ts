/**
 * Business logic for managing instructor profiles.
 */
import InstructorModel, { InternalInstructor } from "@/models/Instructor";
import CourseModel from "@/models/Course";
import UserModel from "@/models/User";
import GQLContext from "@/models/GQLContext";
import { responses } from "@/config/strings";
import constants from "@/config/constants";
import { checkIfAuthenticated } from "@/lib/graphql";
import { checkPermission } from "@courselit/utils";
import { Constants, InstructorLink, Media } from "@courselit/common-models";
import { deleteMedia, sealMedia } from "@/services/medialit";
import { error } from "@/services/logger";

const { permissions } = constants;

export const INSTRUCTOR_NAME_MAX_LENGTH = 100;
export const INSTRUCTOR_BIO_MAX_LENGTH = 2000;
export const INSTRUCTOR_LINKS_MAX = 10;
export const INSTRUCTOR_LINK_LABEL_MAX_LENGTH = 50;
export const INSTRUCTOR_LINK_URL_MAX_LENGTH = 2048;

export interface InstructorInput {
    name?: string;
    bio?: string | null;
    avatar?: Partial<Media> | null;
    links?: InstructorLink[] | null;
    userId?: string | null;
}

function checkCanManageInstructors(ctx: GQLContext) {
    checkIfAuthenticated(ctx);
    if (
        !checkPermission(ctx.user.permissions, [
            permissions.manageAnyCourse,
            permissions.manageSite,
        ])
    ) {
        throw new Error(responses.action_not_allowed);
    }
}

export function canSeeInstructorUserLink(ctx: GQLContext): boolean {
    return Boolean(
        ctx.user &&
            checkPermission(ctx.user.permissions, [
                permissions.manageCourse,
                permissions.manageAnyCourse,
                permissions.manageSite,
            ]),
    );
}

function validateName(name: unknown): string {
    if (typeof name !== "string") {
        throw new Error(responses.invalid_input);
    }
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > INSTRUCTOR_NAME_MAX_LENGTH) {
        throw new Error(responses.invalid_input);
    }
    return trimmed;
}

function validateBio(bio: unknown): string | undefined {
    if (bio === null || bio === undefined) {
        return undefined;
    }
    if (typeof bio !== "string") {
        throw new Error(responses.invalid_input);
    }
    const trimmed = bio.trim();
    if (trimmed.length > INSTRUCTOR_BIO_MAX_LENGTH) {
        throw new Error(responses.invalid_input);
    }
    return trimmed || undefined;
}

function validateLinks(links: unknown): InstructorLink[] {
    if (links === null || links === undefined) {
        return [];
    }
    if (!Array.isArray(links) || links.length > INSTRUCTOR_LINKS_MAX) {
        throw new Error(responses.invalid_input);
    }
    return links.map((link) => {
        const label = typeof link?.label === "string" ? link.label.trim() : "";
        const rawUrl = typeof link?.url === "string" ? link.url.trim() : "";
        if (
            !label ||
            label.length > INSTRUCTOR_LINK_LABEL_MAX_LENGTH ||
            !rawUrl ||
            rawUrl.length > INSTRUCTOR_LINK_URL_MAX_LENGTH
        ) {
            throw new Error(responses.invalid_input);
        }
        let parsed: URL;
        try {
            parsed = new URL(rawUrl);
        } catch {
            throw new Error(responses.invalid_input);
        }
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            throw new Error(responses.invalid_input);
        }
        return { label, url: rawUrl };
    });
}

async function validateUserId(
    userId: unknown,
    ctx: GQLContext,
): Promise<string | undefined> {
    if (userId === null || userId === undefined || userId === "") {
        return undefined;
    }
    if (typeof userId !== "string") {
        throw new Error(responses.invalid_input);
    }
    const user = await UserModel.findOne({
        domain: ctx.subdomain._id,
        userId,
    }).select("_id");
    if (!user) {
        throw new Error(responses.invalid_input);
    }
    return userId;
}

async function sealAvatar(avatar: Partial<Media>): Promise<Media> {
    if (!avatar.mediaId) {
        throw new Error(responses.invalid_input);
    }
    const sealed = await sealMedia(avatar.mediaId);
    if (!sealed || sealed.access !== Constants.MediaAccessType.PUBLIC) {
        await removeMedia(avatar.mediaId);
        throw new Error(responses.invalid_input);
    }
    return sealed;
}

async function removeMedia(mediaId: string) {
    try {
        await deleteMedia(mediaId);
    } catch (err: any) {
        error(err.message, { stack: err.stack });
    }
}

async function getInstructorOrThrow(instructorId: string, ctx: GQLContext) {
    const instructor = await InstructorModel.findOne({
        domain: ctx.subdomain._id,
        instructorId,
    });
    if (!instructor) {
        throw new Error(responses.item_not_found);
    }
    return instructor;
}

export const createInstructor = async ({
    data,
    ctx,
}: {
    data: InstructorInput;
    ctx: GQLContext;
}): Promise<InternalInstructor> => {
    checkCanManageInstructors(ctx);

    const name = validateName(data.name);
    const bio = validateBio(data.bio);
    const links = validateLinks(data.links);
    const userId = await validateUserId(data.userId, ctx);
    const avatar = data.avatar ? await sealAvatar(data.avatar) : undefined;

    const instructor = await InstructorModel.create({
        domain: ctx.subdomain._id,
        name,
        bio,
        links,
        userId,
        avatar,
    });

    return instructor.toObject();
};

export const updateInstructor = async ({
    instructorId,
    data,
    ctx,
}: {
    instructorId: string;
    data: InstructorInput;
    ctx: GQLContext;
}): Promise<InternalInstructor> => {
    checkCanManageInstructors(ctx);
    const instructor = await getInstructorOrThrow(instructorId, ctx);
    const has = (key: keyof InstructorInput) =>
        Object.prototype.hasOwnProperty.call(data, key);

    if (has("name")) {
        instructor.name = validateName(data.name);
    }
    if (has("bio")) {
        instructor.bio = validateBio(data.bio);
    }
    if (has("links")) {
        instructor.links = validateLinks(data.links);
    }
    if (has("userId")) {
        instructor.userId = await validateUserId(data.userId, ctx);
    }

    let mediaToDelete: string | undefined;
    if (has("avatar")) {
        const previous = instructor.avatar?.mediaId;
        if (!data.avatar) {
            instructor.avatar = undefined;
            mediaToDelete = previous;
        } else if (data.avatar.mediaId !== previous) {
            instructor.avatar = await sealAvatar(data.avatar);
            mediaToDelete = previous;
        }
    }

    await instructor.save();
    if (mediaToDelete) {
        await removeMedia(mediaToDelete);
    }

    return instructor.toObject();
};

export const deleteInstructor = async ({
    instructorId,
    ctx,
}: {
    instructorId: string;
    ctx: GQLContext;
}): Promise<boolean> => {
    checkCanManageInstructors(ctx);
    const instructor = await getInstructorOrThrow(instructorId, ctx);

    await CourseModel.updateMany(
        { domain: ctx.subdomain._id, instructors: instructorId },
        { $pull: { instructors: instructorId } },
    );
    await CourseModel.updateMany(
        { domain: ctx.subdomain._id, "groups.instructors": instructorId },
        { $pull: { "groups.$[].instructors": instructorId } },
    );
    await InstructorModel.deleteOne({
        domain: ctx.subdomain._id,
        instructorId,
    });
    if (instructor.avatar?.mediaId) {
        await removeMedia(instructor.avatar.mediaId);
    }

    return true;
};

export const getInstructors = async (
    ctx: GQLContext,
): Promise<InternalInstructor[]> => {
    checkIfAuthenticated(ctx);
    if (
        !checkPermission(ctx.user.permissions, [
            permissions.manageCourse,
            permissions.manageAnyCourse,
            permissions.manageSite,
        ])
    ) {
        throw new Error(responses.action_not_allowed);
    }

    return await InstructorModel.find({ domain: ctx.subdomain._id })
        .sort({ name: 1 })
        .collation({ locale: "en", strength: 2 })
        .lean();
};

/**
 * Resolves instructor ids (e.g. stored on a course or section) to profiles,
 * keeping the stored order and skipping ids that no longer exist.
 */
export const getInstructorsByIds = async (
    ids: string[] | undefined,
    ctx: GQLContext,
): Promise<InternalInstructor[]> => {
    if (!ids?.length) {
        return [];
    }
    const found = (await InstructorModel.find({
        domain: ctx.subdomain._id,
        instructorId: { $in: ids },
    }).lean()) as unknown as InternalInstructor[];
    const byId = new Map(found.map((item) => [item.instructorId, item]));
    const ordered: InternalInstructor[] = [];
    for (const instructorId of ids) {
        const item = byId.get(instructorId);
        if (item) {
            ordered.push(item);
        }
    }
    return ordered;
};

/**
 * Validates ids sent from the dashboard: they must all belong to the school.
 * Returns them de-duplicated, in the order given.
 */
export const validateInstructorIds = async (
    ids: unknown,
    ctx: GQLContext,
): Promise<string[]> => {
    if (ids === null || ids === undefined) {
        return [];
    }
    if (!Array.isArray(ids) || ids.some((value) => typeof value !== "string")) {
        throw new Error(responses.invalid_input);
    }
    const unique = Array.from(new Set(ids as string[]));
    if (!unique.length) {
        return [];
    }
    const count = await InstructorModel.countDocuments({
        domain: ctx.subdomain._id,
        instructorId: { $in: unique },
    });
    if (count !== unique.length) {
        throw new Error(responses.invalid_input);
    }
    return unique;
};

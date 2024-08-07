import { NextApiRequest, NextApiResponse } from "next";
import { responses } from "@/config/strings";
import * as medialitService from "@/services/medialit";
import { UIConstants as constants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import UserModel, { User } from "@models/User";
import DomainModel, { Domain } from "@models/Domain";
import { auth } from "@/auth";
import CourseModel, { Course } from "@models/Course";
import LessonModel, { Lesson } from "@models/Lesson";
import PageModel, { Page } from "@models/Page";

const types = ["course", "lesson", "page", "user", "domain"] as const;

type MediaType = (typeof types)[number];

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== "DELETE") {
        return res.status(405).json({ message: "Not allowed" });
    }

    const domain = await DomainModel.findOne<Domain>({
        name: req.headers.domain,
    });
    if (!domain) {
        return res.status(404).json({ message: "Domain not found" });
    }

    const session = await auth(req, res);

    let user;
    if (session) {
        user = await UserModel.findOne({
            email: session.user!.email,
            domain: domain._id,
            active: true,
        });
    }

    if (!user) {
        return res.status(401).json({});
    }

    const { mediaId, type } = req.query;
    if (!types.includes(type as MediaType)) {
        return res.status(400).json({ message: "Bad request" });
    }

    if (
        !(await isActionAllowed(user, type as any, mediaId as string, domain))
    ) {
        ("");
        return res.status(403).json({ message: responses.action_not_allowed });
    }

    try {
        let response = await medialitService.deleteMedia(<string>mediaId);
        return res.status(200).json({ message: responses.success });
    } catch (err: any) {
        return res.status(500).json({ error: responses.internal_error });
    }
}

async function isActionAllowed(
    user: User,
    type: MediaType,
    mediaId: string,
    domain: Domain,
) {
    if (
        !checkPermission(user.permissions, [constants.permissions.manageMedia])
    ) {
        return false;
    }

    switch (type) {
        case "course":
            const course = await CourseModel.findOne<Course>({
                domain: domain._id,
                "featuredImage.mediaId": mediaId,
            });
            if (!course) {
                return false;
            }
            if (
                checkPermission(user.permissions, [
                    constants.permissions.manageAnyCourse,
                ])
            ) {
                return true;
            } else {
                return (
                    course.creatorId === user.userId &&
                    checkPermission(user.permissions, [
                        constants.permissions.manageCourse,
                    ])
                );
            }
        case "lesson":
            const lesson = await LessonModel.findOne<Lesson>({
                domain: domain._id,
                "media.mediaId": mediaId,
            });
            if (!lesson) {
                return false;
            }
            if (
                checkPermission(user.permissions, [
                    constants.permissions.manageAnyCourse,
                ])
            ) {
                return true;
            } else {
                return (
                    lesson?.creatorId.toString() === user._id.toString() &&
                    checkPermission(user.permissions, [
                        constants.permissions.manageCourse,
                    ])
                );
            }
        case "page":
            const pages = await PageModel.find<Page>({
                domain: domain._id,
            });
            let mediaBelongsToThisDomain = false;
            for (const p of pages) {
                const fullContent =
                    JSON.stringify(p.layout) +
                    JSON.stringify(p.draftLayout) +
                    JSON.stringify(p.socialImage) +
                    JSON.stringify(p.draftSocialImage);
                if (fullContent.indexOf(`"mediaId":"${mediaId}"`) !== -1) {
                    mediaBelongsToThisDomain = true;
                    break;
                }
            }
            return (
                mediaBelongsToThisDomain &&
                checkPermission(user.permissions, [
                    constants.permissions.manageSite,
                ])
            );
        case "user":
            return (
                user.avatar.mediaId === mediaId ||
                checkPermission(user.permissions, [
                    constants.permissions.manageUsers,
                ])
            );
        case "domain":
            return checkPermission(user.permissions, [
                constants.permissions.manageSettings,
            ]);
        default:
            return false;
    }
}

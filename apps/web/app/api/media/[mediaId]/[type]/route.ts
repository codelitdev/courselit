import { NextRequest } from "next/server";
import { responses } from "@/config/strings";
import * as medialitService from "@/services/medialit";
import { UIConstants as constants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import UserModel from "@models/User";
import { InternalUser, InternalCourse } from "@courselit/common-logic";
import DomainModel, { Domain } from "@models/Domain";
import { auth } from "@/auth";
import CourseModel from "@models/Course";
import LessonModel, { Lesson } from "@models/Lesson";
import PageModel, { Page } from "@models/Page";
import CertificateTemplateModel, {
    CertificateTemplate,
} from "@models/CertificateTemplate";

const types = [
    "course",
    "lesson",
    "page",
    "user",
    "domain",
    "community",
    "certificate",
] as const;

type MediaType = (typeof types)[number];

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ mediaId: string; type: string }> },
) {
    const domain = await DomainModel.findOne<Domain>({
        name: req.headers.get("domain"),
    });
    if (!domain) {
        return Response.json({ message: "Domain not found" }, { status: 404 });
    }

    const session = await auth();

    let user;
    if (session) {
        user = await UserModel.findOne({
            email: session.user!.email,
            domain: domain._id,
            active: true,
        });
    }

    if (!user) {
        return Response.json({}, { status: 401 });
    }

    const mediaId = (await params).mediaId;
    const type = (await params).type;
    if (!types.includes(type as MediaType)) {
        return Response.json({ message: "Bad request" }, { status: 400 });
    }

    if (
        !(await isActionAllowed(user, type as any, mediaId as string, domain))
    ) {
        return Response.json(
            { message: responses.action_not_allowed },
            { status: 403 },
        );
    }

    try {
        await medialitService.deleteMedia(<string>mediaId);
        return Response.json({ message: responses.success });
    } catch (err: any) {
        return Response.json(
            { error: responses.internal_error },
            { status: 500 },
        );
    }
}

async function isActionAllowed(
    user: InternalUser,
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
            const course = await CourseModel.findOne<InternalCourse>({
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
                    lesson?.creatorId === user.userId &&
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
        case "community":
            return checkPermission(user.permissions, [
                constants.permissions.manageCommunity,
            ]);
        case "certificate":
            const certificateTemplate =
                await CertificateTemplateModel.findOne<CertificateTemplate>({
                    domain: domain._id,
                    $or: [
                        { "signatureImage.mediaId": mediaId },
                        { "logo.mediaId": mediaId },
                    ],
                });
            if (!certificateTemplate) {
                return false;
            }
            const certificateCourse = await CourseModel.findOne<InternalCourse>(
                {
                    domain: domain._id,
                    courseId: certificateTemplate.courseId,
                },
            );
            if (!certificateCourse) {
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
                    certificateCourse.creatorId === user.userId &&
                    checkPermission(user.permissions, [
                        constants.permissions.manageCourse,
                    ])
                );
            }
        default:
            return false;
    }
}

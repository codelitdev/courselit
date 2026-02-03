/**
 * Deletes a domain and all its associated data.
 *
 * Usage: pnpm --filter @courselit/scripts domain:cleanup <domain-name>
 */
import mongoose from "mongoose";
import {
    CourseSchema,
    DomainSchema,
    LessonSchema,
    CertificateTemplateSchema,
    CertificateSchema,
    MembershipSchema,
    PaymentPlanSchema,
    ActivitySchema,
    LessonEvaluationSchema,
    PageSchema,
    CommunitySchema,
    CommunityReportSchema,
    CommunityPostSubscriberSchema,
    CommunityCommentSchema,
    CommunityPostSchema,
    InvoiceSchema,
    UserSchema,
    SequenceSchema,
    UserSegmentSchema,
    OngoingSequenceSchema,
    NotificationSchema,
    RuleSchema,
    EmailEventSchema,
    EmailDeliverySchema,
    DownloadLinkSchema,
    ApiKeySchema,
    UserThemeSchema,
} from "@courselit/orm-models";
import type {
    InternalCertificateTemplate,
    InternalCourse,
    InternalLesson,
    InternalPage,
    InternalCommunity,
    InternalUser,
} from "@courselit/orm-models";
import { loadEnvFile } from "node:process";
import { MediaLit } from "medialit";
import { extractMediaIDs } from "@courselit/utils";
import CommonModels from "@courselit/common-models";
const { CommunityMediaTypes, Constants } = CommonModels;

function getMediaLitClient() {
    const medialit = new MediaLit({
        apiKey: process.env.MEDIALIT_APIKEY,
        endpoint: process.env.MEDIALIT_SERVER,
    });

    return medialit;
}

loadEnvFile();

if (!process.env.DB_CONNECTION_STRING) {
    throw new Error("DB_CONNECTION_STRING is not set");
}

if (!process.argv[2]) {
    throw new Error("Domain name is not provided");
}

mongoose.connect(process.env.DB_CONNECTION_STRING);

async function deleteMedia(mediaId: string) {
    try {
        const medialitClient = getMediaLitClient();
        await medialitClient.delete(mediaId);
    } catch (error) {
        console.log("Can't delete media", mediaId, error);
    }
}

const DomainModel = mongoose.model("Domain", DomainSchema);
const CourseModel = mongoose.model("Course", CourseSchema);
const LessonModel = mongoose.model("Lesson", LessonSchema);
const CertificateTemplateModel = mongoose.model(
    "CertificateTemplate",
    CertificateTemplateSchema,
);
const CertificateModel = mongoose.model("Certificate", CertificateSchema);
const MembershipModel = mongoose.model("Membership", MembershipSchema);
const PaymentPlanModel = mongoose.model("PaymentPlan", PaymentPlanSchema);
const ActivityModel = mongoose.model("Activity", ActivitySchema);
const LessonEvaluationModel = mongoose.model(
    "LessonEvaluation",
    LessonEvaluationSchema,
);
const PageModel = mongoose.model("Page", PageSchema);
const CommunityModel = mongoose.model("Community", CommunitySchema);
const CommunityPostSubscriberModel = mongoose.model(
    "CommunityPostSubscriber",
    CommunityPostSubscriberSchema,
);
const InvoiceModel = mongoose.model("Invoice", InvoiceSchema);
const UserModel = mongoose.model("User", UserSchema);
const SequenceModel = mongoose.model("Sequence", SequenceSchema);
const UserSegmentModel = mongoose.model("UserSegment", UserSegmentSchema);
const UserThemeModel = mongoose.model("UserTheme", UserThemeSchema);
const OngoingSequenceModel = mongoose.model(
    "OngoingSequence",
    OngoingSequenceSchema,
);
const NotificationModel = mongoose.model("Notification", NotificationSchema);
const RuleModel = mongoose.model("Rule", RuleSchema);
const EmailEventModel = mongoose.model("EmailEvent", EmailEventSchema);
const EmailDeliveryModel = mongoose.model("EmailDelivery", EmailDeliverySchema);
const DownloadLinkModel = mongoose.model("DownloadLink", DownloadLinkSchema);
const ApiKeyModel = mongoose.model("ApiKey", ApiKeySchema);

async function cleanupDomain(name: string) {
    const domain = await DomainModel.findOne({ name });
    if (!domain) {
        console.log("Domain not found");
        return;
    }

    await ActivityModel.deleteMany({ domain: domain._id });
    await InvoiceModel.deleteMany({ domain: domain._id });
    await MembershipModel.deleteMany({ domain: domain._id });
    await PaymentPlanModel.deleteMany({ domain: domain._id });
    await CommunityReportModel.deleteMany({ domain: domain._id });
    await CommunityCommentModel.deleteMany({ domain: domain._id });
    await CertificateModel.deleteMany({ domain: domain._id });
    await LessonEvaluationModel.deleteMany({ domain: domain._id });
    await UserSegmentModel.deleteMany({ domain: domain._id });
    await UserThemeModel.deleteMany({ domain: domain._id });
    await NotificationModel.deleteMany({ domain: domain._id });
    await RuleModel.deleteMany({ domain: domain._id });
    await OngoingSequenceModel.deleteMany({ domain: domain._id });
    await SequenceModel.deleteMany({ domain: domain._id });
    await EmailEventModel.deleteMany({ domain: domain._id });
    await EmailDeliveryModel.deleteMany({ domain: domain._id });
    await DownloadLinkModel.deleteMany({ domain: domain._id });
    await ApiKeyModel.deleteMany({ domain: domain._id });

    const products = (await CourseModel.find({
        domain: domain._id,
    }).lean()) as InternalCourse[];
    for (const product of products) {
        await deleteProduct({ product, domain: domain._id });
    }

    await CommunityPostSubscriberModel.deleteMany({ domain: domain._id });
    const communities = (await CommunityModel.find({
        domain: domain._id,
    }).lean()) as InternalCommunity[];
    for (const community of communities) {
        await deleteCommunity({ community, domain: domain._id });
    }

    const usersWithAvatar = (await UserModel.find({
        domain: domain._id,
        avatar: { $exists: true },
    }).lean()) as InternalUser[];
    for (const user of usersWithAvatar) {
        await deleteMedia(user.avatar.mediaId);
    }
    await UserModel.deleteMany({ domain: domain._id });

    const mediaToBeDeleted = extractMediaIDs(JSON.stringify(domain));
    for (const mediaId of Array.from(mediaToBeDeleted)) {
        await deleteMedia(mediaId);
    }
    await DomainModel.deleteOne({ _id: domain._id });
    console.log(`✅ Deleted: ${name}`);
}

async function deleteProduct({
    product,
    domain,
}: {
    product: InternalCourse;
    domain: mongoose.Types.ObjectId;
}) {
    const certificateTemplate =
        await CertificateTemplateModel.findOne<InternalCertificateTemplate | null>(
            {
                domain,
                courseId: product.courseId,
            },
        );
    if (certificateTemplate?.signatureImage?.mediaId) {
        await deleteMedia(certificateTemplate.signatureImage.mediaId);
    }
    if (certificateTemplate?.logo?.mediaId) {
        await deleteMedia(certificateTemplate.logo.mediaId);
    }
    await CertificateTemplateModel.deleteOne({
        domain,
        courseId: product.courseId,
    });
    await deleteLessons(product.courseId, domain);
    if (product.featuredImage) {
        await deleteMedia(product.featuredImage.mediaId);
    }
    if (product.description) {
        const extractedMediaIds = extractMediaIDs(product.description || "");
        for (const mediaId of Array.from(extractedMediaIds)) {
            await deleteMedia(mediaId);
        }
    }
    await deletePage({
        pageId: product.pageId,
        domain,
    });
    await CourseModel.deleteOne({
        domain,
        courseId: product.courseId,
    });
}

async function deletePage({
    pageId,
    domain,
}: {
    pageId: string;
    domain: mongoose.Types.ObjectId;
}) {
    const page = (await PageModel.findOne({
        pageId,
        domain,
    }).lean()) as InternalPage;

    if (!page) {
        return;
    }

    const mediaToBeDeleted = extractMediaIDs(JSON.stringify(page));
    for (const mediaId of Array.from(mediaToBeDeleted)) {
        console.log("Page media", mediaId);
        await deleteMedia(mediaId);
    }

    await PageModel.deleteOne({
        domain,
        pageId,
    });
}

async function deleteLessons(id: string, domain: mongoose.Types.ObjectId) {
    const lessons = (await LessonModel.find({
        courseId: id,
        domain,
    }).lean()) as InternalLesson[];

    const cleanupTasks: Promise<void>[] = [];

    for (const lesson of lessons) {
        if (lesson.media?.mediaId) {
            cleanupTasks.push(deleteMedia(lesson.media.mediaId));
        }
        if (lesson.type === Constants.LessonType.TEXT && lesson.content) {
            const extractedMediaIds = extractMediaIDs(
                JSON.stringify(lesson.content),
            );
            for (const mediaId of Array.from(extractedMediaIds)) {
                cleanupTasks.push(deleteMedia(mediaId));
            }
        }
        if (
            lesson.type === Constants.LessonType.SCORM &&
            lesson.content &&
            (lesson.content as CommonModels.ScormContent).mediaId
        ) {
            cleanupTasks.push(
                deleteMedia(
                    (lesson.content as CommonModels.ScormContent).mediaId!,
                ),
            );
        }
    }

    await Promise.all(cleanupTasks);
    await LessonModel.deleteMany({ courseId: id, domain });
}

const CommunityReportModel = mongoose.model(
    "CommunityReport",
    CommunityReportSchema,
);
const CommunityCommentModel = mongoose.model(
    "CommunityComment",
    CommunityCommentSchema,
);
const CommunityPostModel = mongoose.model("CommunityPost", CommunityPostSchema);

async function deleteCommunity({
    community,
    domain,
}: {
    community: InternalCommunity;
    domain: mongoose.Types.ObjectId;
}) {
    const mediaTypesToDelete = [
        CommunityMediaTypes.IMAGE,
        CommunityMediaTypes.VIDEO,
        CommunityMediaTypes.GIF,
        CommunityMediaTypes.PDF,
    ];
    const postsWithMedia = await CommunityPostModel.aggregate<{
        media: CommonModels.CommunityMedia[];
    }>([
        {
            $match: {
                domain,
                communityId: community.communityId,
                "media.type": { $in: mediaTypesToDelete },
            },
        },
        {
            $project: {
                media: {
                    $filter: {
                        input: "$media",
                        as: "media",
                        cond: {
                            $and: [
                                {
                                    $in: ["$$media.type", mediaTypesToDelete],
                                },
                                { $ifNull: ["$$media.media.mediaId", false] },
                            ],
                        },
                    },
                },
            },
        },
    ]);
    for (const post of postsWithMedia) {
        for (const media of post.media) {
            console.log("Post media", media);
            const mediaId = media.media?.mediaId;
            if (mediaId) {
                await deleteMedia(mediaId);
            }
        }
    }
    await CommunityPostModel.deleteMany({
        domain,
        communityId: community.communityId,
    });
    await deletePage({
        pageId: community.pageId,
        domain,
    });
    const mediaToBeDeleted = extractMediaIDs(JSON.stringify(community));
    for (const mediaId of Array.from(mediaToBeDeleted)) {
        await deleteMedia(mediaId);
    }
    await CommunityModel.deleteOne({
        domain,
        communityId: community.communityId,
    });
}

(async () => {
    await cleanupDomain(process.argv[2]);
    mongoose.connection.close();
})();

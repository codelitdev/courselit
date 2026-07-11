import {
    getNotificationPreferences,
    getNotification,
    seedNotificationPreferencesForUser,
    updateNotificationPreference,
} from "../logic";
import DomainModel from "@models/Domain";
import UserModel from "@models/User";
import NotificationPreferenceModel from "@models/NotificationPreference";
import NotificationModel from "@models/Notification";
import CommunityModel from "@models/Community";
import CommunityPostModel from "@models/CommunityPost";
import CourseModel from "@models/Course";
import constants from "@/config/constants";
import { Constants } from "@courselit/common-models";
import { DiscussionActivityEventType } from "@/graphql/product-discussions/logic";
import {
    NotificationRepository,
    CourseRepository,
    CommunityPostRepository,
    CommunityRepository,
    UserRepository,
    DomainRepository,
} from "@courselit/orm-models";

const communityPostRepo = new CommunityPostRepository(CommunityPostModel);
const communityRepo = new CommunityRepository(CommunityModel);
const courseRepo = new CourseRepository(CourseModel);
const domainRepo = new DomainRepository(DomainModel);
const notificationRepo = new NotificationRepository(NotificationModel);
const userRepo = new UserRepository(UserModel);

const SUITE_PREFIX = `notification-preferences-${Date.now()}`;
const id = (suffix: string) => `${SUITE_PREFIX}-${suffix}`;
const email = (suffix: string) => `${suffix}-${SUITE_PREFIX}@example.com`;

describe("Notification Preferences", () => {
    let domain: any;
    let learner: any;
    let manager: any;

    beforeAll(async () => {
        domain = await domainRepo.create({
            name: id("domain"),
            email: email("domain"),
        });

        learner = await userRepo.create({
            domain: domain._id,
            userId: id("learner"),
            email: email("learner"),
            name: "Learner",
            permissions: [constants.permissions.enrollInCourse],
            active: true,
            purchases: [],
            unsubscribeToken: id("unsub-learner"),
        });

        manager = await userRepo.create({
            domain: domain._id,
            userId: id("manager"),
            email: email("manager"),
            name: "Manager",
            permissions: [constants.permissions.manageAnyCourse],
            active: true,
            purchases: [],
            unsubscribeToken: id("unsub-manager"),
        });
    });

    afterEach(async () => {
        await NotificationPreferenceModel.deleteMany({ domain: domain._id });
        await NotificationModel.deleteMany({ domain: domain._id });
        await CommunityPostModel.deleteMany({ domain: domain._id });
        await CommunityModel.deleteMany({ domain: domain._id });
        await CourseModel.deleteMany({ domain: domain._id });
    });

    afterAll(async () => {
        await NotificationModel.deleteMany({ domain: domain._id });
        await CommunityPostModel.deleteMany({ domain: domain._id });
        await CommunityModel.deleteMany({ domain: domain._id });
        await CourseModel.deleteMany({ domain: domain._id });
        await NotificationPreferenceModel.deleteMany({ domain: domain._id });
        await UserModel.deleteMany({ domain: domain._id });
        await DomainModel.deleteOne({ _id: domain._id });
    });

    it("should return an empty list when preferences are not seeded", async () => {
        const preferences = await getNotificationPreferences({
            ctx: {
                user: learner,
                subdomain: domain,
            } as any,
        });

        expect(preferences).toEqual([]);
    });

    it("should seed only general preferences", async () => {
        await seedNotificationPreferencesForUser({
            domain: domain._id,
            userId: manager.userId,
        });

        const preferences = await getNotificationPreferences({
            ctx: {
                user: manager,
                subdomain: domain,
            } as any,
        });

        const purchasedPreference = preferences.find(
            (preference) =>
                preference.activityType === Constants.ActivityType.PURCHASED,
        );

        const generalPreference = preferences.find(
            (preference) =>
                preference.activityType ===
                Constants.ActivityType.COMMUNITY_POST_CREATED,
        );
        const courseDiscussionCommentPreference = preferences.find(
            (preference) =>
                preference.activityType ===
                Constants.ActivityType.COURSE_DISCUSSION_COMMENT_CREATED,
        );
        const courseDiscussionReactionPreference = preferences.find(
            (preference) =>
                preference.activityType ===
                Constants.ActivityType.COURSE_DISCUSSION_REACTED,
        );

        expect(generalPreference).toBeTruthy();
        expect(generalPreference?.channels).toEqual([
            Constants.NotificationChannel.APP,
            Constants.NotificationChannel.EMAIL,
        ]);
        expect(courseDiscussionCommentPreference?.channels).toEqual([
            Constants.NotificationChannel.APP,
            Constants.NotificationChannel.EMAIL,
        ]);
        expect(courseDiscussionReactionPreference?.channels).toEqual([
            Constants.NotificationChannel.APP,
            Constants.NotificationChannel.EMAIL,
        ]);
        expect(purchasedPreference).toBeUndefined();
    });

    it("should include general preferences for users", async () => {
        await seedNotificationPreferencesForUser({
            domain: domain._id,
            userId: manager.userId,
        });

        const preferences = await getNotificationPreferences({
            ctx: {
                user: manager,
                subdomain: domain,
            } as any,
        });

        const generalPreference = preferences.find(
            (preference) =>
                preference.activityType ===
                Constants.ActivityType.COMMUNITY_POST_CREATED,
        );

        expect(generalPreference).toBeTruthy();
        expect(generalPreference?.channels).toEqual([
            Constants.NotificationChannel.APP,
            Constants.NotificationChannel.EMAIL,
        ]);
    });

    it("should return persisted channels for saved preference", async () => {
        await NotificationPreferenceModel.create({
            domain: domain._id,
            userId: manager.userId,
            activityType: Constants.ActivityType.COMMUNITY_POST_CREATED,
            channels: [Constants.NotificationChannel.APP],
        });

        const preferences = await getNotificationPreferences({
            ctx: {
                user: manager,
                subdomain: domain,
            } as any,
        });

        const preference = preferences.find(
            (item) =>
                item.activityType ===
                Constants.ActivityType.COMMUNITY_POST_CREATED,
        );

        expect(preference?.channels).toEqual([
            Constants.NotificationChannel.APP,
        ]);
    });

    it("should update a valid notification preference", async () => {
        const updated = await updateNotificationPreference({
            ctx: {
                user: learner,
                subdomain: domain,
            } as any,
            activityType: Constants.ActivityType.COMMUNITY_POST_CREATED,
            channels: [Constants.NotificationChannel.APP],
        });

        expect(updated.activityType).toBe(
            Constants.ActivityType.COMMUNITY_POST_CREATED,
        );
        expect(updated.channels).toEqual([Constants.NotificationChannel.APP]);

        const persisted = await NotificationPreferenceModel.findOne({
            domain: domain._id,
            userId: learner.userId,
            activityType: Constants.ActivityType.COMMUNITY_POST_CREATED,
        }).lean();

        expect(persisted?.channels).toEqual([
            Constants.NotificationChannel.APP,
        ]);
    });

    it("should reject updates for unauthorized activity", async () => {
        await expect(
            updateNotificationPreference({
                ctx: {
                    user: learner,
                    subdomain: domain,
                } as any,
                activityType: Constants.ActivityType.USER_CREATED,
                channels: [Constants.NotificationChannel.APP],
            }),
        ).rejects.toThrow("You do not have rights to perform this action");
    });

    it("should allow updating general preference", async () => {
        const updated = await updateNotificationPreference({
            ctx: {
                user: manager,
                subdomain: domain,
            } as any,
            activityType: Constants.ActivityType.COMMUNITY_POST_CREATED,
            channels: [Constants.NotificationChannel.APP],
        });

        expect(updated.activityType).toBe(
            Constants.ActivityType.COMMUNITY_POST_CREATED,
        );
        expect(updated.channels).toEqual([Constants.NotificationChannel.APP]);
    });

    it("should delete preference row when channels are cleared", async () => {
        await NotificationPreferenceModel.create({
            domain: domain._id,
            userId: learner.userId,
            activityType: Constants.ActivityType.COMMUNITY_POST_CREATED,
            channels: [Constants.NotificationChannel.APP],
        });

        const updated = await updateNotificationPreference({
            ctx: {
                user: learner,
                subdomain: domain,
            } as any,
            activityType: Constants.ActivityType.COMMUNITY_POST_CREATED,
            channels: [],
        });

        expect(updated).toEqual({
            activityType: Constants.ActivityType.COMMUNITY_POST_CREATED,
            channels: [],
        });

        const persisted = await NotificationPreferenceModel.findOne({
            domain: domain._id,
            userId: learner.userId,
            activityType: Constants.ActivityType.COMMUNITY_POST_CREATED,
        }).lean();

        expect(persisted).toBeNull();
    });

    it("should format notification message and href using shared formatter", async () => {
        const community = await communityRepo.create({
            domain: domain._id,
            communityId: id("community"),
            name: "Community A",
            pageId: id("community-page"),
            slug: id("community-page"),
        });

        const post = await communityPostRepo.create({
            domain: domain._id,
            postId: id("post"),
            communityId: community.communityId,
            userId: learner.userId,
            title: "A post title for notification formatting",
            content: "Sample content",
            category: "General",
        });

        const notification = await notificationRepo.create({
            domain: domain._id,
            notificationId: id("notification"),
            userId: learner.userId,
            forUserId: manager.userId,
            activityType: Constants.ActivityType.COMMUNITY_POST_CREATED,
            entityId: post.postId,
        });

        const response = await getNotification({
            ctx: {
                user: manager,
                subdomain: domain,
            } as any,
            notificationId: notification.notificationId,
        });

        expect(response).toBeTruthy();
        expect(response?.href).toBe(
            `/dashboard/community/${community.communityId}/${post.postId}`,
        );
        expect(response?.message).toContain("created a post");
        expect(response?.message).toContain("Community A");
    });

    it("should add preview mode to unpublished course discussion notification hrefs for managers only", async () => {
        const course = await courseRepo.create({
            domain: domain._id,
            courseId: id("discussion-course"),
            title: "Discussion Course",
            slug: id("discussion-course-slug"),
            cost: 0,
            costType: "free",
            privacy: "public",
            type: "course",
            creatorId: manager.userId,
            published: false,
            discussions: true,
        });

        const notification = await notificationRepo.create({
            domain: domain._id,
            notificationId: id("discussion-notification"),
            userId: learner.userId,
            forUserId: manager.userId,
            activityType:
                Constants.ActivityType.COURSE_DISCUSSION_COMMENT_CREATED,
            entityId: id("comment"),
            metadata: {
                eventType: DiscussionActivityEventType.COMMENT_CREATED,
                courseId: course.courseId,
                entityType: Constants.ProductDiscussionEntityType.LESSON,
                entityId: id("lesson"),
                commentId: id("comment"),
            },
        });

        const response = await getNotification({
            ctx: {
                user: manager,
                subdomain: domain,
            } as any,
            notificationId: notification.notificationId,
        });

        expect(response).toBeTruthy();
        expect(response?.href).toBe(
            `/course/${course.slug}/${course.courseId}/${id(
                "lesson",
            )}?discussion=open&preview=true#discussion-comment-${id("comment")}`,
        );
        expect(response?.message).toContain("commented on Discussion Course");

        const learnerNotification = await notificationRepo.create({
            domain: domain._id,
            notificationId: id("learner-discussion-notification"),
            userId: manager.userId,
            forUserId: learner.userId,
            activityType:
                Constants.ActivityType.COURSE_DISCUSSION_COMMENT_CREATED,
            entityId: id("comment"),
            metadata: notification.metadata,
        });
        const learnerResponse = await getNotification({
            ctx: {
                user: learner,
                subdomain: domain,
            } as any,
            notificationId: learnerNotification.notificationId,
        });

        expect(learnerResponse?.href).toBe(
            `/course/${course.slug}/${course.courseId}/${id(
                "lesson",
            )}?discussion=open#discussion-comment-${id("comment")}`,
        );

        const reactionNotification = await notificationRepo.create({
            domain: domain._id,
            notificationId: id("discussion-reaction-notification"),
            userId: learner.userId,
            forUserId: manager.userId,
            activityType: Constants.ActivityType.COURSE_DISCUSSION_REACTED,
            entityId: id("reply"),
            metadata: {
                courseId: course.courseId,
                entityType: Constants.ProductDiscussionEntityType.LESSON,
                entityId: id("lesson"),
                contentType: Constants.ProductDiscussionContentType.REPLY,
                commentId: id("comment"),
                replyId: id("reply"),
            },
        });
        const reactionResponse = await getNotification({
            ctx: {
                user: manager,
                subdomain: domain,
            } as any,
            notificationId: reactionNotification.notificationId,
        });

        expect(reactionResponse?.message).toContain(
            "reacted to your reply on Discussion Course",
        );
        expect(reactionResponse?.href).toBe(
            `/course/${course.slug}/${course.courseId}/${id(
                "lesson",
            )}?discussion=open&preview=true#discussion-reply-${id("reply")}`,
        );
    });

    it("should return empty message and href when entity cannot be resolved", async () => {
        const notification = await notificationRepo.create({
            domain: domain._id,
            notificationId: id("missing-entity-notification"),
            userId: learner.userId,
            forUserId: manager.userId,
            activityType: Constants.ActivityType.COMMUNITY_POST_CREATED,
            entityId: id("missing-post"),
        });

        const response = await getNotification({
            ctx: {
                user: manager,
                subdomain: domain,
            } as any,
            notificationId: notification.notificationId,
        });

        expect(response).toBeTruthy();
        expect(response?.href).toBe("");
        expect(response?.message).toBe("");
    });

    it("should require activityType on notification documents", async () => {
        await expect(
            notificationRepo.create({
                domain: domain._id,
                notificationId: id("invalid-notification"),
                userId: learner.userId,
                forUserId: manager.userId,
                entityId: id("entity"),
            } as any),
        ).rejects.toThrow("activityType");
    });
});

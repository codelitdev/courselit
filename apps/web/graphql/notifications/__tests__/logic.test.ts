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
import CommunityCommentModel from "@models/CommunityComment";
import CourseModel from "@models/Course";
import LessonModel from "@models/Lesson";
import MembershipModel from "@models/Membership";
import constants from "@/config/constants";
import { Constants } from "@courselit/common-models";

const SUITE_PREFIX = `notification-preferences-${Date.now()}`;
const id = (suffix: string) => `${SUITE_PREFIX}-${suffix}`;
const email = (suffix: string) => `${suffix}-${SUITE_PREFIX}@example.com`;

describe("Notification Preferences", () => {
    let domain: any;
    let learner: any;
    let manager: any;

    beforeAll(async () => {
        domain = await DomainModel.create({
            name: id("domain"),
            email: email("domain"),
        });

        learner = await UserModel.create({
            domain: domain._id,
            userId: id("learner"),
            email: email("learner"),
            name: "Learner",
            permissions: [constants.permissions.enrollInCourse],
            active: true,
            purchases: [],
            unsubscribeToken: id("unsub-learner"),
        });

        manager = await UserModel.create({
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
        await CommunityCommentModel.deleteMany({ domain: domain._id });
        await CommunityPostModel.deleteMany({ domain: domain._id });
        await CommunityModel.deleteMany({ domain: domain._id });
        await MembershipModel.deleteMany({ domain: domain._id });
        await LessonModel.deleteMany({ domain: domain._id });
        await CourseModel.deleteMany({ domain: domain._id });
        await UserModel.updateMany(
            { domain: domain._id },
            { $set: { purchases: [] } },
        );
    });

    afterAll(async () => {
        await NotificationModel.deleteMany({ domain: domain._id });
        await CommunityCommentModel.deleteMany({ domain: domain._id });
        await CommunityPostModel.deleteMany({ domain: domain._id });
        await CommunityModel.deleteMany({ domain: domain._id });
        await MembershipModel.deleteMany({ domain: domain._id });
        await LessonModel.deleteMany({ domain: domain._id });
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

        expect(generalPreference).toBeTruthy();
        expect(generalPreference?.channels).toEqual([
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
        const community = await CommunityModel.create({
            domain: domain._id,
            communityId: id("community"),
            name: "Community A",
            pageId: id("community-page"),
            slug: id("community-page"),
        });

        const post = await CommunityPostModel.create({
            domain: domain._id,
            postId: id("post"),
            communityId: community.communityId,
            userId: learner.userId,
            title: "A post title for notification formatting",
            content: "Sample content",
            category: "General",
        });

        const notification = await NotificationModel.create({
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

    it("should link course discussion comment notifications to the course lesson", async () => {
        const course = await CourseModel.create({
            domain: domain._id,
            courseId: id("course-discussion-course"),
            title: "Notification Course",
            slug: id("notification-course"),
            creatorId: manager.userId,
            cost: 0,
            costType: "free",
            privacy: "unlisted",
            type: "course",
            published: true,
            lessons: [id("course-discussion-lesson")],
            groups: [],
        });
        await LessonModel.create({
            domain: domain._id,
            lessonId: course.lessons[0],
            title: "Notification Lesson",
            type: constants.text,
            creatorId: manager.userId,
            courseId: course.courseId,
            groupId: id("course-discussion-group"),
            published: true,
        });
        const community = await CommunityModel.create({
            domain: domain._id,
            communityId: id("course-discussion-community"),
            name: "Notification Course Discussions",
            pageId: id("course-discussion-community-page"),
            slug: id("course-discussion-community-slug"),
            courseId: course.courseId,
        });
        const post = await CommunityPostModel.create({
            domain: domain._id,
            postId: id("course-discussion-post"),
            communityId: community.communityId,
            userId: manager.userId,
            title: "Lesson discussion",
            content: "Sample content",
            category: "General",
            lessonId: course.lessons[0],
        });
        const comment = await CommunityCommentModel.create({
            domain: domain._id,
            commentId: id("course-discussion-comment"),
            communityId: community.communityId,
            postId: post.postId,
            userId: learner.userId,
            content: "Course discussion comment",
        });
        const notification = await NotificationModel.create({
            domain: domain._id,
            notificationId: id("course-discussion-comment-notification"),
            userId: learner.userId,
            forUserId: manager.userId,
            activityType: Constants.ActivityType.COMMUNITY_COMMENT_CREATED,
            entityId: comment.commentId,
            metadata: {
                postId: post.postId,
                courseId: course.courseId,
                lessonId: course.lessons[0],
            },
        });

        const response = await getNotification({
            ctx: {
                user: manager,
                subdomain: domain,
            } as any,
            notificationId: notification.notificationId,
        });

        expect(response?.href).toBe(
            `/course/${course.slug}/${course.courseId}/${course.lessons[0]}?discussion=open#${comment.commentId}`,
        );
    });

    it("should link course discussion reply notifications to the course lesson", async () => {
        const lessonId = id("course-discussion-reply-lesson");
        const course = await CourseModel.create({
            domain: domain._id,
            courseId: id("course-discussion-reply-course"),
            title: "Reply Notification Course",
            slug: id("reply-notification-course"),
            creatorId: manager.userId,
            cost: 0,
            costType: "free",
            privacy: "unlisted",
            type: "course",
            published: true,
            lessons: [lessonId],
            groups: [],
        });
        await LessonModel.create({
            domain: domain._id,
            lessonId,
            title: "Reply Notification Lesson",
            type: constants.text,
            creatorId: manager.userId,
            courseId: course.courseId,
            groupId: id("course-discussion-reply-group"),
            published: true,
        });
        const community = await CommunityModel.create({
            domain: domain._id,
            communityId: id("course-discussion-reply-community"),
            name: "Reply Course Discussions",
            pageId: id("course-discussion-reply-community-page"),
            slug: id("course-discussion-reply-community-slug"),
            courseId: course.courseId,
        });
        const post = await CommunityPostModel.create({
            domain: domain._id,
            postId: id("course-discussion-reply-post"),
            communityId: community.communityId,
            userId: manager.userId,
            title: "Reply lesson discussion",
            content: "Sample content",
            category: "General",
            lessonId,
        });
        const comment = await CommunityCommentModel.create({
            domain: domain._id,
            commentId: id("course-discussion-reply-comment"),
            communityId: community.communityId,
            postId: post.postId,
            userId: learner.userId,
            content: "Course discussion comment",
            replies: [
                {
                    replyId: id("course-discussion-reply"),
                    userId: manager.userId,
                    content: "Reply content",
                },
            ],
        });
        const replyId = comment.replies[0].replyId;
        const notification = await NotificationModel.create({
            domain: domain._id,
            notificationId: id("course-discussion-reply-notification"),
            userId: manager.userId,
            forUserId: learner.userId,
            activityType: Constants.ActivityType.COMMUNITY_REPLY_CREATED,
            entityId: replyId,
            entityTargetId: comment.commentId,
            metadata: {
                postId: post.postId,
                commentId: comment.commentId,
                courseId: course.courseId,
                lessonId,
            },
        });
        await UserModel.updateOne(
            { domain: domain._id, userId: learner.userId },
            {
                $set: {
                    purchases: [
                        {
                            courseId: course.courseId,
                            completedLessons: [],
                            accessibleGroups: [],
                        },
                    ],
                },
            },
        );
        await MembershipModel.create({
            domain: domain._id,
            membershipId: id("reply-notification-course-membership"),
            sessionId: id("reply-notification-course-session"),
            userId: learner.userId,
            entityId: course.courseId,
            entityType: Constants.MembershipEntityType.COURSE,
            paymentPlanId: id("reply-notification-course-membership-plan"),
            status: Constants.MembershipStatus.ACTIVE,
        });

        const response = await getNotification({
            ctx: {
                user: learner,
                subdomain: domain,
            } as any,
            notificationId: notification.notificationId,
        });

        expect(response?.href).toBe(
            `/course/${course.slug}/${course.courseId}/${lessonId}?discussion=open#${replyId}`,
        );
    });

    it("should hide course discussion notification details after lesson access is lost", async () => {
        const lessonId = id("course-discussion-lost-access-lesson");
        const course = await CourseModel.create({
            domain: domain._id,
            courseId: id("course-discussion-lost-access-course"),
            title: "Lost Access Course",
            slug: id("lost-access-course"),
            creatorId: manager.userId,
            cost: 0,
            costType: "free",
            privacy: "unlisted",
            type: "course",
            published: true,
            lessons: [lessonId],
            groups: [],
        });
        await LessonModel.create({
            domain: domain._id,
            lessonId,
            title: "Lost Access Lesson",
            type: constants.text,
            creatorId: manager.userId,
            courseId: course.courseId,
            groupId: id("course-discussion-lost-access-group"),
            published: true,
        });
        const community = await CommunityModel.create({
            domain: domain._id,
            communityId: id("course-discussion-lost-access-community"),
            name: "Lost Access Discussions",
            pageId: id("course-discussion-lost-access-community-page"),
            slug: id("course-discussion-lost-access-community-slug"),
            courseId: course.courseId,
        });
        const post = await CommunityPostModel.create({
            domain: domain._id,
            postId: id("course-discussion-lost-access-post"),
            communityId: community.communityId,
            userId: manager.userId,
            title: "Hidden lesson discussion",
            content: "Sample content",
            category: "General",
            lessonId,
        });
        const comment = await CommunityCommentModel.create({
            domain: domain._id,
            commentId: id("course-discussion-lost-access-comment"),
            communityId: community.communityId,
            postId: post.postId,
            userId: learner.userId,
            content: "Hidden comment",
            replies: [
                {
                    replyId: id("course-discussion-lost-access-reply"),
                    userId: manager.userId,
                    content: "Hidden reply content",
                },
            ],
        });
        const notification = await NotificationModel.create({
            domain: domain._id,
            notificationId: id("course-discussion-lost-access-notification"),
            userId: manager.userId,
            forUserId: learner.userId,
            activityType: Constants.ActivityType.COMMUNITY_REPLY_CREATED,
            entityId: comment.replies[0].replyId,
            entityTargetId: comment.commentId,
            metadata: {
                postId: post.postId,
                commentId: comment.commentId,
                courseId: course.courseId,
                lessonId,
            },
        });

        const response = await getNotification({
            ctx: {
                user: learner,
                subdomain: domain,
            } as any,
            notificationId: notification.notificationId,
        });

        expect(response?.href).toBe("");
        expect(response?.message).toBe("");
    });

    it("should return empty message and href when entity cannot be resolved", async () => {
        const notification = await NotificationModel.create({
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
            NotificationModel.create({
                domain: domain._id,
                notificationId: id("invalid-notification"),
                userId: learner.userId,
                forUserId: manager.userId,
                entityId: id("entity"),
            } as any),
        ).rejects.toThrow("activityType");
    });
});

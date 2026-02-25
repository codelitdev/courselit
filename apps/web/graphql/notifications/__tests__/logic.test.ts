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
        await CommunityPostModel.deleteMany({ domain: domain._id });
        await CommunityModel.deleteMany({ domain: domain._id });
    });

    afterAll(async () => {
        await NotificationModel.deleteMany({ domain: domain._id });
        await CommunityPostModel.deleteMany({ domain: domain._id });
        await CommunityModel.deleteMany({ domain: domain._id });
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
            `/dashboard/community/${community.communityId}`,
        );
        expect(response?.message).toContain("created a post");
        expect(response?.message).toContain("Community A");
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

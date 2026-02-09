/**
 * @jest-environment node
 */

import { deleteUser } from "../logic";
import UserModel from "@courselit/orm-models/dao/user";
import CourseModel from "@courselit/orm-models/dao/course";
import PageModel from "@courselit/orm-models/dao/page";
import EmailTemplateModel from "@courselit/orm-models/dao/email-template";
import SequenceModel from "@courselit/orm-models/dao/sequence";
import UserSegmentModel from "@courselit/orm-models/dao/user-segment";
import EmailDeliveryModel from "@courselit/orm-models/dao/email-delivery";
import UserThemeModel from "@courselit/orm-models/dao/user-theme";
import PaymentPlanModel from "@courselit/orm-models/dao/payment-plan";
import OngoingSequenceModel from "@courselit/orm-models/dao/ongoing-sequence";
import NotificationModel from "@courselit/orm-models/dao/notification";
import MailRequestStatusModel from "@courselit/orm-models/dao/mail-request-status";
import LessonEvaluationModel from "@courselit/orm-models/dao/lesson-evaluation";
import DownloadLinkModel from "@courselit/orm-models/dao/download-link";
import CommunityReportModel from "@courselit/orm-models/dao/community-report";
import CertificateModel from "@courselit/orm-models/dao/certificate";
import ActivityModel from "@courselit/orm-models/dao/activity";
import EmailEventModel from "@courselit/orm-models/dao/email-event";
import CommunityPostSubscriberModel from "@courselit/orm-models/dao/community-post-subscriber";
import CommunityPostModel from "@courselit/orm-models/dao/community-post";
import CommunityCommentModel from "@courselit/orm-models/dao/community-comment";
import InvoiceModel from "@courselit/orm-models/dao/invoice";
import MembershipModel from "@courselit/orm-models/dao/membership";
import CommunityModel from "@courselit/orm-models/dao/community";
import LessonModel from "@courselit/orm-models/dao/lesson";
import DomainModel from "@courselit/orm-models/dao/domain";
import { responses, internal } from "@/config/strings";
import constants from "@/config/constants";
import { Constants } from "@courselit/common-models";
import { deleteMedia } from "@/services/medialit";
import { deleteCommunityPosts } from "../../communities/logic";

// Mock external dependencies
jest.mock("@/services/medialit", () => ({
    deleteMedia: jest.fn().mockResolvedValue(true),
}));

jest.mock("@/payments-new", () => ({
    getPaymentMethodFromSettings: jest.fn().mockResolvedValue({
        cancel: jest.fn().mockResolvedValue(true),
    }),
}));

jest.mock("../../communities/logic", () => ({
    ...jest.requireActual("../../communities/logic"),
    deleteCommunityPosts: jest.fn().mockResolvedValue(true),
}));

const DELETE_USER_SUITE_PREFIX = `delete-user-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
const duId = (suffix: string) => `${DELETE_USER_SUITE_PREFIX}-${suffix}`;
const duEmail = (suffix: string) =>
    `${suffix}-${DELETE_USER_SUITE_PREFIX}@example.com`;
const DU_OTHER_USER_ID = duId("other-user");

const { permissions } = constants;

describe("deleteUser - Comprehensive Test Suite", () => {
    let testDomain: any;
    let adminUser: any;
    let targetUser: any;
    let mockCtx: any;

    beforeAll(async () => {
        // Create test domain with unique name to avoid conflicts with other tests
        testDomain = await DomainModel.createOne({
            name: duId("domain"),
            email: duEmail("domain"),
            tags: ["tag1", "tag2"],
        });
    });

    beforeEach(async () => {
        // Create admin user (deleter)
        adminUser = await UserModel.createUser({
            domain: testDomain._id,
            userId: duId("admin-user"),
            name: "Admin User",
            email: duEmail("admin"),
            active: true,
            permissions: [
                permissions.manageUsers,
                permissions.manageCourse,
                permissions.manageSite,
            ],
            purchases: [],
            unsubscribeToken: duId("unsubscribe-admin"),
        });

        // Create target user (to be deleted)
        targetUser = await UserModel.createUser({
            domain: testDomain._id,
            userId: duId("target-user"),
            name: "Target User",
            email: duEmail("target"),
            active: true,
            permissions: [permissions.enrollInCourse],
            purchases: [],
            unsubscribeToken: duId("unsubscribe-target"),
            avatar: {
                mediaId: duId("avatar"),
                file: "avatar.png",
                originalFileName: "avatar.png",
                mimeType: "image/png",
                size: 1024,
                access: "public",
            },
        });

        // Setup mock context
        mockCtx = {
            subdomain: testDomain as any,
            user: {
                userId: adminUser.userId,
                permissions: adminUser.permissions,
            } as any,
            address: "https://test.com",
        } as any;
    });

    afterEach(async () => {
        // Clean up all collections - only this test's data
        await Promise.all([
            UserModel.removeMany({ domain: testDomain._id }),
            CourseModel.removeMany({ domain: testDomain._id }),
            PageModel.removeMany({ domain: testDomain._id }),
            EmailTemplateModel.removeMany({ domain: testDomain._id }),
            SequenceModel.removeMany({ domain: testDomain._id }),
            UserSegmentModel.removeMany({ domain: testDomain._id }),
            EmailDeliveryModel.removeMany({ domain: testDomain._id }),
            UserThemeModel.removeMany({ domain: testDomain._id }),
            PaymentPlanModel.removeMany({ domain: testDomain._id }),
            OngoingSequenceModel.removeMany({ domain: testDomain._id }),
            NotificationModel.removeMany({ domain: testDomain._id }),
            MailRequestStatusModel.removeMany({ domain: testDomain._id }),
            LessonEvaluationModel.removeMany({ domain: testDomain._id }),
            DownloadLinkModel.removeMany({ domain: testDomain._id }),
            CommunityReportModel.removeMany({ domain: testDomain._id }),
            CertificateModel.removeMany({ domain: testDomain._id }),
            ActivityModel.removeMany({ domain: testDomain._id }),
            EmailEventModel.removeMany({ domain: testDomain._id }),
            CommunityPostSubscriberModel.removeMany({ domain: testDomain._id }),
            CommunityPostModel.removeMany({ domain: testDomain._id }),
            CommunityCommentModel.removeMany({ domain: testDomain._id }),
            InvoiceModel.removeMany({ domain: testDomain._id }),
            MembershipModel.removeMany({ domain: testDomain._id }),
            CommunityModel.removeMany({ domain: testDomain._id }),
            LessonModel.removeMany({ domain: testDomain._id }),
        ]);

        jest.clearAllMocks();
    });

    afterAll(async () => {
        await DomainModel.removeMany({ _id: testDomain._id });
    });

    // ============================================
    // SECTION 1: SECURITY & VALIDATION TESTS
    // ============================================

    describe("Security & Validation", () => {
        it("should require authentication", async () => {
            const unauthCtx = { ...mockCtx, user: null };
            await expect(
                deleteUser(targetUser.userId, unauthCtx),
            ).rejects.toThrow();
        });

        it("should require manageUsers permission", async () => {
            const unauthorizedUser = await UserModel.createUser({
                domain: testDomain._id,
                userId: duId("unauth-user"),
                email: duEmail("unauth"),
                permissions: [permissions.enrollInCourse],
                purchases: [],
                unsubscribeToken: duId("unsubscribe-unauth"),
            });

            const unauthorizedCtx = {
                ...mockCtx,
                user: {
                    userId: unauthorizedUser.userId,
                    permissions: unauthorizedUser.permissions,
                },
            };

            await expect(
                deleteUser(targetUser.userId, unauthorizedCtx),
            ).rejects.toThrow(responses.action_not_allowed);
        });

        it("should prevent self-deletion", async () => {
            await expect(deleteUser(adminUser.userId, mockCtx)).rejects.toThrow(
                responses.action_not_allowed,
            );
        });

        it("should throw error for non-existent user", async () => {
            await expect(
                deleteUser(duId("non-existent-user"), mockCtx),
            ).rejects.toThrow(responses.user_not_found);
        });

        it("should prevent deletion of last user with critical permission", async () => {
            // Make target user the only one with manageSite permission
            targetUser.permissions = [permissions.manageSite];
            await UserModel.saveOne(targetUser);

            // Remove manageSite from admin
            adminUser.permissions = adminUser.permissions.filter(
                (p: string) => p !== permissions.manageSite,
            );
            await UserModel.saveOne(adminUser);

            await expect(
                deleteUser(targetUser.userId, mockCtx),
            ).rejects.toThrow(responses.cannot_delete_last_permission_user);
        });
    });

    // ============================================
    // SECTION 2: BUSINESS ENTITY MIGRATION TESTS
    // ============================================

    describe("Business Entity Migration", () => {
        it("should migrate course ownership to deleter", async () => {
            const course = await CourseModel.createOne({
                domain: testDomain._id,
                courseId: "du-course-mig-123",
                title: "Test Course",
                creatorId: targetUser.userId,
                slug: "delete-user-test-course",
                type: Constants.CourseType.COURSE,
                privacy: Constants.ProductAccessType.PUBLIC,
                costType: "free",
                cost: 0,
                published: true,
                pageId: "du-page-mig-123",
            });

            await deleteUser(targetUser.userId, mockCtx);

            const updatedCourse = await CourseModel.queryOne({
                courseId: course.courseId,
            });
            expect(updatedCourse?.creatorId).toBe(adminUser.userId);
        });

        it("should migrate course pages to deleter", async () => {
            const course = await CourseModel.createOne({
                domain: testDomain._id,
                courseId: "du-course-123",
                title: "Test Course",
                creatorId: targetUser.userId,
                slug: "test-course",
                type: Constants.CourseType.COURSE,
                privacy: Constants.ProductAccessType.PUBLIC,
                costType: "free",
                cost: 0,
                published: true,
                pageId: "du-page-123",
            });

            const page = await PageModel.createOne({
                domain: testDomain._id,
                pageId: "du-page-123",
                type: constants.product,
                creatorId: targetUser.userId,
                entityId: course.courseId,
                name: "Test Course Page",
                layout: [],
            });

            await deleteUser(targetUser.userId, mockCtx);

            const updatedPage = await PageModel.queryOne({
                pageId: page.pageId,
            });
            expect(updatedPage?.creatorId).toBe(adminUser.userId);
        });

        it("should migrate email templates to deleter", async () => {
            const template = await EmailTemplateModel.createOne({
                domain: testDomain._id,
                templateId: "du-template-123",
                title: "Test Template",
                creatorId: targetUser.userId,
                content: {
                    body: [],
                    meta: {},
                    style: {
                        structure: {},
                        typography: {},
                        colors: {},
                    },
                },
            });

            await deleteUser(targetUser.userId, mockCtx);

            const updatedTemplate = await EmailTemplateModel.queryOne({
                templateId: template.templateId,
            });
            expect(updatedTemplate?.creatorId).toBe(adminUser.userId);
        });

        it("should migrate sequences to deleter", async () => {
            const sequence = await SequenceModel.createOne({
                domain: testDomain._id,
                sequenceId: "du-seq-123",
                title: "Test Sequence",
                creatorId: targetUser.userId,
                type: "broadcast",
                emails: [],
                entrants: [targetUser.userId, DU_OTHER_USER_ID],
                from: { name: "Test", email: "test@test.com" },
            });

            await deleteUser(targetUser.userId, mockCtx);

            const updatedSequence = await SequenceModel.queryOne({
                sequenceId: sequence.sequenceId,
            });
            expect(updatedSequence?.creatorId).toBe(adminUser.userId);
            expect(updatedSequence?.entrants).not.toContain(targetUser.userId);
            expect(updatedSequence?.entrants).toContain(DU_OTHER_USER_ID);
        });

        it("should migrate user segments to deleter", async () => {
            const segment = await UserSegmentModel.createOne({
                domain: testDomain._id,
                segmentId: "seg-123",
                userId: targetUser.userId,
                name: "Test Segment",
                filter: { aggregator: "and", filters: [] },
            });

            await deleteUser(targetUser.userId, mockCtx);

            const updatedSegment = await UserSegmentModel.queryOne({
                segmentId: segment.segmentId,
            });
            expect(updatedSegment?.userId).toBe(adminUser.userId);
        });

        it("should migrate user themes to deleter", async () => {
            const theme = await UserThemeModel.createOne({
                domain: testDomain._id,
                themeId: "theme-123",
                userId: targetUser.userId,
                name: "Test Theme",
                parentThemeId: "parent-123",
                theme: {
                    structure: {
                        section: { padding: { x: "px-4", y: "py-4" } },
                        page: { width: "max-w-4xl" },
                    },
                },
                draftTheme: {
                    structure: {
                        section: { padding: { x: "px-4", y: "py-4" } },
                        page: { width: "max-w-4xl" },
                    },
                },
            });

            await deleteUser(targetUser.userId, mockCtx);

            const updatedTheme = await UserThemeModel.queryOne({
                themeId: theme.themeId,
            });
            expect(updatedTheme?.userId).toBe(adminUser.userId);
        });

        it("should migrate payment plans to deleter", async () => {
            const plan = await PaymentPlanModel.createOne({
                domain: testDomain._id,
                planId: "plan-123",
                userId: targetUser.userId,
                entityId: "du-course-123",
                entityType: Constants.MembershipEntityType.COURSE,
                type: "subscription",
                name: "Test Plan",
                interval: "monthly",
                cost: 1000,
                currencyISOCode: "USD",
            });

            await deleteUser(targetUser.userId, mockCtx);

            const updatedPlan = await PaymentPlanModel.queryOne({
                planId: plan.planId,
            });
            expect(updatedPlan?.userId).toBe(adminUser.userId);
        });

        it("should migrate lessons to deleter", async () => {
            const lesson = await LessonModel.createOne({
                domain: testDomain._id,
                lessonId: "lesson-123",
                title: "Test Lesson",
                type: constants.text,
                creatorId: targetUser.userId,
                courseId: "du-course-123",
                groupId: "group-123",
                published: false,
                requiresEnrollment: true,
                downloadable: false,
            });

            await deleteUser(targetUser.userId, mockCtx);

            const updatedLesson = await LessonModel.queryOne({
                lessonId: lesson.lessonId,
            });
            expect(updatedLesson?.creatorId).toBe(adminUser.userId);
        });

        it("should transfer community moderator role to deleter", async () => {
            const community = await CommunityModel.createOne({
                domain: testDomain._id,
                communityId: "comm-123",
                name: "Test Community",
                pageId: "du-page-comm-123",
            });

            await MembershipModel.createOne({
                domain: testDomain._id,
                membershipId: "mem-123",
                userId: targetUser.userId,
                entityId: community.communityId,
                entityType: Constants.MembershipEntityType.COMMUNITY,
                paymentPlanId: "plan-internal",
                sessionId: "session-123",
                status: Constants.MembershipStatus.ACTIVE,
                role: Constants.MembershipRole.MODERATE,
                joiningReason: internal.joining_reason_creator,
            });

            await deleteUser(targetUser.userId, mockCtx);

            const newModeratorMembership = await MembershipModel.queryOne({
                userId: adminUser.userId,
                entityId: community.communityId,
                entityType: Constants.MembershipEntityType.COMMUNITY,
            });

            expect(newModeratorMembership).toBeTruthy();
            expect(newModeratorMembership?.role).toBe(
                Constants.MembershipRole.MODERATE,
            );
            expect(newModeratorMembership?.joiningReason).toBe(
                internal.joining_reason_creator,
            );
        });

        it("should upgrade existing membership when transferring moderator role", async () => {
            const community = await CommunityModel.createOne({
                domain: testDomain._id,
                communityId: "comm-123",
                name: "Test Community",
                pageId: "du-page-comm-123",
            });

            // Target user is moderator
            await MembershipModel.createOne({
                domain: testDomain._id,
                membershipId: "mem-target",
                userId: targetUser.userId,
                entityId: community.communityId,
                entityType: Constants.MembershipEntityType.COMMUNITY,
                paymentPlanId: "plan-internal",
                sessionId: "session-target",
                status: Constants.MembershipStatus.ACTIVE,
                role: Constants.MembershipRole.MODERATE,
                joiningReason: internal.joining_reason_creator,
            });

            // Admin already has regular membership
            const existingMembership = await MembershipModel.createOne({
                domain: testDomain._id,
                membershipId: "mem-admin",
                userId: adminUser.userId,
                entityId: community.communityId,
                entityType: Constants.MembershipEntityType.COMMUNITY,
                paymentPlanId: "plan-internal",
                sessionId: "session-admin",
                status: Constants.MembershipStatus.ACTIVE,
                role: Constants.MembershipRole.COMMENT,
            });

            await deleteUser(targetUser.userId, mockCtx);

            const updatedMembership = await MembershipModel.queryOne({
                membershipId: existingMembership.membershipId,
            });

            expect(updatedMembership?.role).toBe(
                Constants.MembershipRole.MODERATE,
            );
            expect(updatedMembership?.joiningReason).toBe(
                internal.joining_reason_creator,
            );

            // Target's membership should be deleted
            const targetMembership = await MembershipModel.queryOne({
                membershipId: "mem-target",
            });
            expect(targetMembership).toBeNull();
        });
    });

    // ============================================
    // SECTION 3: PERSONAL DATA CLEANUP TESTS
    // ============================================

    describe("Personal Data Cleanup", () => {
        it("should delete user's notifications (received)", async () => {
            await NotificationModel.createOne({
                domain: testDomain._id,
                notificationId: "notif-1",
                userId: DU_OTHER_USER_ID,
                forUserId: targetUser.userId,
                entityAction:
                    Constants.NotificationEntityAction.COMMUNITY_POSTED,
                entityId: "post-123",
            });

            await deleteUser(targetUser.userId, mockCtx);

            const notifications = await NotificationModel.query({
                forUserId: targetUser.userId,
            });
            expect(notifications).toHaveLength(0);
        });

        it("should delete user's notifications (created)", async () => {
            await NotificationModel.createOne({
                domain: testDomain._id,
                notificationId: "notif-2",
                userId: targetUser.userId,
                forUserId: DU_OTHER_USER_ID,
                entityAction:
                    Constants.NotificationEntityAction.COMMUNITY_POSTED,
                entityId: "post-123",
            });

            await deleteUser(targetUser.userId, mockCtx);

            const notifications = await NotificationModel.query({
                userId: targetUser.userId,
            });
            expect(notifications).toHaveLength(0);
        });

        it("should delete mail request status", async () => {
            await MailRequestStatusModel.createOne({
                domain: testDomain._id,
                userId: targetUser.userId,
                reason: "test-reason",
                status: "pending",
            });

            await deleteUser(targetUser.userId, mockCtx);

            const statuses = await MailRequestStatusModel.query({
                userId: targetUser.userId,
            });
            expect(statuses).toHaveLength(0);
        });

        it("should delete lesson evaluations", async () => {
            await LessonEvaluationModel.createOne({
                domain: testDomain._id,
                userId: targetUser.userId,
                lessonId: "lesson-123",
                passed: true,
                requiresPassingGrade: true,
                pass: true,
            });

            await deleteUser(targetUser.userId, mockCtx);

            const evaluations = await LessonEvaluationModel.query({
                userId: targetUser.userId,
            });
            expect(evaluations).toHaveLength(0);
        });

        it("should delete download links", async () => {
            await DownloadLinkModel.createOne({
                domain: testDomain._id,
                userId: targetUser.userId,
                courseId: "du-course-123",
                token: "token-123",
                expiresAt: new Date(),
                consumed: false,
            });

            await deleteUser(targetUser.userId, mockCtx);

            const links = await DownloadLinkModel.query({
                userId: targetUser.userId,
            });
            expect(links).toHaveLength(0);
        });

        it("should delete community reports", async () => {
            await CommunityReportModel.createOne({
                domain: testDomain._id,
                userId: targetUser.userId,
                communityId: "comm-123",
                contentId: "post-123",
                type: "post",
                reportId: "report-123",
                reason: "spam",
            });

            await deleteUser(targetUser.userId, mockCtx);

            const reports = await CommunityReportModel.query({
                userId: targetUser.userId,
            });
            expect(reports).toHaveLength(0);
        });

        it("should delete certificates", async () => {
            const uniqueId = Date.now();
            await CertificateModel.createOne({
                domain: testDomain._id,
                certificateId: `cert-${uniqueId}`,
                userId: targetUser.userId,
                courseId: "du-course-123",
            });

            await deleteUser(targetUser.userId, mockCtx);

            const certificates = await CertificateModel.query({
                userId: targetUser.userId,
            });
            expect(certificates).toHaveLength(0);
        });

        it("should delete activity logs", async () => {
            await ActivityModel.createOne({
                domain: testDomain._id,
                userId: targetUser.userId,
                type: Constants.ActivityType.USER_CREATED,
            });

            await deleteUser(targetUser.userId, mockCtx);

            const activities = await ActivityModel.query({
                userId: targetUser.userId,
            });
            expect(activities).toHaveLength(0);
        });

        it("should delete email events", async () => {
            await EmailEventModel.createOne({
                domain: testDomain._id,
                userId: targetUser.userId,
                sequenceId: "du-seq-123",
                emailId: "email-123",
                action: "open",
            });

            await deleteUser(targetUser.userId, mockCtx);

            const events = await EmailEventModel.query({
                userId: targetUser.userId,
            });
            expect(events).toHaveLength(0);
        });

        it("should delete community post subscribers", async () => {
            await CommunityPostSubscriberModel.createOne({
                domain: testDomain._id,
                userId: targetUser.userId,
                postId: "post-123",
                subscriptionId: "sub-123",
            });

            await deleteUser(targetUser.userId, mockCtx);

            const subscribers = await CommunityPostSubscriberModel.query({
                userId: targetUser.userId,
            });
            expect(subscribers).toHaveLength(0);
        });

        it("should call deleteCommunityPosts for user's posts and comments", async () => {
            await deleteUser(targetUser.userId, mockCtx);

            expect(deleteCommunityPosts).toHaveBeenCalledWith(
                mockCtx,
                "user",
                targetUser.userId,
            );
        });

        it("should remove user from post likes arrays", async () => {
            await CommunityPostModel.createOne({
                domain: testDomain._id,
                postId: "post-123",
                userId: DU_OTHER_USER_ID,
                communityId: "comm-123",
                title: "Test Post",
                content: "Content",
                likes: [targetUser.userId, DU_OTHER_USER_ID],
            });

            await deleteUser(targetUser.userId, mockCtx);

            const post = await CommunityPostModel.queryOne({
                postId: "post-123",
            });
            expect(post?.likes).not.toContain(targetUser.userId);
            expect(post?.likes).toContain(DU_OTHER_USER_ID);
        });

        it("should remove user from comment likes arrays", async () => {
            await CommunityCommentModel.createOne({
                domain: testDomain._id,
                commentId: "comment-123",
                postId: "post-123",
                communityId: "comm-123",
                userId: DU_OTHER_USER_ID,
                content: "Test Comment",
                likes: [targetUser.userId, DU_OTHER_USER_ID],
                replies: [],
            });

            await deleteUser(targetUser.userId, mockCtx);

            const comment = await CommunityCommentModel.queryOne({
                commentId: "comment-123",
            });
            expect(comment?.likes).not.toContain(targetUser.userId);
            expect(comment?.likes).toContain(DU_OTHER_USER_ID);
        });

        it("should remove user from reply likes arrays", async () => {
            await CommunityCommentModel.createOne({
                domain: testDomain._id,
                commentId: "comment-123",
                postId: "post-123",
                communityId: "comm-123",
                userId: DU_OTHER_USER_ID,
                content: "Test Comment",
                likes: [],
                replies: [
                    {
                        replyId: "reply-123",
                        userId: DU_OTHER_USER_ID,
                        content: "Reply content",
                        likes: [targetUser.userId, DU_OTHER_USER_ID],
                        deleted: false,
                    },
                ],
            });

            await deleteUser(targetUser.userId, mockCtx);

            const comment = await CommunityCommentModel.queryOne({
                commentId: "comment-123",
            });
            const reply = comment?.replies[0];
            expect(reply?.likes).not.toContain(targetUser.userId);
            expect(reply?.likes).toContain(DU_OTHER_USER_ID);
        });

        it("should delete memberships and associated invoices", async () => {
            const membership = await MembershipModel.createOne({
                domain: testDomain._id,
                membershipId: "mem-123",
                userId: targetUser.userId,
                entityId: "du-course-123",
                entityType: Constants.MembershipEntityType.COURSE,
                paymentPlanId: "plan-123",
                sessionId: "session-123",
                status: Constants.MembershipStatus.ACTIVE,
            });

            await InvoiceModel.createOne({
                domain: testDomain._id,
                invoiceId: "inv-123",
                membershipId: membership.membershipId,
                membershipSessionId: "session-123",
                amount: 1000,
                currencyISOCode: "USD",
                paymentProcessor: "stripe",
                status: Constants.InvoiceStatus.PAID,
            });

            await deleteUser(targetUser.userId, mockCtx);

            const memberships = await MembershipModel.query({
                userId: targetUser.userId,
            });
            expect(memberships).toHaveLength(0);

            const invoices = await InvoiceModel.query({
                membershipId: membership.membershipId,
            });
            expect(invoices).toHaveLength(0);
        });

        it("should cancel active subscriptions and delete invoices", async () => {
            const { getPaymentMethodFromSettings } = require("@/payments-new");
            const mockCancel = jest.fn().mockResolvedValue(true);
            getPaymentMethodFromSettings.mockResolvedValue({
                cancel: mockCancel,
            });

            const membership = await MembershipModel.createOne({
                domain: testDomain._id,
                membershipId: "mem-sub-123",
                userId: targetUser.userId,
                entityId: "du-course-sub",
                entityType: Constants.MembershipEntityType.COURSE,
                paymentPlanId: "plan-sub-123",
                sessionId: "session-sub-123",
                status: Constants.MembershipStatus.ACTIVE,
                subscriptionId: "sub_stripe_123",
                subscriptionMethod: "stripe",
            });

            await InvoiceModel.createOne({
                domain: testDomain._id,
                invoiceId: "inv-sub-123",
                membershipId: membership.membershipId,
                membershipSessionId: "session-sub-123",
                amount: 2000,
                currencyISOCode: "USD",
                paymentProcessor: "stripe",
                status: Constants.InvoiceStatus.PAID,
            });

            await deleteUser(targetUser.userId, mockCtx);

            // Verify subscription was cancelled
            expect(mockCancel).toHaveBeenCalledWith("sub_stripe_123");

            // Verify membership was deleted
            const memberships = await MembershipModel.query({
                userId: targetUser.userId,
                membershipId: membership.membershipId,
            });
            expect(memberships).toHaveLength(0);

            // Verify invoices were deleted
            const invoices = await InvoiceModel.query({
                membershipId: membership.membershipId,
            });
            expect(invoices).toHaveLength(0);
        });

        it("should delete user avatar media", async () => {
            await deleteUser(targetUser.userId, mockCtx);

            expect(deleteMedia).toHaveBeenCalledWith(duId("avatar"));
        });

        it("should delete the user document", async () => {
            await deleteUser(targetUser.userId, mockCtx);

            const user = await UserModel.queryOne({
                userId: targetUser.userId,
            });
            expect(user).toBeNull();
        });
    });

    // ============================================
    // SECTION 4: ARRAY CLEANUP TESTS
    // ============================================

    describe("Array & Reference Cleanup", () => {
        it("should remove user from sequence entrants", async () => {
            await SequenceModel.createOne({
                domain: testDomain._id,
                sequenceId: "du-seq-123",
                title: "Test Sequence",
                creatorId: adminUser.userId,
                type: "broadcast",
                emails: [],
                entrants: [targetUser.userId, DU_OTHER_USER_ID],
                from: { name: "Test", email: "test@test.com" },
            });

            await deleteUser(targetUser.userId, mockCtx);

            const sequence = await SequenceModel.queryOne({
                sequenceId: "du-seq-123",
            });
            expect(sequence?.entrants).not.toContain(targetUser.userId);
            expect(sequence?.entrants).toContain(DU_OTHER_USER_ID);
        });

        it("should remove user from course customers", async () => {
            await CourseModel.createOne({
                domain: testDomain._id,
                courseId: "du-course-123",
                title: "Test Course",
                creatorId: adminUser.userId,
                slug: "test-course",
                type: Constants.CourseType.COURSE,
                privacy: Constants.ProductAccessType.PUBLIC,
                costType: "free",
                cost: 0,
                published: true,
                customers: [targetUser.userId, DU_OTHER_USER_ID],
            });

            await deleteUser(targetUser.userId, mockCtx);

            const course = await CourseModel.queryOne({
                courseId: "du-course-123",
            });
            expect(course?.customers).not.toContain(targetUser.userId);
            expect(course?.customers).toContain(DU_OTHER_USER_ID);
        });
    });

    // ============================================
    // SECTION 5: INTEGRATION TESTS
    // ============================================

    describe("Integration Tests", () => {
        it("should handle complex scenario with multiple entities", async () => {
            // Create course
            const course = await CourseModel.createOne({
                domain: testDomain._id,
                courseId: "du-course-123",
                title: "Test Course",
                creatorId: targetUser.userId,
                slug: "test-course",
                type: Constants.CourseType.COURSE,
                privacy: Constants.ProductAccessType.PUBLIC,
                costType: "free",
                cost: 0,
                published: true,
                customers: [targetUser.userId],
            });

            // Create community
            const community = await CommunityModel.createOne({
                domain: testDomain._id,
                communityId: "comm-123",
                name: "Test Community",
                pageId: "du-page-comm-123",
            });

            // Create membership
            await MembershipModel.createOne({
                domain: testDomain._id,
                membershipId: "mem-123",
                userId: targetUser.userId,
                entityId: community.communityId,
                entityType: Constants.MembershipEntityType.COMMUNITY,
                paymentPlanId: "plan-internal",
                sessionId: "session-123",
                status: Constants.MembershipStatus.ACTIVE,
                role: Constants.MembershipRole.MODERATE,
                joiningReason: internal.joining_reason_creator,
            });

            // Create activity
            await ActivityModel.createOne({
                domain: testDomain._id,
                userId: targetUser.userId,
                type: "purchased",
                entityId: course.courseId,
            });

            // Create notifications
            await NotificationModel.createOne({
                domain: testDomain._id,
                notificationId: "notif-1",
                userId: targetUser.userId,
                forUserId: DU_OTHER_USER_ID,
                entityAction:
                    Constants.NotificationEntityAction.COMMUNITY_POSTED,
                entityId: "post-123",
            });

            await deleteUser(targetUser.userId, mockCtx);

            // Verify course migrated
            const updatedCourse = await CourseModel.queryOne({
                courseId: course.courseId,
            });
            expect(updatedCourse?.creatorId).toBe(adminUser.userId);
            expect(updatedCourse?.customers).not.toContain(targetUser.userId);

            // Verify community moderator migrated
            const moderatorMembership = await MembershipModel.queryOne({
                userId: adminUser.userId,
                entityId: community.communityId,
            });
            expect(moderatorMembership?.role).toBe(
                Constants.MembershipRole.MODERATE,
            );

            // Verify personal data deleted
            const activities = await ActivityModel.query({
                userId: targetUser.userId,
            });
            expect(activities).toHaveLength(0);

            const notifications = await NotificationModel.query({
                userId: targetUser.userId,
            });
            expect(notifications).toHaveLength(0);

            // Verify user deleted
            const user = await UserModel.queryOne({
                userId: targetUser.userId,
            });
            expect(user).toBeNull();

            // Verify avatar deleted
            expect(deleteMedia).toHaveBeenCalledWith(duId("avatar"));
        });

        it("should successfully delete user with no owned entities", async () => {
            const result = await deleteUser(targetUser.userId, mockCtx);

            expect(result).toBe(true);
            const user = await UserModel.queryOne({
                userId: targetUser.userId,
            });
            expect(user).toBeNull();
        });

        it("should handle user with subscription cancellation", async () => {
            await MembershipModel.createOne({
                domain: testDomain._id,
                membershipId: "mem-123",
                userId: targetUser.userId,
                entityId: "du-course-123",
                entityType: Constants.MembershipEntityType.COURSE,
                paymentPlanId: "plan-123",
                sessionId: "session-123",
                status: Constants.MembershipStatus.ACTIVE,
                subscriptionId: "sub-123",
                subscriptionMethod: "stripe",
            });

            await deleteUser(targetUser.userId, mockCtx);

            const { getPaymentMethodFromSettings } = require("@/payments-new");
            expect(getPaymentMethodFromSettings).toHaveBeenCalled();

            const memberships = await MembershipModel.query({
                userId: targetUser.userId,
            });
            expect(memberships).toHaveLength(0);
        });
    });
});

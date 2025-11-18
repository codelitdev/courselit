/**
 * @jest-environment node
 */

import { deleteUser } from "../logic";
import UserModel from "@models/User";
import CourseModel from "@models/Course";
import PageModel from "@models/Page";
import EmailTemplateModel from "@models/EmailTemplate";
import SequenceModel from "@models/Sequence";
import UserSegmentModel from "@models/UserSegment";
import EmailDeliveryModel from "@models/EmailDelivery";
import UserThemeModel from "@models/UserTheme";
import PaymentPlanModel from "@models/PaymentPlan";
import OngoingSequenceModel from "@models/OngoingSequence";
import NotificationModel from "@models/Notification";
import MailRequestStatusModel from "@models/MailRequestStatus";
import LessonEvaluationModel from "@models/LessonEvaluation";
import DownloadLinkModel from "@models/DownloadLink";
import CommunityReportModel from "@models/CommunityReport";
import CertificateModel from "@models/Certificate";
import ActivityModel from "@models/Activity";
import EmailEventModel from "@models/EmailEvent";
import CommunityPostSubscriberModel from "@models/CommunityPostSubscriber";
import CommunityPostModel from "@models/CommunityPost";
import CommunityCommentModel from "@models/CommunityComment";
import InvoiceModel from "@models/Invoice";
import MembershipModel from "@models/Membership";
import CommunityModel from "@models/Community";
import LessonModel from "@models/Lesson";
import DomainModel from "@models/Domain";
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

const DELETE_USER_SUITE_PREFIX = `delete-user-${Date.now()}`;
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
        testDomain = await DomainModel.create({
            name: duId("domain"),
            email: duEmail("domain"),
            tags: ["tag1", "tag2"],
        });
    });

    beforeEach(async () => {
        // Create admin user (deleter)
        adminUser = await UserModel.create({
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
        targetUser = await UserModel.create({
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
            UserModel.deleteMany({ domain: testDomain._id }),
            CourseModel.deleteMany({ domain: testDomain._id }),
            PageModel.deleteMany({ domain: testDomain._id }),
            EmailTemplateModel.deleteMany({ domain: testDomain._id }),
            SequenceModel.deleteMany({ domain: testDomain._id }),
            UserSegmentModel.deleteMany({ domain: testDomain._id }),
            EmailDeliveryModel.deleteMany({ domain: testDomain._id }),
            UserThemeModel.deleteMany({ domain: testDomain._id }),
            PaymentPlanModel.deleteMany({ domain: testDomain._id }),
            OngoingSequenceModel.deleteMany({ domain: testDomain._id }),
            NotificationModel.deleteMany({ domain: testDomain._id }),
            MailRequestStatusModel.deleteMany({ domain: testDomain._id }),
            LessonEvaluationModel.deleteMany({ domain: testDomain._id }),
            DownloadLinkModel.deleteMany({ domain: testDomain._id }),
            CommunityReportModel.deleteMany({ domain: testDomain._id }),
            CertificateModel.deleteMany({ domain: testDomain._id }),
            ActivityModel.deleteMany({ domain: testDomain._id }),
            EmailEventModel.deleteMany({ domain: testDomain._id }),
            CommunityPostSubscriberModel.deleteMany({ domain: testDomain._id }),
            CommunityPostModel.deleteMany({ domain: testDomain._id }),
            CommunityCommentModel.deleteMany({ domain: testDomain._id }),
            InvoiceModel.deleteMany({ domain: testDomain._id }),
            MembershipModel.deleteMany({ domain: testDomain._id }),
            CommunityModel.deleteMany({ domain: testDomain._id }),
            LessonModel.deleteMany({ domain: testDomain._id }),
        ]);

        jest.clearAllMocks();
    });

    afterAll(async () => {
        await DomainModel.deleteMany({ _id: testDomain._id });
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
            const unauthorizedUser = await UserModel.create({
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
            await targetUser.save();

            // Remove manageSite from admin
            adminUser.permissions = adminUser.permissions.filter(
                (p: string) => p !== permissions.manageSite,
            );
            await adminUser.save();

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
            const course = await CourseModel.create({
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

            const updatedCourse = await CourseModel.findOne({
                courseId: course.courseId,
            });
            expect(updatedCourse?.creatorId).toBe(adminUser.userId);
        });

        it("should migrate course pages to deleter", async () => {
            const course = await CourseModel.create({
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

            const page = await PageModel.create({
                domain: testDomain._id,
                pageId: "du-page-123",
                type: constants.product,
                creatorId: targetUser.userId,
                entityId: course.courseId,
                name: "Test Course Page",
                layout: [],
            });

            await deleteUser(targetUser.userId, mockCtx);

            const updatedPage = await PageModel.findOne({
                pageId: page.pageId,
            });
            expect(updatedPage?.creatorId).toBe(adminUser.userId);
        });

        it("should migrate email templates to deleter", async () => {
            const template = await EmailTemplateModel.create({
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

            const updatedTemplate = await EmailTemplateModel.findOne({
                templateId: template.templateId,
            });
            expect(updatedTemplate?.creatorId).toBe(adminUser.userId);
        });

        it("should migrate sequences to deleter", async () => {
            const sequence = await SequenceModel.create({
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

            const updatedSequence = await SequenceModel.findOne({
                sequenceId: sequence.sequenceId,
            });
            expect(updatedSequence?.creatorId).toBe(adminUser.userId);
            expect(updatedSequence?.entrants).not.toContain(targetUser.userId);
            expect(updatedSequence?.entrants).toContain(DU_OTHER_USER_ID);
        });

        it("should migrate user segments to deleter", async () => {
            const segment = await UserSegmentModel.create({
                domain: testDomain._id,
                segmentId: "seg-123",
                userId: targetUser.userId,
                name: "Test Segment",
                filter: { aggregator: "and", filters: [] },
            });

            await deleteUser(targetUser.userId, mockCtx);

            const updatedSegment = await UserSegmentModel.findOne({
                segmentId: segment.segmentId,
            });
            expect(updatedSegment?.userId).toBe(adminUser.userId);
        });

        it("should migrate user themes to deleter", async () => {
            const theme = await UserThemeModel.create({
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

            const updatedTheme = await UserThemeModel.findOne({
                themeId: theme.themeId,
            });
            expect(updatedTheme?.userId).toBe(adminUser.userId);
        });

        it("should migrate payment plans to deleter", async () => {
            const plan = await PaymentPlanModel.create({
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

            const updatedPlan = await PaymentPlanModel.findOne({
                planId: plan.planId,
            });
            expect(updatedPlan?.userId).toBe(adminUser.userId);
        });

        it("should migrate lessons to deleter", async () => {
            const lesson = await LessonModel.create({
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

            const updatedLesson = await LessonModel.findOne({
                lessonId: lesson.lessonId,
            });
            expect(updatedLesson?.creatorId).toBe(adminUser.userId);
        });

        it("should transfer community moderator role to deleter", async () => {
            const community = await CommunityModel.create({
                domain: testDomain._id,
                communityId: "comm-123",
                name: "Test Community",
                pageId: "du-page-comm-123",
            });

            await MembershipModel.create({
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

            const newModeratorMembership = await MembershipModel.findOne({
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
            const community = await CommunityModel.create({
                domain: testDomain._id,
                communityId: "comm-123",
                name: "Test Community",
                pageId: "du-page-comm-123",
            });

            // Target user is moderator
            await MembershipModel.create({
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
            const existingMembership = await MembershipModel.create({
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

            const updatedMembership = await MembershipModel.findOne({
                membershipId: existingMembership.membershipId,
            });

            expect(updatedMembership?.role).toBe(
                Constants.MembershipRole.MODERATE,
            );
            expect(updatedMembership?.joiningReason).toBe(
                internal.joining_reason_creator,
            );

            // Target's membership should be deleted
            const targetMembership = await MembershipModel.findOne({
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
            await NotificationModel.create({
                domain: testDomain._id,
                notificationId: "notif-1",
                userId: DU_OTHER_USER_ID,
                forUserId: targetUser.userId,
                entityAction:
                    Constants.NotificationEntityAction.COMMUNITY_POSTED,
                entityId: "post-123",
            });

            await deleteUser(targetUser.userId, mockCtx);

            const notifications = await NotificationModel.find({
                forUserId: targetUser.userId,
            });
            expect(notifications).toHaveLength(0);
        });

        it("should delete user's notifications (created)", async () => {
            await NotificationModel.create({
                domain: testDomain._id,
                notificationId: "notif-2",
                userId: targetUser.userId,
                forUserId: DU_OTHER_USER_ID,
                entityAction:
                    Constants.NotificationEntityAction.COMMUNITY_POSTED,
                entityId: "post-123",
            });

            await deleteUser(targetUser.userId, mockCtx);

            const notifications = await NotificationModel.find({
                userId: targetUser.userId,
            });
            expect(notifications).toHaveLength(0);
        });

        it("should delete mail request status", async () => {
            await MailRequestStatusModel.create({
                domain: testDomain._id,
                userId: targetUser.userId,
                reason: "test-reason",
                status: "pending",
            });

            await deleteUser(targetUser.userId, mockCtx);

            const statuses = await MailRequestStatusModel.find({
                userId: targetUser.userId,
            });
            expect(statuses).toHaveLength(0);
        });

        it("should delete lesson evaluations", async () => {
            await LessonEvaluationModel.create({
                domain: testDomain._id,
                userId: targetUser.userId,
                lessonId: "lesson-123",
                passed: true,
                requiresPassingGrade: true,
                pass: true,
            });

            await deleteUser(targetUser.userId, mockCtx);

            const evaluations = await LessonEvaluationModel.find({
                userId: targetUser.userId,
            });
            expect(evaluations).toHaveLength(0);
        });

        it("should delete download links", async () => {
            await DownloadLinkModel.create({
                domain: testDomain._id,
                userId: targetUser.userId,
                courseId: "du-course-123",
                token: "token-123",
                expiresAt: new Date(),
                consumed: false,
            });

            await deleteUser(targetUser.userId, mockCtx);

            const links = await DownloadLinkModel.find({
                userId: targetUser.userId,
            });
            expect(links).toHaveLength(0);
        });

        it("should delete community reports", async () => {
            await CommunityReportModel.create({
                domain: testDomain._id,
                userId: targetUser.userId,
                communityId: "comm-123",
                contentId: "post-123",
                type: "post",
                reportId: "report-123",
                reason: "spam",
            });

            await deleteUser(targetUser.userId, mockCtx);

            const reports = await CommunityReportModel.find({
                userId: targetUser.userId,
            });
            expect(reports).toHaveLength(0);
        });

        it("should delete certificates", async () => {
            const uniqueId = Date.now();
            await CertificateModel.create({
                domain: testDomain._id,
                certificateId: `cert-${uniqueId}`,
                userId: targetUser.userId,
                courseId: "du-course-123",
            });

            await deleteUser(targetUser.userId, mockCtx);

            const certificates = await CertificateModel.find({
                userId: targetUser.userId,
            });
            expect(certificates).toHaveLength(0);
        });

        it("should delete activity logs", async () => {
            await ActivityModel.create({
                domain: testDomain._id,
                userId: targetUser.userId,
                type: Constants.ActivityType.USER_CREATED,
            });

            await deleteUser(targetUser.userId, mockCtx);

            const activities = await ActivityModel.find({
                userId: targetUser.userId,
            });
            expect(activities).toHaveLength(0);
        });

        it("should delete email events", async () => {
            await EmailEventModel.create({
                domain: testDomain._id,
                userId: targetUser.userId,
                sequenceId: "du-seq-123",
                emailId: "email-123",
                action: "open",
            });

            await deleteUser(targetUser.userId, mockCtx);

            const events = await EmailEventModel.find({
                userId: targetUser.userId,
            });
            expect(events).toHaveLength(0);
        });

        it("should delete community post subscribers", async () => {
            await CommunityPostSubscriberModel.create({
                domain: testDomain._id,
                userId: targetUser.userId,
                postId: "post-123",
                subscriptionId: "sub-123",
            });

            await deleteUser(targetUser.userId, mockCtx);

            const subscribers = await CommunityPostSubscriberModel.find({
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
            await CommunityPostModel.create({
                domain: testDomain._id,
                postId: "post-123",
                userId: DU_OTHER_USER_ID,
                communityId: "comm-123",
                title: "Test Post",
                content: "Content",
                likes: [targetUser.userId, DU_OTHER_USER_ID],
            });

            await deleteUser(targetUser.userId, mockCtx);

            const post = await CommunityPostModel.findOne({
                postId: "post-123",
            });
            expect(post?.likes).not.toContain(targetUser.userId);
            expect(post?.likes).toContain(DU_OTHER_USER_ID);
        });

        it("should remove user from comment likes arrays", async () => {
            await CommunityCommentModel.create({
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

            const comment = await CommunityCommentModel.findOne({
                commentId: "comment-123",
            });
            expect(comment?.likes).not.toContain(targetUser.userId);
            expect(comment?.likes).toContain(DU_OTHER_USER_ID);
        });

        it("should remove user from reply likes arrays", async () => {
            await CommunityCommentModel.create({
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

            const comment = await CommunityCommentModel.findOne({
                commentId: "comment-123",
            });
            const reply = comment?.replies[0];
            expect(reply?.likes).not.toContain(targetUser.userId);
            expect(reply?.likes).toContain(DU_OTHER_USER_ID);
        });

        it("should delete memberships and associated invoices", async () => {
            const membership = await MembershipModel.create({
                domain: testDomain._id,
                membershipId: "mem-123",
                userId: targetUser.userId,
                entityId: "du-course-123",
                entityType: Constants.MembershipEntityType.COURSE,
                paymentPlanId: "plan-123",
                sessionId: "session-123",
                status: Constants.MembershipStatus.ACTIVE,
            });

            await InvoiceModel.create({
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

            const memberships = await MembershipModel.find({
                userId: targetUser.userId,
            });
            expect(memberships).toHaveLength(0);

            const invoices = await InvoiceModel.find({
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

            const membership = await MembershipModel.create({
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

            await InvoiceModel.create({
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
            const memberships = await MembershipModel.find({
                userId: targetUser.userId,
                membershipId: membership.membershipId,
            });
            expect(memberships).toHaveLength(0);

            // Verify invoices were deleted
            const invoices = await InvoiceModel.find({
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

            const user = await UserModel.findOne({ userId: targetUser.userId });
            expect(user).toBeNull();
        });
    });

    // ============================================
    // SECTION 4: ARRAY CLEANUP TESTS
    // ============================================

    describe("Array & Reference Cleanup", () => {
        it("should remove user from sequence entrants", async () => {
            await SequenceModel.create({
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

            const sequence = await SequenceModel.findOne({
                sequenceId: "du-seq-123",
            });
            expect(sequence?.entrants).not.toContain(targetUser.userId);
            expect(sequence?.entrants).toContain(DU_OTHER_USER_ID);
        });

        it("should remove user from course customers", async () => {
            await CourseModel.create({
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

            const course = await CourseModel.findOne({
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
            const course = await CourseModel.create({
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
            const community = await CommunityModel.create({
                domain: testDomain._id,
                communityId: "comm-123",
                name: "Test Community",
                pageId: "du-page-comm-123",
            });

            // Create membership
            await MembershipModel.create({
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
            await ActivityModel.create({
                domain: testDomain._id,
                userId: targetUser.userId,
                type: "purchased",
                entityId: course.courseId,
            });

            // Create notifications
            await NotificationModel.create({
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
            const updatedCourse = await CourseModel.findOne({
                courseId: course.courseId,
            });
            expect(updatedCourse?.creatorId).toBe(adminUser.userId);
            expect(updatedCourse?.customers).not.toContain(targetUser.userId);

            // Verify community moderator migrated
            const moderatorMembership = await MembershipModel.findOne({
                userId: adminUser.userId,
                entityId: community.communityId,
            });
            expect(moderatorMembership?.role).toBe(
                Constants.MembershipRole.MODERATE,
            );

            // Verify personal data deleted
            const activities = await ActivityModel.find({
                userId: targetUser.userId,
            });
            expect(activities).toHaveLength(0);

            const notifications = await NotificationModel.find({
                userId: targetUser.userId,
            });
            expect(notifications).toHaveLength(0);

            // Verify user deleted
            const user = await UserModel.findOne({ userId: targetUser.userId });
            expect(user).toBeNull();

            // Verify avatar deleted
            expect(deleteMedia).toHaveBeenCalledWith(duId("avatar"));
        });

        it("should successfully delete user with no owned entities", async () => {
            const result = await deleteUser(targetUser.userId, mockCtx);

            expect(result).toBe(true);
            const user = await UserModel.findOne({ userId: targetUser.userId });
            expect(user).toBeNull();
        });

        it("should handle user with subscription cancellation", async () => {
            await MembershipModel.create({
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

            const memberships = await MembershipModel.find({
                userId: targetUser.userId,
            });
            expect(memberships).toHaveLength(0);
        });
    });
});

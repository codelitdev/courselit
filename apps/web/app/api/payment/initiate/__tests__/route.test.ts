/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import { POST } from "../route";
import Domain from "@models/Domain";
import { auth } from "@/auth";
import mongoose from "mongoose";
import User from "@models/User";
import { Constants } from "@courselit/common-models";
import Course from "@models/Course";
import PaymentPlan from "@models/PaymentPlan";
import Invoice from "@models/Invoice";
import Community from "@models/Community";

jest.mock("@models/Domain");
jest.mock("@models/User");
jest.mock("@models/Course");
jest.mock("@models/PaymentPlan");
jest.mock("@models/Invoice");
jest.mock("@models/Community");
jest.mock("@/auth", () => ({
    auth: {
        api: {
            getSession: jest.fn(),
        },
    },
}));
jest.mock("../../helpers");
jest.mock("@/graphql/users/logic");
jest.mock("@/payments-new");

describe("Payment Initiate Route", () => {
    let mockRequest: NextRequest;

    beforeEach(() => {
        jest.clearAllMocks();

        (Domain.findOne as jest.Mock).mockResolvedValue({
            _id: new mongoose.Types.ObjectId("666666666666666666666666"),
            id: "666666666666666666666666",
            settings: {},
        } as any);

        (User.findOne as jest.Mock).mockResolvedValue({
            userId: "tester",
            name: "Tester",
            active: true,
            domain: new mongoose.Types.ObjectId("666666666666666666666666"),
        });

        // Mock Course.findOne for course entities
        (Course.findOne as jest.Mock).mockResolvedValue({
            courseId: "course-123",
            title: "Test Course",
            paymentPlans: ["planA", "planB"],
        });

        // Mock Community.findOne for community entities
        (Community.findOne as jest.Mock).mockResolvedValue({
            communityId: "community-123",
            name: "Test Community",
            autoAcceptMembers: true,
            deleted: false,
        });
        mockRequest = {
            json: jest.fn().mockResolvedValue({
                id: "course-123",
                type: Constants.MembershipEntityType.COURSE,
                planId: "planA",
            }),
            headers: {
                get: jest.fn().mockResolvedValue("test.com"),
            },
        } as unknown as NextRequest;

        (auth.api.getSession as unknown as jest.Mock).mockResolvedValue({
            user: {
                email: "test@test.com",
            },
        });

        // Mock PaymentPlan.exists to return true by default
        (PaymentPlan.exists as jest.Mock).mockResolvedValue(true);

        // Mock PaymentPlan.findOne
        (PaymentPlan.findOne as jest.Mock).mockResolvedValue({
            planId: "planA",
            type: Constants.PaymentPlanType.FREE,
            entityId: "course-123",
            entityType: Constants.MembershipEntityType.COURSE,
            archived: false,
            internal: false,
        });

        // Mock getMembership
        const { getMembership } = require("@/graphql/users/logic");
        (getMembership as jest.Mock).mockResolvedValue({
            membershipId: "membership-123",
            userId: "tester",
            entityId: "course-123",
            entityType: Constants.MembershipEntityType.COURSE,
            status: Constants.MembershipStatus.PENDING,
            planId: "planA",
            save: jest.fn().mockResolvedValue(true),
        });

        // Mock activateMembership
        const { activateMembership } = require("../../helpers");
        (activateMembership as jest.Mock).mockResolvedValue(undefined);

        // Mock getPaymentMethodFromSettings
        const { getPaymentMethodFromSettings } = require("@/payments-new");
        (getPaymentMethodFromSettings as jest.Mock).mockResolvedValue({
            name: "stripe",
            initiate: jest.fn().mockResolvedValue("payment-tracker-123"),
            getCurrencyISOCode: jest.fn().mockResolvedValue("USD"),
            validateSubscription: jest.fn().mockResolvedValue(true),
        });

        // Mock Invoice.create
        (Invoice.create as jest.Mock).mockResolvedValue({
            invoiceId: "invoice-123",
        });
    });

    it("returns 401 if user is not authenticated", async () => {
        (auth.api.getSession as unknown as jest.Mock).mockResolvedValue(null);

        const response = await POST(mockRequest);
        expect(response.status).toBe(401);
    });

    it("returns 400 if id is missing", async () => {
        mockRequest.json = jest.fn().mockResolvedValue({
            type: Constants.MembershipEntityType.COURSE,
            planId: "planA",
        });

        const response = await POST(mockRequest);
        expect(response.status).toBe(400);
    });

    it("returns 400 if type is missing", async () => {
        mockRequest.json = jest.fn().mockResolvedValue({
            id: "course-123",
            planId: "planA",
        });

        const response = await POST(mockRequest);
        expect(response.status).toBe(400);
    });

    it("returns 400 if planId is missing", async () => {
        mockRequest.json = jest.fn().mockResolvedValue({
            id: "course-123",
            type: Constants.MembershipEntityType.COURSE,
        });

        const response = await POST(mockRequest);
        expect(response.status).toBe(400);
    });

    it("returns 404 if payment plan does not belong to the entity", async () => {
        mockRequest.json = jest.fn().mockResolvedValue({
            id: "course-123",
            type: Constants.MembershipEntityType.COURSE,
            planId: "planA",
        });
        (Course.findOne as jest.Mock).mockResolvedValue({
            title: "Test Course",
            paymentPlans: ["planC", "planB"],
        });

        // Override PaymentPlan.exists to return false (plan doesn't belong to entity)
        (PaymentPlan.exists as jest.Mock).mockResolvedValue(false);

        const response = await POST(mockRequest);
        expect(response.status).toBe(404);
    });

    describe("Free Community with Included Products", () => {
        beforeEach(() => {
            // Reset to community context for these tests
            mockRequest.json = jest.fn().mockResolvedValue({
                id: "community-123",
                type: Constants.MembershipEntityType.COMMUNITY,
                planId: "plan-123",
                origin: "https://test.com",
            });

            (Community.findOne as jest.Mock).mockResolvedValue({
                communityId: "community-123",
                name: "Test Community",
                autoAcceptMembers: true,
                deleted: false,
            });

            (PaymentPlan.findOne as jest.Mock).mockResolvedValue({
                planId: "plan-123",
                type: Constants.PaymentPlanType.FREE,
                entityId: "community-123",
                entityType: Constants.MembershipEntityType.COMMUNITY,
                archived: false,
                internal: false,
                includedProducts: ["course-1", "course-2"],
            });

            // Ensure all mocks are properly set up
            (PaymentPlan.exists as jest.Mock).mockResolvedValue(true);
            (Invoice.create as jest.Mock).mockResolvedValue({
                invoiceId: "invoice-123",
            });
        });

        it("successfully activates free community membership with included products", async () => {
            const response = await POST(mockRequest);

            expect(response.status).toBe(200);
            const responseData = await response.json();
            expect(responseData.status).toBe("success");

            // Verify activateMembership was called with included products
            const { activateMembership } = require("../../helpers");
            expect(activateMembership).toHaveBeenCalledWith(
                expect.any(Object),
                expect.any(Object),
                expect.objectContaining({
                    includedProducts: ["course-1", "course-2"],
                }),
            );
        });

        it("handles community with autoAcceptMembers=false requiring joining reason", async () => {
            (Community.findOne as jest.Mock).mockResolvedValue({
                communityId: "community-123",
                name: "Test Community",
                autoAcceptMembers: false,
                deleted: false,
            });

            mockRequest.json = jest.fn().mockResolvedValue({
                id: "community-123",
                type: Constants.MembershipEntityType.COMMUNITY,
                planId: "plan-123",
                origin: "https://test.com",
                joiningReason: "I want to learn",
            });

            const response = await POST(mockRequest);
            expect(response.status).toBe(200);
        });

        it("returns 400 if joining reason missing for manual approval community", async () => {
            (Community.findOne as jest.Mock).mockResolvedValue({
                communityId: "community-123",
                name: "Test Community",
                autoAcceptMembers: false,
                deleted: false,
            });

            const response = await POST(mockRequest);
            expect(response.status).toBe(400);

            const responseData = await response.json();
            expect(responseData.error).toBe("Joining reason required");
        });
    });

    describe("Paid Community with Included Products", () => {
        beforeEach(() => {
            mockRequest.json = jest.fn().mockResolvedValue({
                id: "community-123",
                type: Constants.MembershipEntityType.COMMUNITY,
                planId: "plan-123",
                origin: "https://test.com",
            });

            (Community.findOne as jest.Mock).mockResolvedValue({
                communityId: "community-123",
                name: "Test Community",
                autoAcceptMembers: true,
                deleted: false,
            });

            (PaymentPlan.findOne as jest.Mock).mockResolvedValue({
                planId: "plan-123",
                type: Constants.PaymentPlanType.ONE_TIME,
                entityId: "community-123",
                entityType: Constants.MembershipEntityType.COMMUNITY,
                archived: false,
                internal: false,
                oneTimeAmount: 99.99,
                includedProducts: ["course-1", "course-2"],
            });

            // Mock payment method for paid plans
            const { getPaymentMethodFromSettings } = require("@/payments-new");
            (getPaymentMethodFromSettings as jest.Mock).mockResolvedValue({
                name: "stripe",
                initiate: jest.fn().mockResolvedValue("payment-tracker-123"),
                getCurrencyISOCode: jest.fn().mockResolvedValue("USD"),
            });

            // Mock Invoice
            (Invoice.create as jest.Mock).mockResolvedValue({
                invoiceId: "invoice-123",
            });
        });

        it("initiates payment for paid community with included products", async () => {
            const response = await POST(mockRequest);

            expect(response.status).toBe(200);
            const responseData = await response.json();
            expect(responseData.status).toBe("initiated");
            expect(responseData.paymentTracker).toBe("payment-tracker-123");
        });

        it("creates invoice for paid community", async () => {
            await POST(mockRequest);

            expect(Invoice.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    domain: expect.any(Object),
                    membershipId: "membership-123",
                    amount: 99.99,
                    status: "pending",
                    paymentProcessor: "stripe",
                    currencyISOCode: "USD",
                }),
            );
        });

        it("handles subscription payment plans with included products", async () => {
            (PaymentPlan.findOne as jest.Mock).mockResolvedValue({
                planId: "plan-123",
                type: Constants.PaymentPlanType.SUBSCRIPTION,
                entityId: "community-123",
                entityType: Constants.MembershipEntityType.COMMUNITY,
                archived: false,
                internal: false,
                subscriptionMonthlyAmount: 19.99,
                includedProducts: ["course-1", "course-2"],
            });

            const response = await POST(mockRequest);
            expect(response.status).toBe(200);
            const responseData = await response.json();
            expect(responseData.status).toBe("initiated");
        });

        it("handles EMI payment plans with included products", async () => {
            (PaymentPlan.findOne as jest.Mock).mockResolvedValue({
                planId: "plan-123",
                type: Constants.PaymentPlanType.EMI,
                entityId: "community-123",
                entityType: Constants.MembershipEntityType.COMMUNITY,
                archived: false,
                internal: false,
                emiAmount: 33.33,
                emiTotalInstallments: 3,
                includedProducts: ["course-1", "course-2"],
            });

            const response = await POST(mockRequest);
            expect(response.status).toBe(200);
        });
    });

    describe("Existing Membership Handling", () => {
        it("handles already active free membership", async () => {
            mockRequest.json = jest.fn().mockResolvedValue({
                id: "community-123",
                type: Constants.MembershipEntityType.COMMUNITY,
                planId: "plan-123",
                origin: "https://test.com",
            });

            (Community.findOne as jest.Mock).mockResolvedValue({
                communityId: "community-123",
                name: "Test Community",
                autoAcceptMembers: true,
                deleted: false,
            });

            (PaymentPlan.findOne as jest.Mock).mockResolvedValue({
                planId: "plan-123",
                type: Constants.PaymentPlanType.FREE,
                entityId: "community-123",
                entityType: Constants.MembershipEntityType.COMMUNITY,
                archived: false,
                internal: false,
                includedProducts: ["course-1", "course-2"],
            });

            const { getMembership } = require("@/graphql/users/logic");
            (getMembership as jest.Mock).mockResolvedValue({
                membershipId: "membership-123",
                userId: "tester",
                entityId: "community-123",
                entityType: Constants.MembershipEntityType.COMMUNITY,
                status: Constants.MembershipStatus.ACTIVE,
                planId: "plan-123",
                save: jest.fn().mockResolvedValue(true),
            });

            const response = await POST(mockRequest);
            expect(response.status).toBe(200);

            const responseData = await response.json();
            expect(responseData.status).toBe("success");
        });

        it("handles rejected membership gracefully", async () => {
            mockRequest.json = jest.fn().mockResolvedValue({
                id: "community-123",
                type: Constants.MembershipEntityType.COMMUNITY,
                planId: "plan-123",
                origin: "https://test.com",
            });

            (Community.findOne as jest.Mock).mockResolvedValue({
                communityId: "community-123",
                name: "Test Community",
                autoAcceptMembers: true,
                deleted: false,
            });

            const { getMembership } = require("@/graphql/users/logic");
            (getMembership as jest.Mock).mockResolvedValue({
                membershipId: "membership-123",
                userId: "tester",
                entityId: "community-123",
                entityType: Constants.MembershipEntityType.COMMUNITY,
                status: Constants.MembershipStatus.REJECTED,
                planId: "plan-123",
                save: jest.fn().mockResolvedValue(true),
            });

            const response = await POST(mockRequest);
            expect(response.status).toBe(200);

            const responseData = await response.json();
            expect(responseData.status).toBe("failed");
        });
    });

    describe("Payment Method Configuration", () => {
        it("returns 500 if payment method not configured for paid plans", async () => {
            mockRequest.json = jest.fn().mockResolvedValue({
                id: "community-123",
                type: Constants.MembershipEntityType.COMMUNITY,
                planId: "plan-123",
                origin: "https://test.com",
            });

            (Community.findOne as jest.Mock).mockResolvedValue({
                communityId: "community-123",
                name: "Test Community",
                autoAcceptMembers: true,
                deleted: false,
            });

            (PaymentPlan.findOne as jest.Mock).mockResolvedValue({
                planId: "plan-123",
                type: Constants.PaymentPlanType.ONE_TIME,
                entityId: "community-123",
                entityType: Constants.MembershipEntityType.COMMUNITY,
                archived: false,
                internal: false,
                oneTimeAmount: 99.99,
                includedProducts: ["course-1", "course-2"],
            });

            const { getPaymentMethodFromSettings } = require("@/payments-new");
            (getPaymentMethodFromSettings as jest.Mock).mockResolvedValue(null);

            const response = await POST(mockRequest);
            expect(response.status).toBe(500);

            const responseData = await response.json();
            expect(responseData.error).toBe("Payment configuration is invalid");
        });

        it("allows free plans without payment method configuration", async () => {
            mockRequest.json = jest.fn().mockResolvedValue({
                id: "community-123",
                type: Constants.MembershipEntityType.COMMUNITY,
                planId: "plan-123",
                origin: "https://test.com",
            });

            (Community.findOne as jest.Mock).mockResolvedValue({
                communityId: "community-123",
                name: "Test Community",
                autoAcceptMembers: true,
                deleted: false,
            });

            (PaymentPlan.findOne as jest.Mock).mockResolvedValue({
                planId: "plan-123",
                type: Constants.PaymentPlanType.FREE,
                entityId: "community-123",
                entityType: Constants.MembershipEntityType.COMMUNITY,
                archived: false,
                internal: false,
                includedProducts: ["course-1", "course-2"],
            });

            const { getPaymentMethodFromSettings } = require("@/payments-new");
            (getPaymentMethodFromSettings as jest.Mock).mockResolvedValue(null);

            const response = await POST(mockRequest);
            expect(response.status).toBe(200);
        });
    });

    describe("Included Products Edge Cases", () => {
        it("handles payment plan with no included products", async () => {
            mockRequest.json = jest.fn().mockResolvedValue({
                id: "community-123",
                type: Constants.MembershipEntityType.COMMUNITY,
                planId: "plan-123",
                origin: "https://test.com",
            });

            (Community.findOne as jest.Mock).mockResolvedValue({
                communityId: "community-123",
                name: "Test Community",
                autoAcceptMembers: true,
                deleted: false,
            });

            (PaymentPlan.findOne as jest.Mock).mockResolvedValue({
                planId: "plan-123",
                type: Constants.PaymentPlanType.FREE,
                entityId: "community-123",
                entityType: Constants.MembershipEntityType.COMMUNITY,
                archived: false,
                internal: false,
                includedProducts: [],
            });

            const response = await POST(mockRequest);
            expect(response.status).toBe(200);
        });

        it("handles payment plan with undefined included products", async () => {
            mockRequest.json = jest.fn().mockResolvedValue({
                id: "community-123",
                type: Constants.MembershipEntityType.COMMUNITY,
                planId: "plan-123",
                origin: "https://test.com",
            });

            (Community.findOne as jest.Mock).mockResolvedValue({
                communityId: "community-123",
                name: "Test Community",
                autoAcceptMembers: true,
                deleted: false,
            });

            (PaymentPlan.findOne as jest.Mock).mockResolvedValue({
                planId: "plan-123",
                type: Constants.PaymentPlanType.FREE,
                entityId: "community-123",
                entityType: Constants.MembershipEntityType.COMMUNITY,
                archived: false,
                internal: false,
                includedProducts: undefined,
            });

            const response = await POST(mockRequest);
            expect(response.status).toBe(200);
        });

        it("handles large number of included products", async () => {
            mockRequest.json = jest.fn().mockResolvedValue({
                id: "community-123",
                type: Constants.MembershipEntityType.COMMUNITY,
                planId: "plan-123",
                origin: "https://test.com",
            });

            (Community.findOne as jest.Mock).mockResolvedValue({
                communityId: "community-123",
                name: "Test Community",
                autoAcceptMembers: true,
                deleted: false,
            });

            const manyProducts = Array.from(
                { length: 100 },
                (_, i) => `course-${i}`,
            );

            (PaymentPlan.findOne as jest.Mock).mockResolvedValue({
                planId: "plan-123",
                type: Constants.PaymentPlanType.FREE,
                entityId: "community-123",
                entityType: Constants.MembershipEntityType.COMMUNITY,
                archived: false,
                internal: false,
                includedProducts: manyProducts,
            });

            const response = await POST(mockRequest);
            expect(response.status).toBe(200);
        });
    });
});

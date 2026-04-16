/**
 * @jest-environment node
 */

import mongoose from "mongoose";
import { Constants } from "@courselit/common-models";
import CommunityModel from "@models/Community";
import { activateMembership } from "../helpers";

jest.mock("@models/Community");
jest.mock("@/graphql/paymentplans/logic", () => ({
    addIncludedProductsMemberships: jest.fn(),
}));
jest.mock("@/graphql/users/logic", () => ({
    runPostMembershipTasks: jest.fn(),
}));

const { addIncludedProductsMemberships } = jest.requireMock(
    "@/graphql/paymentplans/logic",
);
const { runPostMembershipTasks } = jest.requireMock("@/graphql/users/logic");

describe("payment helpers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("activates free community memberships and runs follow-up tasks", async () => {
        (CommunityModel.findOne as jest.Mock).mockResolvedValue({
            autoAcceptMembers: true,
        });

        const membership = {
            status: Constants.MembershipStatus.PENDING,
            entityType: Constants.MembershipEntityType.COMMUNITY,
            entityId: "community-123",
            userId: "user-123",
            sessionId: "session-123",
            joiningReason: "",
            save: jest.fn().mockResolvedValue(undefined),
        };

        const paymentPlan = {
            type: Constants.PaymentPlanType.FREE,
            includedProducts: ["course-123"],
        };

        const domain = {
            _id: new mongoose.Types.ObjectId("666666666666666666666666"),
        };

        await activateMembership(
            domain as any,
            membership as any,
            paymentPlan as any,
        );

        expect(membership.status).toBe(Constants.MembershipStatus.ACTIVE);
        expect(membership.role).toBe(Constants.MembershipRole.POST);
        expect(membership.save).toHaveBeenCalled();
        expect(addIncludedProductsMemberships).toHaveBeenCalledWith({
            domain: domain._id,
            userId: membership.userId,
            paymentPlan,
            sessionId: membership.sessionId,
        });
        expect(runPostMembershipTasks).toHaveBeenCalledWith({
            domain: domain._id,
            membership,
            paymentPlan,
        });
    });

    it("does not trigger included product memberships for pending community approvals", async () => {
        (CommunityModel.findOne as jest.Mock).mockResolvedValue({
            autoAcceptMembers: false,
        });

        const membership = {
            status: Constants.MembershipStatus.PENDING,
            entityType: Constants.MembershipEntityType.COMMUNITY,
            entityId: "community-123",
            userId: "user-123",
            sessionId: "session-123",
            joiningReason: "Let me in",
            save: jest.fn().mockResolvedValue(undefined),
        };

        const paymentPlan = {
            type: Constants.PaymentPlanType.FREE,
            includedProducts: ["course-123"],
        };

        const domain = {
            _id: new mongoose.Types.ObjectId("666666666666666666666666"),
        };

        await activateMembership(
            domain as any,
            membership as any,
            paymentPlan as any,
        );

        expect(membership.status).toBe(Constants.MembershipStatus.PENDING);
        expect(addIncludedProductsMemberships).not.toHaveBeenCalled();
        expect(runPostMembershipTasks).toHaveBeenCalledWith({
            domain: domain._id,
            membership,
            paymentPlan,
        });
    });
});

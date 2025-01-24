import { Constants } from ".";

const { MembershipEntityType, MembershipStatus } = Constants;

export type MembershipEntityType =
    (typeof MembershipEntityType)[keyof typeof MembershipEntityType];
export type MembershipStatus =
    (typeof MembershipStatus)[keyof typeof MembershipStatus];

export interface Membership {
    membershipId: string;
    userId: string;
    entityId: string;
    entityType: MembershipEntityType;
    status: MembershipStatus;
    paymentPlanId?: string;
    subscriptionId?: string;
    subscriptionMethod?: string;
    joiningReason?: string;
    rejectionReason?: string;
    sessionId: string;
    createdAt?: Date;
    updatedAt?: Date;
}

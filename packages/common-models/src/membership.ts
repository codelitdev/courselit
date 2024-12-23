import { Constants } from ".";

const { MembershipEntityType, MembershipStatus, MembershipPaymentStatus } =
    Constants;

export type MembershipEntityType =
    (typeof MembershipEntityType)[keyof typeof MembershipEntityType];
export type MembershipStatus =
    (typeof MembershipStatus)[keyof typeof MembershipStatus];
export type MembershipPaymentStatus =
    (typeof MembershipPaymentStatus)[keyof typeof MembershipPaymentStatus];

export interface MembershipPayment {
    installmentNumber: number;
    amount: number;
    status: MembershipPaymentStatus;
    paymentProcessor: string;
    paymentProcessorTransactionId: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Membership {
    membershipId: string;
    userId: string;
    paymentPlanId: string;
    entityId: string;
    entityType: MembershipEntityType;
    status: MembershipStatus;
    paymentHistory: MembershipPayment[];
    joiningReason?: string;
    rejectionReason?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

import {
    PAYMENT_METHOD_NONE,
    PAYMENT_METHOD_PAYPAL,
    PAYMENT_METHOD_PAYTM,
    PAYMENT_METHOD_RAZORPAY,
    PAYMENT_METHOD_STRIPE,
} from "./ui-constants";

export const userFilters = [
    "email",
    "product",
    "lastActive",
    "signedUp",
    "subscription",
    "tag",
    "permission",
] as const;
export const userFilterAggregationOperators = ["and", "or"] as const;
export const mailTypes = ["broadcast", "sequence"] as const;
export const eventTypes = [
    "tag:added",
    "tag:removed",
    "product:purchased",
    "subscriber:added",
    "date:occurred",
    "community:joined",
] as const;
export const actionTypes = [
    "tag:add",
    "tag:remove",
    "seq:start",
    "seq:remove",
    "date:delay",
] as const;
export const emailActionTypes = ["tag:add", "tag:remove"] as const;
export const sequenceStatus = [
    "draft",
    "active",
    "paused",
    "completed",
] as const;
export const leads = ["website", "newsletter", "download", "api"] as const;
export const mailRequestStatus = ["pending", "approved", "rejected"] as const;
export const pageNames = {
    home: "Home page",
    terms: "Terms of Service",
    privacy: "Privacy policy",
    blog: "Blog",
};
export const dripType = ["relative-date", "exact-date"] as const;
export const paymentMethods = [
    PAYMENT_METHOD_NONE,
    PAYMENT_METHOD_PAYPAL,
    PAYMENT_METHOD_PAYTM,
    PAYMENT_METHOD_RAZORPAY,
    PAYMENT_METHOD_STRIPE,
] as const;
export const PageType = {
    PRODUCT: "product",
    SITE: "site",
    BLOG: "blog",
    COMMUNITY: "community",
} as const;
export const PaymentPlanType = {
    FREE: "free",
    ONE_TIME: "onetime",
    EMI: "emi",
    SUBSCRIPTION: "subscription",
} as const;
export const MembershipEntityType = {
    COURSE: "course",
    COMMUNITY: "community",
} as const;
export const MembershipStatus = {
    ACTIVE: "active",
    FAILED: "failed",
    EXPIRED: "expired",
    PENDING: "pending",
    REJECTED: "rejected",
} as const;
export const InvoiceStatus = {
    PENDING: "pending",
    PAID: "paid",
    FAILED: "failed",
} as const;
export const CommunityReportStatus = {
    PENDING: "pending",
    ACCEPTED: "accepted",
    REJECTED: "rejected",
} as const;
export const CommunityReportType = {
    POST: "post",
    COMMENT: "comment",
    REPLY: "reply",
} as const;
export const NotificationEntityAction = {
    COMMUNITY_POSTED: "community:posted",
    COMMUNITY_COMMENTED: "community:commented",
    COMMUNITY_REPLIED: "community:replied",
    COMMUNITY_POST_LIKED: "community:post:liked",
    COMMUNITY_COMMENT_LIKED: "community:comment:liked",
    COMMUNITY_REPLY_LIKED: "community:reply:liked",
    COMMUNITY_MEMBERSHIP_REQUESTED: "community:membership:requested",
    COMMUNITY_MEMBERSHIP_GRANTED: "community:membership:granted",
} as const;

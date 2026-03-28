import {
    PAYMENT_METHOD_LEMONSQUEEZY,
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
    terms: "Terms of Use",
    privacy: "Privacy Policy",
    blog: "Blog",
};
export const dripType = ["relative-date", "exact-date"] as const;
export const paymentMethods = [
    PAYMENT_METHOD_NONE,
    PAYMENT_METHOD_PAYPAL,
    PAYMENT_METHOD_PAYTM,
    PAYMENT_METHOD_RAZORPAY,
    PAYMENT_METHOD_STRIPE,
    PAYMENT_METHOD_LEMONSQUEEZY,
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
    PAYMENT_FAILED: "payment_failed",
    EXPIRED: "expired",
    PENDING: "pending",
    REJECTED: "rejected",
    PAUSED: "paused",
} as const;
export const MembershipRole = {
    COMMENT: "comment",
    POST: "post",
    MODERATE: "moderate",
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
export const NotificationChannel = {
    APP: "app",
    EMAIL: "email",
} as const;
export const ProductPriceType = {
    FREE: "free",
    PAID: "paid",
    EMAIL: "email",
} as const;
export const LessonType = {
    TEXT: "text",
    VIDEO: "video",
    AUDIO: "audio",
    PDF: "pdf",
    FILE: "file",
    EMBED: "embed",
    QUIZ: "quiz",
    SCORM: "scorm",
} as const;
export const ActivityType = {
    ENROLLED: "enrolled",
    PURCHASED: "purchased",
    DOWNLOADED: "downloaded",
    LESSON_STARTED: "lesson_started",
    LESSON_COMPLETED: "lesson_completed",
    COURSE_COMPLETED: "course_completed",
    QUIZ_ATTEMPTED: "quiz_attempted",
    QUIZ_PASSED: "quiz_passed",
    VIDEO_STARTED: "video_started",
    VIDEO_FINISHED: "video_finished",
    CERTIFICATE_ISSUED: "certificate_issued",
    CERTIFICATE_DOWNLOADED: "certificate_downloaded",
    REVIEWED: "reviewed",
    NEWSLETTER_SUBSCRIBED: "newsletter_subscribed",
    NEWSLETTER_UNSUBSCRIBED: "newsletter_unsubscribed",
    USER_CREATED: "user_created",
    TAG_ADDED: "tag_added",
    TAG_REMOVED: "tag_removed",
    COMMUNITY_JOINED: "community_joined",
    COMMUNITY_LEFT: "community_left",
    COMMUNITY_POST_CREATED: "community_post_created",
    COMMUNITY_POST_LIKED: "community_post_liked",
    COMMUNITY_COMMENT_CREATED: "community_comment_created",
    COMMUNITY_COMMENT_REPLIED: "community_comment_replied",
    COMMUNITY_COMMENT_LIKED: "community_comment_liked",
    COMMUNITY_REPLY_CREATED: "community_reply_created",
    COMMUNITY_REPLY_LIKED: "community_reply_liked",
    COMMUNITY_MEMBERSHIP_REQUESTED: "community_membership_requested",
    COMMUNITY_MEMBERSHIP_GRANTED: "community_membership_granted",
} as const;
export const ActivityPermissionMap = {
    [ActivityType.ENROLLED]: "course:manage_any",
    [ActivityType.PURCHASED]: "course:manage_any",
    [ActivityType.DOWNLOADED]: "course:manage_any",
    // [ActivityType.LESSON_STARTED]: "course:manage_any",
    // [ActivityType.LESSON_COMPLETED]: "course:manage_any",
    // [ActivityType.COURSE_COMPLETED]: "course:manage_any",
    // [ActivityType.QUIZ_ATTEMPTED]: "course:manage_any",
    // [ActivityType.QUIZ_PASSED]: "course:manage_any",
    // [ActivityType.VIDEO_STARTED]: "course:manage_any",
    // [ActivityType.VIDEO_FINISHED]: "course:manage_any",
    // [ActivityType.CERTIFICATE_ISSUED]: "course:manage_any",
    // [ActivityType.CERTIFICATE_DOWNLOADED]: "course:manage_any",
    // [ActivityType.REVIEWED]: "course:manage_any",
    [ActivityType.NEWSLETTER_SUBSCRIBED]: "user:manage",
    [ActivityType.NEWSLETTER_UNSUBSCRIBED]: "user:manage",
    [ActivityType.USER_CREATED]: "user:manage",
    // [ActivityType.TAG_ADDED]: "user:manage",
    // [ActivityType.TAG_REMOVED]: "user:manage",
    [ActivityType.COMMUNITY_JOINED]: "community:manage",
    [ActivityType.COMMUNITY_LEFT]: "community:manage",
    [ActivityType.COMMUNITY_POST_CREATED]: "",
    [ActivityType.COMMUNITY_POST_LIKED]: "",
    [ActivityType.COMMUNITY_COMMENT_CREATED]: "",
    [ActivityType.COMMUNITY_COMMENT_REPLIED]: "",
    [ActivityType.COMMUNITY_COMMENT_LIKED]: "",
    [ActivityType.COMMUNITY_REPLY_CREATED]: "",
    [ActivityType.COMMUNITY_REPLY_LIKED]: "",
    [ActivityType.COMMUNITY_MEMBERSHIP_REQUESTED]: "community:manage",
    [ActivityType.COMMUNITY_MEMBERSHIP_GRANTED]: "",
} as const;
export const CourseType = {
    COURSE: "course",
    DOWNLOAD: "download",
    BLOG: "blog",
} as const;
export const MediaAccessType = {
    PUBLIC: "public",
    PRIVATE: "private",
} as const;
export const UserFilter = {
    EMAIL: "email",
    PRODUCT: "product",
    COMMUNITY: "community",
    LAST_ACTIVE: "lastActive",
    SIGNED_UP: "signedUp",
    SUBSCRIPTION: "subscription",
    TAG: "tag",
    PERMISSION: "permission",
} as const;
export const ProductAccessType = {
    UNLISTED: "unlisted",
    PUBLIC: "public",
} as const;
export const EventType = {
    TAG_ADDED: "tag:added",
    TAG_REMOVED: "tag:removed",
    PRODUCT_PURCHASED: "product:purchased",
    SUBSCRIBER_ADDED: "subscriber:added",
    DATE_OCCURRED: "date:occurred",
    COMMUNITY_JOINED: "community:joined",
    COMMUNITY_LEFT: "community:left",
} as const;
export const EmailEventAction = {
    OPEN: "open",
    CLICK: "click",
    BOUNCE: "bounce",
} as const;
export const LoginProvider = {
    GOOGLE: "google",
    FACEBOOK: "facebook",
    GITHUB: "github",
    LINKEDIN: "linkedin",
    TWITTER: "twitter",
    APPLE: "apple",
    EMAIL: "email",
    SSO: "sso",
} as const;
export const Features = {
    SSO: "sso",
    API: "api",
    LOG: "log",
} as const;

/**
 * This file provides app wide constants
 */
import { UIConstants } from "@courselit/common-models";
const { permissions } = UIConstants;

export default {
    domainNameForSingleTenancy: "main",
    dbConnectionString:
        process.env.DB_CONNECTION_STRING ||
        `mongodb://localhost/${
            process.env.NODE_ENV === "test" ? "test" : "app"
        }`,

    // product types
    course: "course",
    download: "download",
    blog: "blog",

    // Content types
    text: "text",
    audio: "audio",
    video: "video",
    pdf: "pdf",
    quiz: "quiz",
    file: "file",
    embed: "embed",

    // media access type
    publicMedia: "public",
    privateMedia: "private",

    // Content privacy types
    unlisted: "unlisted",
    open: "public",

    // Cost types
    costFree: "free",
    costEmail: "email",
    costPaid: "paid",

    // Pagination config
    itemsPerPage: process.env.ITEMS_PER_PAGE ? +process.env.ITEMS_PER_PAGE : 10,
    defaultOffset: 1,
    blogPostSnippetLength: 135,

    // transaction statuses
    transactionInitiated: "initiated",
    transactionSuccess: "success",
    transactionFailed: "failed",

    // permissions for role-based access
    permissions,

    // entry point for the user
    leadWebsite: "website",
    leadNewsletter: "newsletter",
    leadDownload: "download",
    leadApi: "api",

    // log levels
    severityError: "error",
    severityInfo: "info",
    severityWarn: "warn",

    // limits
    mediaRecordsPerPage: 10,

    // page types
    product: "product",
    site: "site",
    blogPage: "blog",

    // default pages
    defaultPages: ["homepage", "terms", "privacy", "blog"],

    // typography
    typeface: "Roboto",

    // Download links settings
    downLoadLinkExpiresInDays: 2,
    downLoadLinkLength: 128,

    // activity types
    activityTypes: [
        "enrolled",
        "purchased",
        "lesson_started",
        "lesson_completed",
        "course_completed",
        "quiz_attempted",
        "quiz_passed",
        "video_started",
        "video_finished",
        "certificate_issued",
        "certificate_downloaded",
        "reviewed",
        "newsletter_subscribed",
        "newsletter_unsubscribed",
        "user_created",
    ],

    // durations
    analyticsDurations: ["7d", "30d", "90d", "1y", "lifetime"],

    // mails
    minMailingAddressLength: 10,
} as const;

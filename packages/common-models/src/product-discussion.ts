import { Constants } from ".";

const {
    ProductDiscussionEntityType: ProductDiscussionEntityTypeConst,
    ProductDiscussionContentType: ProductDiscussionContentTypeConst,
    ProductDiscussionDeletedByRole: ProductDiscussionDeletedByRoleConst,
    ProductDiscussionReportStatus: ProductDiscussionReportStatusConst,
} = Constants;

export type ProductDiscussionEntityType =
    (typeof ProductDiscussionEntityTypeConst)[keyof typeof ProductDiscussionEntityTypeConst];

export type ProductDiscussionContentType =
    (typeof ProductDiscussionContentTypeConst)[keyof typeof ProductDiscussionContentTypeConst];

export type ProductDiscussionDeletedByRole =
    (typeof ProductDiscussionDeletedByRoleConst)[keyof typeof ProductDiscussionDeletedByRoleConst];

export type ProductDiscussionReportStatus =
    (typeof ProductDiscussionReportStatusConst)[keyof typeof ProductDiscussionReportStatusConst];

import { CommunityMedia } from "./community-media";
import { CommunityReportStatus, CommunityReportType } from "./constants";
import User from "./user";

export type CommunityReportStatus =
    (typeof CommunityReportStatus)[keyof typeof CommunityReportStatus];
export type CommunityReportType =
    (typeof CommunityReportType)[keyof typeof CommunityReportType];

export interface CommunityReport {
    communityId: string;
    reportId: string;
    content: {
        id: string;
        content: string;
        media: CommunityMedia[];
    };
    type: CommunityReportType;
    reason: string;
    status: CommunityReportStatus;
    contentParentId?: string;
    rejectionReason?: string;
    createdAt?: Date;
    updatedAt?: Date;
    user: User;
}

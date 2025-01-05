import { Constants } from ".";

const CommunityReportStatusTypes = [
    Constants.CommunityReportStatus.PENDING,
    Constants.CommunityReportStatus.ACCEPTED,
    Constants.CommunityReportStatus.REJECTED,
];

export type CommunityReportStatus = (typeof CommunityReportStatusTypes)[number];

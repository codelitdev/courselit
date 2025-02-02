export type CommunityReport = {
    reportId: string;
    contentId: string;
    type: "post" | "comment";
    reason: string;
    status: "pending" | "accepted" | "rejected";
    rejectionReason: string;
    createdAt: Date;
};

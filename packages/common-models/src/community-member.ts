import { CommunityMemberStatus } from "./community-member-status";

export interface CommunityMember {
    communityId: string;
    userId: string;
    status: CommunityMemberStatus;
    joiningReason?: string;
    rejectionReason?: string;
}

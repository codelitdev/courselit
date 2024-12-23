import { Constants } from ".";

const CommunityMembershipTypes = [
    Constants.MembershipStatus.PENDING,
    Constants.MembershipStatus.ACTIVE,
    Constants.MembershipStatus.REJECTED,
];

export type CommunityMemberStatus = (typeof CommunityMembershipTypes)[number];

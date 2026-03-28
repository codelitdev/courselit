import DashboardContent from "@components/admin/dashboard-content";
import { MembershipList } from "@components/community/membership-list";
import {
    COMMUNITY_HEADER,
    COMMUNITY_MEMBERSHIP_LIST_HEADER,
    COMMUNITY_SETTINGS,
} from "@ui-config/strings";

export default async function Page(props: {
    params: Promise<{
        id: string;
    }>;
}) {
    const params = await props.params;
    const { id } = params;
    const breadcrumbs = [
        {
            label: COMMUNITY_HEADER,
            href: `/dashboard/community/${id}`,
        },
        {
            label: COMMUNITY_SETTINGS,
            href: `/dashboard/community/${id}/manage`,
        },
        { label: COMMUNITY_MEMBERSHIP_LIST_HEADER, href: "#" },
    ];

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <MembershipList id={id} />
        </DashboardContent>
    );
}

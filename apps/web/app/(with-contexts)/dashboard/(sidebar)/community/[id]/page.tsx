"use client";

import { use } from "react";
import DashboardContent from "@components/admin/dashboard-content";
import { CommunityForum } from "@components/community";
import { COMMUNITY_HEADER } from "@ui-config/strings";
import { useSearchParams } from "next/navigation";
import { useCommunity } from "@/hooks/use-community";
import { truncate } from "@courselit/utils";

export default function Page(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { id } = params;
    const searchParams = useSearchParams();
    const category = searchParams?.get("category") || "All";
    const { community } = useCommunity(id);

    const breadcrumbs = [
        {
            label: truncate(community?.name || COMMUNITY_HEADER, 20).trim(),
            href: "#",
        },
    ];

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <CommunityForum id={id} activeCategory={category} />
        </DashboardContent>
    );
}

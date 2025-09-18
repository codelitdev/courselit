"use client";
import { use } from "react";

import DashboardContent from "@components/admin/dashboard-content";
import { CommunityForum } from "@components/community";
import { COMMUNITY_HEADER } from "@ui-config/strings";
import { useSearchParams } from "next/navigation";

const breadcrumbs = [{ label: COMMUNITY_HEADER, href: "#" }];

export default function Page(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { id } = params;
    const searchParams = useSearchParams();
    const category = searchParams?.get("category") || "All";

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <CommunityForum id={id} activeCategory={category} />
        </DashboardContent>
    );
}

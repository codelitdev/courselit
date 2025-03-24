"use client";

import { CommunitiesList } from "@/app/(with-contexts)/(with-layout)/communities/communities-list";
import DashboardContent from "@components/admin/dashboard-content";
import { UIConstants } from "@courselit/common-models";
import {
    MANAGE_COMMUNITIES_PAGE_HEADING,
    NEW_COMMUNITY_BUTTON,
} from "@ui-config/strings";
import Link from "next/link";
import { Button } from "@components/ui/button";
const { permissions } = UIConstants;

const breadcrumbs = [{ label: MANAGE_COMMUNITIES_PAGE_HEADING, href: "#" }];

export default function Page() {
    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[permissions.manageCommunity]}
        >
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-semibold mb-4">
                    {MANAGE_COMMUNITIES_PAGE_HEADING}
                </h1>
                <div>
                    <Link href={`/dashboard/community/new`}>
                        <Button>{NEW_COMMUNITY_BUTTON}</Button>
                    </Link>
                </div>
            </div>
            <CommunitiesList itemsPerPage={9} publicLink={false} />
        </DashboardContent>
    );
}

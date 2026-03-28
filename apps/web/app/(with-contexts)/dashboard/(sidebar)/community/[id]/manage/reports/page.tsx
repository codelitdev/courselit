import { Suspense } from "react";
import { ReportsTableSkeleton } from "./reports-table-skeleton";
import { ReportsTable } from "./reports-table";
import {
    COMMUNITY_HEADER,
    COMMUNITY_REPORTS_HEADER,
    COMMUNITY_REPORTS_SUBHEADER,
    COMMUNITY_SETTINGS,
} from "@ui-config/strings";
import DashboardContent from "@components/admin/dashboard-content";

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
        { label: COMMUNITY_REPORTS_HEADER, href: "#" },
    ];

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <div>
                <div className="mb-6">
                    <h2 className="text-2xl font-bold tracking-tight">
                        {COMMUNITY_REPORTS_HEADER}
                    </h2>
                    <p className="text-muted-foreground">
                        {COMMUNITY_REPORTS_SUBHEADER}
                    </p>
                </div>
                <Suspense fallback={<ReportsTableSkeleton />}>
                    <ReportsTable communityId={id} />
                </Suspense>
            </div>
        </DashboardContent>
    );
}

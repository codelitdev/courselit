"use client";

import DashboardContent from "@components/admin/dashboard-content";
import { UIConstants } from "@courselit/common-models";
import { HEADER_COURSELIT } from "@ui-config/strings";

const breadcrumbs = [{ label: HEADER_COURSELIT, href: "#" }];

export default function Page() {
    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[UIConstants.permissions.manageSettings]}
        >
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-semibold mb-4">
                    {HEADER_COURSELIT}
                </h1>
            </div>
            <p className="mb-8 text-slate-600">Tech stuff about CourseLit</p>
            <div className="mb-8">
                <p className="text-slate-600">
                    <span className="font-medium">Version:</span>{" "}
                    {process.env.version || "0.0.0"}
                </p>
            </div>
        </DashboardContent>
    );
}

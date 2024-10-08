"use client";

import { Metric } from "@components/admin/dashboard/metric";
import { Todo } from "@components/admin/dashboard/to-do";
import LoadingScreen from "@components/admin/loading-screen";
import {
    AddressContext,
    ProfileContext,
    SiteInfoContext,
} from "@components/contexts";
import { UIConstants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import { DASHBOARD_PAGE_HEADER } from "@ui-config/strings";
import { useContext } from "react";

export default function Page() {
    const siteInfo = useContext(SiteInfoContext);
    const address = useContext(AddressContext);
    const profile = useContext(ProfileContext);

    if (
        !checkPermission(profile.permissions!, [
            UIConstants.permissions.manageAnyCourse,
            UIConstants.permissions.manageCourse,
            UIConstants.permissions.manageMedia,
            UIConstants.permissions.manageSettings,
            UIConstants.permissions.manageSite,
            UIConstants.permissions.manageUsers,
        ])
    ) {
        return <LoadingScreen />;
    }

    return (
        <div>
            <h1 className="text-4xl font-semibold mb-8">
                {DASHBOARD_PAGE_HEADER}
            </h1>
            <div className="mb-8">
                <Todo siteinfo={siteInfo} />
            </div>
            <div className="grid xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Metric
                    title="Revenue"
                    type="purchased"
                    duration="7d"
                    address={address}
                />
                <Metric
                    title="Enrollments"
                    type="enrolled"
                    duration="7d"
                    address={address}
                />
                <Metric
                    title="New accounts"
                    type="user_created"
                    duration="7d"
                    address={address}
                />
                <Metric
                    title="Subscribers"
                    type="newsletter_subscribed"
                    duration="7d"
                    address={address}
                />
            </div>
        </div>
    );
}

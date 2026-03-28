"use client";

import { useContext, useState } from "react";
import { ProfileContext } from "@components/contexts";
import { Constants } from "@courselit/common-models";
import {
    DASHBOARD_PAGE_HEADER,
    OVERVIEW_HEADER,
    UNNAMED_USER,
} from "@ui-config/strings";
import { ADMIN_PERMISSIONS, TIME_RANGES } from "@ui-config/constants";
import { useActivities } from "@/hooks/use-activities";
import dynamic from "next/dynamic";
import DashboardContent from "@components/admin/dashboard-content";
const LoadingScreen = dynamic(() => import("@components/admin/loading-screen"));
const MetricCard = dynamic(() => import("../product/[id]/metric-card"));
const SalesCard = dynamic(() => import("./sales-card"));

// Dynamically import UI components
const Select = dynamic(() =>
    import("@/components/ui/select").then((mod) => ({ default: mod.Select })),
);
const SelectContent = dynamic(() =>
    import("@/components/ui/select").then((mod) => ({
        default: mod.SelectContent,
    })),
);
const SelectItem = dynamic(() =>
    import("@/components/ui/select").then((mod) => ({
        default: mod.SelectItem,
    })),
);
const SelectTrigger = dynamic(() =>
    import("@/components/ui/select").then((mod) => ({
        default: mod.SelectTrigger,
    })),
);
const SelectValue = dynamic(() =>
    import("@/components/ui/select").then((mod) => ({
        default: mod.SelectValue,
    })),
);

// Dynamically import icons
const DollarSign = dynamic(() =>
    import("lucide-react").then((mod) => ({ default: mod.DollarSign })),
);
const UserPlus = dynamic(() =>
    import("lucide-react").then((mod) => ({ default: mod.UserPlus })),
);
const Users = dynamic(() =>
    import("lucide-react").then((mod) => ({ default: mod.Users })),
);
const Mail = dynamic(() =>
    import("lucide-react").then((mod) => ({ default: mod.Mail })),
);
const breadcrumbs = [{ label: OVERVIEW_HEADER, href: "#" }];

export default function Page() {
    const { profile } = useContext(ProfileContext);
    const [timeRange, setTimeRange] = useState("7d");
    const { data: salesData, loading: salesLoading } = useActivities(
        Constants.ActivityType.PURCHASED,
        timeRange,
        undefined,
        true,
    );

    if (!profile || !profile.userId) {
        return <LoadingScreen />;
    }

    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={ADMIN_PERMISSIONS}
        >
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-semibold mb-4">
                    {DASHBOARD_PAGE_HEADER},{" "}
                    {profile.name ? profile.name.split(" ")[0] : UNNAMED_USER}
                </h1>
                <div>
                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Select time range" />
                        </SelectTrigger>
                        <SelectContent>
                            {TIME_RANGES.map((range) => (
                                <SelectItem
                                    key={range.value}
                                    value={range.value}
                                >
                                    {range.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                <MetricCard
                    title="Sales"
                    icon={
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    }
                    type={Constants.ActivityType.PURCHASED}
                    duration={timeRange}
                />
                <MetricCard
                    title="Customers"
                    icon={
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                    }
                    type={Constants.ActivityType.ENROLLED}
                    duration={timeRange}
                />
                <MetricCard
                    title="New community members"
                    icon={<Users className="h-4 w-4 text-muted-foreground" />}
                    type={Constants.ActivityType.COMMUNITY_JOINED}
                    duration={timeRange}
                />
                <MetricCard
                    title="Subscribers"
                    icon={<Mail className="h-4 w-4 text-muted-foreground" />}
                    type={Constants.ActivityType.NEWSLETTER_SUBSCRIBED}
                    duration={timeRange}
                />
            </div>
            <SalesCard data={salesData} loading={salesLoading} />
        </DashboardContent>
    );
}

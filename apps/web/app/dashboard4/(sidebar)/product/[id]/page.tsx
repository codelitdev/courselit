"use client";

import DashboardContent from "@components/admin/dashboard-content";
import {
    EDIT_PAGE_MENU_ITEM,
    EDIT_PRODUCT_HEADER,
    MANAGE_COURSES_PAGE_HEADING,
    PAGE_TITLE_404,
    PRODUCT_TABLE_CONTEXT_MENU_INVITE_A_CUSTOMER,
    VIEW_PAGE_MENU_ITEM,
} from "@ui-config/strings";
import dynamic from "next/dynamic";
const CourseReports = dynamic(
    () => import("@components/admin/products/editor/reports"),
);
const ContentEditor = dynamic(
    () => import("@components/admin/products/editor/content"),
);
const PricingEditor = dynamic(
    () => import("@components/admin/products/editor/pricing"),
);
const DetailsEditor = dynamic(
    () => import("@components/admin/products/editor/details"),
);
const PublishingEditor = dynamic(
    () => import("@components/admin/products/editor/publish"),
);
import {
    AddressContext,
    ProfileContext,
    SiteInfoContext,
} from "@components/contexts";
import {
    Link,
    Menu2,
    MenuItem,
    Skeleton,
    Tabbs,
} from "@courselit/components-library";
import { useContext, useState } from "react";
import { Profile } from "@courselit/common-models";
import useCourse from "@components/admin/products/editor/course-hook";
import { useSearchParams } from "next/navigation";
import { MoreVert } from "@courselit/icons";
import { truncate } from "@ui-lib/utils";

const breadcrumbs = [
    { label: MANAGE_COURSES_PAGE_HEADING, href: "/dashboard4/products" },
    { label: EDIT_PRODUCT_HEADER, href: "#" },
];

export default function Page({ params }: { params: { id: string } }) {
    const { id } = params;
    const searchParams = useSearchParams();
    const [tab, setTab] = useState(searchParams?.get("tab") || "Reports");
    const address = useContext(AddressContext);
    const siteInfo = useContext(SiteInfoContext);
    const profile = useContext(ProfileContext);
    const course = useCourse(id, address);

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            {course === undefined && (
                <div className="flex flex-col gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
            )}
            {course === null && <p>{PAGE_TITLE_404}</p>}
            {course && (
                <>
                    <div className="flex justify-between items-center">
                        <h1 className="text-4xl font-semibold mb-4">
                            {truncate(course?.title || "", 50)}
                        </h1>
                        <Menu2 icon={<MoreVert />} variant="soft">
                            <MenuItem>
                                <Link
                                    className="flex w-full"
                                    href={`/p/${course?.pageId}`}
                                >
                                    {VIEW_PAGE_MENU_ITEM}
                                </Link>
                            </MenuItem>
                            <div className="flex w-full border-b border-slate-200 my-1"></div>
                            <MenuItem>
                                <Link
                                    href={`/dashboard4/product/${course?.courseId}/customer/new`}
                                >
                                    {
                                        PRODUCT_TABLE_CONTEXT_MENU_INVITE_A_CUSTOMER
                                    }
                                </Link>
                            </MenuItem>
                            <div className="flex w-full border-b border-slate-200 my-1"></div>
                            <MenuItem>
                                <Link
                                    href={`/dashboard/page/${course?.pageId}/edit?redirectTo=/dashboard4/product/${course?.courseId}?tab=Content`}
                                    className="flex w-full"
                                >
                                    {EDIT_PAGE_MENU_ITEM}
                                </Link>
                            </MenuItem>
                        </Menu2>
                    </div>
                    <Tabbs
                        items={[
                            "Reports",
                            "Content",
                            "Pricing",
                            "Details",
                            "Publish",
                        ]}
                        value={tab}
                        onChange={setTab}
                    >
                        <div className="pt-4">
                            <CourseReports
                                address={address}
                                id={id}
                                prefix="/dashboard4"
                            />
                        </div>
                        <div className="pt-4">
                            <ContentEditor
                                address={address}
                                id={id}
                                prefix="/dashboard4"
                            />
                        </div>
                        <div className="pt-4">
                            <PricingEditor
                                address={address}
                                id={id}
                                siteinfo={siteInfo}
                            />
                        </div>
                        <div className="pt-4">
                            <DetailsEditor
                                address={address}
                                id={id}
                                profile={profile as Profile}
                            />
                        </div>
                        <div className="pt-4">
                            <PublishingEditor id={id} address={address} />
                        </div>
                    </Tabbs>
                </>
            )}
        </DashboardContent>
    );
}

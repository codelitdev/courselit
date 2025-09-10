"use client";

import useCourse from "@components/admin/blogs/editor/course-hook";
import Details from "@components/admin/blogs/editor/details";
import Publish from "@components/admin/blogs/editor/publish";
import { deleteProduct } from "@components/admin/blogs/helpers";
import DashboardContent from "@components/admin/dashboard-content";
import { AddressContext } from "@components/contexts";
import { UIConstants } from "@courselit/common-models";
import {
    Link,
    Menu2,
    MenuItem,
    Skeleton,
    Tabbs,
    useToast,
} from "@courselit/components-library";
import { MoreVert } from "@courselit/icons";
import {
    DELETE_PRODUCT_POPUP_HEADER,
    DELETE_PRODUCT_POPUP_TEXT,
    EDIT_BLOG,
    MANAGE_BLOG_PAGE_HEADING,
    MENU_BLOG_VISIT,
    PAGE_TITLE_404,
    PRODUCT_TABLE_CONTEXT_MENU_DELETE_PRODUCT,
} from "@ui-config/strings";
import { truncate } from "@ui-lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { useContext, useState } from "react";

const breadcrumbs = [
    { label: MANAGE_BLOG_PAGE_HEADING, href: "/dashboard/blogs" },
    { label: EDIT_BLOG, href: "#" },
];

export default function Page({ params }: { params: { id: string } }) {
    const { id } = params;
    const searchParams = useSearchParams();
    const [tab, setTab] = useState(searchParams?.get("tab") || "Details");
    const address = useContext(AddressContext);
    const course = useCourse(id, address);
    const router = useRouter();
    const { toast } = useToast();

    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[
                UIConstants.permissions.manageAnyCourse,
                UIConstants.permissions.manageCourse,
            ]}
        >
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
                        <div>
                            <Menu2 icon={<MoreVert />} variant="soft">
                                <MenuItem>
                                    <Link
                                        href={`/blog/${course?.slug}/${course?.courseId}`}
                                        className="flex w-full"
                                    >
                                        {MENU_BLOG_VISIT}
                                    </Link>
                                </MenuItem>
                                <MenuItem
                                    component="dialog"
                                    title={DELETE_PRODUCT_POPUP_HEADER}
                                    triggerChildren={
                                        PRODUCT_TABLE_CONTEXT_MENU_DELETE_PRODUCT
                                    }
                                    description={DELETE_PRODUCT_POPUP_TEXT}
                                    onClick={() =>
                                        deleteProduct({
                                            id: course!.courseId,
                                            backend: address.backend,
                                            onDeleteComplete: () => {
                                                router.replace(
                                                    `/dashboard/blogs`,
                                                );
                                            },
                                            toast,
                                        })
                                    }
                                ></MenuItem>
                            </Menu2>
                        </div>
                    </div>
                    <Tabbs
                        items={["Details", "Publish"]}
                        value={tab}
                        onChange={setTab}
                    >
                        <div className="pt-4">
                            <Details id={id as string} />
                        </div>
                        <div className="pt-4">
                            <Publish id={id} />
                        </div>
                    </Tabbs>
                </>
            )}
        </DashboardContent>
    );
}

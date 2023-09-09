import React from "react";
import { MoreVert } from "@courselit/icons";
import { Breadcrumbs } from "@mui/material";
import {
    EDIT_PAGE_MENU_ITEM,
    VIEW_PAGE_MENU_ITEM,
} from "../../../../../ui-config/strings";
import useCourse from "../course-hook";
import { Menu2, MenuItem, Link } from "@courselit/components-library";

interface Breadcrumb {
    text: string;
    url: string;
}

interface ProductHeaderProps {
    breadcrumbs?: Breadcrumb[];
    id: string;
}

export default function ProductHeader({ id, breadcrumbs }: ProductHeaderProps) {
    const course = useCourse(id);

    if (!course) {
        return <></>;
    }

    return (
        <div className="flex flex-col gap-4">
            {breadcrumbs && (
                    <Breadcrumbs aria-label="product-breadcrumbs">
                        {breadcrumbs.map((crumb: Breadcrumb) =>
                            crumb.url ? (
                                <Link href={crumb.url} key={crumb.url}>
                                    {crumb.text}
                                </Link>
                            ) : (
                                <span key={crumb.text}>
                                    {crumb.text}
                                </span>
                            ),
                        )}
                    </Breadcrumbs>
            )}
                <div
                    className="flex justify-between items-center"
                >
                <h1 className="text-4xl font-semibold mb-4">
                            {course.title}
                </h1>
                        <Menu2 icon={<MoreVert />} variant="soft">
                            <MenuItem>
                                <Link href={`/p/${course.pageId}`}>
                                    {VIEW_PAGE_MENU_ITEM}
                                </Link>
                            </MenuItem>
                            <MenuItem>
                                <Link
                                    href={`/dashboard/page/${course.pageId}/edit?redirectTo=/dashboard/product/${course.courseId}/content`}
                                >
                                    {EDIT_PAGE_MENU_ITEM}
                                </Link>
                            </MenuItem>
                        </Menu2>
                </div>
        </div>
    );
}

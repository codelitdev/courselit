import React from "react";
import { MoreVert } from "@mui/icons-material";
import { Breadcrumbs, Grid, Typography } from "@mui/material";
import Link from "next/link";
import {
    EDIT_PAGE_MENU_ITEM,
    VIEW_PAGE_MENU_ITEM,
} from "../../../../../ui-config/strings";
import useCourse from "../course-hook";
import { Menu } from "@courselit/components-library";

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
        <Grid container direction="column">
            {breadcrumbs && (
                <Grid item sx={{ mb: 2 }}>
                    <Breadcrumbs aria-label="product-breadcrumbs">
                        {breadcrumbs.map((crumb: Breadcrumb) =>
                            crumb.url ? (
                                <Link href={crumb.url} key={crumb.url}>
                                    {crumb.text}
                                </Link>
                            ) : (
                                <Typography key={crumb.text}>
                                    {crumb.text}
                                </Typography>
                            )
                        )}
                    </Breadcrumbs>
                </Grid>
            )}
            <Grid item>
                <Grid
                    container
                    justifyContent="space-between"
                    alignItems="center"
                >
                    <Grid item>
                        <Typography variant="h1">{course.title}</Typography>
                    </Grid>
                    <Grid item>
                        <Menu
                            options={[
                                {
                                    label: VIEW_PAGE_MENU_ITEM,
                                    href: `/p/${course.pageId}`,
                                    type: "link",
                                    newTab: true,
                                },
                                {
                                    label: EDIT_PAGE_MENU_ITEM,
                                    href: `/dashboard/page/${course.pageId}/edit`,
                                    type: "link",
                                },
                            ]}
                            icon={<MoreVert />}
                        />
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
}

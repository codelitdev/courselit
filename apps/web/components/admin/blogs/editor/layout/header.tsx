import React, { useState } from "react";
import { Breadcrumbs, Grid, Typography } from "@mui/material";
import dynamic from "next/dynamic";
import useCourse from "../course-hook";
import { useRouter } from "next/router";
import { MenuItem, Menu2, Link } from "@courselit/components-library";
import {
    DELETE_PRODUCT_POPUP_HEADER,
    DELETE_PRODUCT_POPUP_TEXT,
    MENU_BLOG_VISIT,
    PRODUCT_TABLE_CONTEXT_MENU_DELETE_PRODUCT,
} from "../../../../../ui-config/strings";
import { MoreVert } from "@courselit/icons";
import { deleteProduct } from "../../helpers";
import { AppDispatch, AppState } from "@courselit/state-management";
import { connect } from "react-redux";
import { Address } from "@courselit/common-models";

const AppLoader = dynamic(() => import("../../../../app-loader"));

interface Breadcrumb {
    text: string;
    url: string;
}

interface BlogHeaderProps {
    breadcrumbs?: Breadcrumb[];
    id: string;
    address: Address;
    dispatch: AppDispatch;
}

function BlogHeader({ id, breadcrumbs, address, dispatch }: BlogHeaderProps) {
    const [deleteProductPopupOpened, setDeleteProductPopupOpened] =
        useState(false);
    const closeDeletePopup = () => setDeleteProductPopupOpened(false);

    const course = useCourse(id);
    const router = useRouter();

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
                            ),
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
                        <Menu2 icon={<MoreVert />} variant="soft">
                            <MenuItem>
                                <Link
                                    href={`/blog/${course.slug}/${course.courseId}`}
                                >
                                    {MENU_BLOG_VISIT}
                                </Link>
                            </MenuItem>
                            <MenuItem
                                component="dialog"
                                title={
                                    PRODUCT_TABLE_CONTEXT_MENU_DELETE_PRODUCT
                                }
                                triggerChildren={DELETE_PRODUCT_POPUP_HEADER}
                                description={DELETE_PRODUCT_POPUP_TEXT}
                                onClick={() =>
                                    deleteProduct({
                                        id: course!.id as string,
                                        setDeleteProductPopupOpened,
                                        backend: address.backend,
                                        dispatch,
                                        onDeleteComplete: () => {
                                            router.replace(`/dashboard/blogs`);
                                        },
                                    })
                                }
                            ></MenuItem>
                        </Menu2>
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(BlogHeader);

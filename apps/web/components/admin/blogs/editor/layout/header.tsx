import React, { useState } from "react";
import { Breadcrumbs, Grid, Typography } from "@mui/material";
import dynamic from "next/dynamic";
import Link from "next/link";
import useCourse from "../course-hook";
import { useRouter } from "next/router";
import { Dialog, Menu } from "@courselit/components-library";
import {
    DELETE_PRODUCT_POPUP_HEADER,
    DELETE_PRODUCT_POPUP_TEXT,
    MENU_BLOG_VISIT,
    POPUP_CANCEL_ACTION,
    POPUP_OK_ACTION,
    PRODUCT_TABLE_CONTEXT_MENU_DELETE_PRODUCT,
} from "../../../../../ui-config/strings";
import { MoreVert } from "@mui/icons-material";
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
                                    label: MENU_BLOG_VISIT,
                                    type: "link",
                                    href: `/blog/${course.slug}/${course.courseId}`,
                                    newTab: true,
                                },
                                {
                                    label: PRODUCT_TABLE_CONTEXT_MENU_DELETE_PRODUCT,
                                    type: "button",
                                    onClick: () =>
                                        setDeleteProductPopupOpened(true),
                                },
                            ]}
                            icon={<MoreVert />}
                        />
                        {/* <IconButton
                            onClick={handleClick}
                            size="small"
                            sx={{ ml: 2 }}
                            aria-controls={open ? "product-menu" : undefined}
                            aria-haspopup="true"
                            aria-expanded={open ? "true" : undefined}
                        >
                            <MoreVert />
                        </IconButton>
                        <Menu
                            id="basic-menu"
                            anchorEl={anchorEl}
                            open={open}
                            onClose={handleClose}
                            MenuListProps={{
                                "aria-labelledby": "basic-button",
                            }}
                        >
                            <MenuItem
                                onClick={() =>
                                    router.push(
                                        `/dashboard/page/${course.pageId}/edit`
                                    )
                                }
                            >
                                {EDIT_PAGE_MENU_ITEM}
                            </MenuItem>
                        </Menu> */}
                    </Grid>
                </Grid>
            </Grid>
            <Dialog
                onOpen={deleteProductPopupOpened}
                onClose={closeDeletePopup}
                title={DELETE_PRODUCT_POPUP_HEADER}
                actions={[
                    {
                        name: POPUP_CANCEL_ACTION,
                        callback: closeDeletePopup,
                    },
                    {
                        name: POPUP_OK_ACTION,
                        callback: () =>
                            deleteProduct({
                                id: course!.id as string,
                                setDeleteProductPopupOpened,
                                backend: address.backend,
                                dispatch,
                                onDeleteComplete: () => {
                                    router.replace(`/dashboard/blogs`);
                                },
                            }),
                    },
                ]}
            >
                <Typography variant="subtitle1">
                    {DELETE_PRODUCT_POPUP_TEXT}
                </Typography>
            </Dialog>
        </Grid>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(BlogHeader);

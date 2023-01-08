import React, { useState } from "react";
import { AppMessage, Course } from "@courselit/common-models";
import {
    Grid,
    TableCell,
    TableRow,
    Link as MuiLink,
    Typography,
    Chip,
} from "@mui/material";
import Link from "next/link";
import {
    APP_MESSAGE_COURSE_DELETED,
    DELETE_PRODUCT_POPUP_HEADER,
    DELETE_PRODUCT_POPUP_TEXT,
    POPUP_CANCEL_ACTION,
    POPUP_OK_ACTION,
    PRODUCT_STATUS_DRAFT,
    PRODUCT_STATUS_PUBLISHED,
    PRODUCT_TABLE_CONTEXT_MENU_DELETE_PRODUCT,
    PRODUCT_TABLE_CONTEXT_MENU_EDIT_PAGE,
    VIEW_PAGE_MENU_ITEM,
} from "../../../ui-config/strings";
import { MoreVert } from "@mui/icons-material";
import type { AppDispatch, AppState } from "@courselit/state-management";
import type { SiteInfo, Address } from "@courselit/common-models";
import { connect } from "react-redux";
import { FetchBuilder, formatCurrency } from "@courselit/utils";
import { Dialog, Image, Menu } from "@courselit/components-library";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";

function Product({
    details,
    siteinfo,
    address,
    dispatch,
    position,
    onDelete,
}: {
    details: Course & {
        published: boolean;
        sales: number;
        customers: number;
        pageId: string;
    };
    siteinfo: SiteInfo;
    address: Address;
    dispatch: AppDispatch;
    position: number;
    onDelete: (position: number) => void;
}) {
    const product = details;

    const [deleteProductPopupOpened, setDeleteProductPopupOpened] =
        useState(false);

    const closeDeletePopup = () => setDeleteProductPopupOpened(false);

    const deleteProduct = async () => {
        setDeleteProductPopupOpened(false);
        const query = `
    mutation {
      result: deleteCourse(id: "${product.id}")
    }
    `;

        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            dispatch(networkAction(true));
            const response = await fetch.exec();

            if (response.result) {
                onDelete(position);
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
            dispatch(setAppMessage(new AppMessage(APP_MESSAGE_COURSE_DELETED)));
        }
    };

    return (
        <TableRow key={product.courseId}>
            <TableCell>
                <Link href={`/dashboard/product/${product.courseId}/reports`}>
                    <Grid
                        container
                        spacing={1}
                        alignItems="center"
                        component="a"
                    >
                        <Grid item>
                            <Image
                                src={
                                    product.featuredImage &&
                                    product.featuredImage.thumbnail
                                }
                                height={64}
                                width={64}
                            />
                        </Grid>
                        <Grid item>
                            <Grid
                                container
                                direction="column"
                                sx={{
                                    cursor: "pointer",
                                }}
                            >
                                <MuiLink>
                                    <Grid item>
                                        <Typography variant="subtitle1">
                                            {product.title}
                                        </Typography>
                                    </Grid>
                                </MuiLink>
                                <Grid item>
                                    <Typography
                                        color="textSecondary"
                                        variant="body2"
                                    >
                                        {product.type}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                </Link>
            </TableCell>
            <TableCell align="right">
                <Chip
                    label={
                        product.published
                            ? PRODUCT_STATUS_PUBLISHED
                            : PRODUCT_STATUS_DRAFT
                    }
                    color={product.published ? "primary" : "default"}
                />
            </TableCell>
            <TableCell align="right">{product.customers}</TableCell>
            <TableCell align="right">
                {formatCurrency(product.sales, siteinfo.currencyISOCode)}
            </TableCell>
            <TableCell align="right">
                <Menu
                    options={[
                        {
                            label: VIEW_PAGE_MENU_ITEM,
                            type: "link",
                            href: `/p/${product.pageId}`,
                            newTab: true,
                        },
                        {
                            label: PRODUCT_TABLE_CONTEXT_MENU_EDIT_PAGE,
                            type: "link",
                            href: `/dashboard/page/${product.pageId}/edit`,
                        },
                        {
                            label: PRODUCT_TABLE_CONTEXT_MENU_DELETE_PRODUCT,
                            type: "button",
                            onClick: () => setDeleteProductPopupOpened(true),
                        },
                    ]}
                    icon={<MoreVert />}
                />
            </TableCell>
            <Dialog
                onOpen={deleteProductPopupOpened}
                onClose={closeDeletePopup}
                title={DELETE_PRODUCT_POPUP_HEADER}
                actions={[
                    {
                        name: POPUP_CANCEL_ACTION,
                        callback: closeDeletePopup,
                    },
                    { name: POPUP_OK_ACTION, callback: deleteProduct },
                ]}
            >
                <Typography variant="subtitle1">
                    {DELETE_PRODUCT_POPUP_TEXT}
                </Typography>
            </Dialog>
        </TableRow>
    );
}

const mapStateToProps = (state: AppState) => ({
    siteinfo: state.siteinfo,
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(Product);

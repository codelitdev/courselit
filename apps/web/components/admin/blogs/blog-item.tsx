import React, { useState } from "react";
import { Course } from "@courselit/common-models";
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
    DELETE_PRODUCT_POPUP_HEADER,
    DELETE_PRODUCT_POPUP_TEXT,
    POPUP_CANCEL_ACTION,
    POPUP_OK_ACTION,
    PRODUCT_STATUS_DRAFT,
    PRODUCT_STATUS_PUBLISHED,
    PRODUCT_TABLE_CONTEXT_MENU_DELETE_PRODUCT,
} from "../../../ui-config/strings";
import { MoreVert } from "@courselit/icons";
import type { AppDispatch, AppState } from "@courselit/state-management";
import type { SiteInfo, Address } from "@courselit/common-models";
import { connect } from "react-redux";
import { Dialog, Image, Menu2, MenuItem } from "@courselit/components-library";
import { deleteProduct } from "./helpers";

function BlogItem({
    details,
    address,
    dispatch,
    position,
    onDelete,
}: {
    details: Course & {
        published: boolean;
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

    // const deleteProduct = async () => {
    //     setDeleteProductPopupOpened(false);
    //     const query = `
    // mutation {
    //   result: deleteCourse(id: "${product.id}")
    // }
    // `;

    //     const fetch = new FetchBuilder()
    //         .setUrl(`${address.backend}/api/graph`)
    //         .setPayload(query)
    //         .setIsGraphQLEndpoint(true)
    //         .build();

    //     try {
    //         dispatch(networkAction(true));
    //         const response = await fetch.exec();

    //         if (response.result) {
    //             onDelete(position);
    //         }
    //     } catch (err: any) {
    //         dispatch(setAppMessage(new AppMessage(err.message)));
    //     } finally {
    //         dispatch(networkAction(false));
    //         dispatch(setAppMessage(new AppMessage(APP_MESSAGE_COURSE_DELETED)));
    //     }
    // };

    return (
        <TableRow key={product.courseId}>
            <TableCell>
                <Link href={`/dashboard/blog/${product.courseId}/details`}>
                    <Grid container spacing={1} alignItems="center">
                        <Grid item>
                            <Image
                                src={
                                    product.featuredImage?.thumbnail
                                }
                                height={64}
                                width={64}
                                alt={product.featuredImage?.caption}
                            />
                        </Grid>
                        <Grid item>
                            <Grid container direction="column">
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
            <TableCell align="right">
                <Menu2
                    icon={<MoreVert />}
                    variant="soft">
                    <MenuItem 
                        component="dialog"
                        title={DELETE_PRODUCT_POPUP_HEADER}
                        triggerChildren={PRODUCT_TABLE_CONTEXT_MENU_DELETE_PRODUCT}
                        onClick={() => 
                            deleteProduct({
                                id: product.id,
                                setDeleteProductPopupOpened,
                                backend: address.backend,
                                dispatch,
                                onDeleteComplete: () => {
                                    onDelete(position);
                                },
                            })
                        }>
                    </MenuItem>
                </Menu2>
            </TableCell>
        </TableRow>
    );
}

const mapStateToProps = (state: AppState) => ({
    siteinfo: state.siteinfo,
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(BlogItem);

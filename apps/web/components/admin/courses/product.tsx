import React, { useState } from "react";
import { AppMessage, Course } from "@courselit/common-models";
import {
    Grid,
    TableCell,
    TableRow,
    Link as MuiLink,
    Typography,
    Chip,
    IconButton,
    MenuItem,
    Menu,
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
} from "../../../ui-config/strings";
import { MoreVert } from "@mui/icons-material";
import type { AppDispatch, AppState } from "@courselit/state-management";
import type { SiteInfo, Address } from "@courselit/common-models";
import { connect } from "react-redux";
import { FetchBuilder, formatCurrency } from "@courselit/utils";
import { Image } from "@courselit/components-library";
import dynamic from "next/dynamic";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";

const AppDialog = dynamic(() => import("../../public/app-dialog"));

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
    };
    siteinfo: SiteInfo;
    address: Address;
    dispatch: AppDispatch;
    position: number;
    onDelete: (position: number) => void;
}) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [deleteProductPopupOpened, setDeleteProductPopupOpened] =
        useState(false);
    const open = Boolean(anchorEl);
    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };

    const product = details;

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
                <Link href={`/dashboard/product/${product.courseId}/content`}>
                    <Grid container spacing={1} alignItems="center">
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
                {formatCurrency(product.sales, siteinfo.currencyISOCode)}
            </TableCell>
            <TableCell align="right">{product.customers}</TableCell>
            <TableCell align="right">
                <IconButton
                    onClick={handleClick}
                    size="small"
                    sx={{ ml: 2 }}
                    aria-controls={open ? "account-menu" : undefined}
                    aria-haspopup="true"
                    aria-expanded={open ? "true" : undefined}
                >
                    <MoreVert />
                </IconButton>
                <Menu
                    anchorEl={anchorEl}
                    id="product-menu"
                    open={open}
                    onClose={handleClose}
                    onClick={handleClose}
                    transformOrigin={{ horizontal: "right", vertical: "top" }}
                    anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                >
                    <MenuItem
                        onClick={(e) => setDeleteProductPopupOpened(true)}
                    >
                        {PRODUCT_TABLE_CONTEXT_MENU_DELETE_PRODUCT}
                    </MenuItem>
                </Menu>
            </TableCell>
            <AppDialog
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
            </AppDialog>
        </TableRow>
    );
}

const mapStateToProps = (state: AppState) => ({
    siteinfo: state.siteinfo,
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(Product);

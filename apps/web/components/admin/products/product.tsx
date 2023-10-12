import React from "react";
import { AppMessage, Course } from "@courselit/common-models";
import {
    APP_MESSAGE_COURSE_DELETED,
    DELETE_PRODUCT_POPUP_HEADER,
    DELETE_PRODUCT_POPUP_TEXT,
    PRODUCT_STATUS_DRAFT,
    PRODUCT_STATUS_PUBLISHED,
    PRODUCT_TABLE_CONTEXT_MENU_DELETE_PRODUCT,
    PRODUCT_TABLE_CONTEXT_MENU_EDIT_PAGE,
    VIEW_PAGE_MENU_ITEM,
} from "../../../ui-config/strings";
import { MoreVert } from "@courselit/icons";
import type { AppDispatch, AppState } from "@courselit/state-management";
import type { SiteInfo, Address } from "@courselit/common-models";
import { connect } from "react-redux";
import { capitalize, FetchBuilder, formatCurrency } from "@courselit/utils";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";
import {
    Menu2,
    MenuItem,
    Link,
    Chip,
    TableRow,
} from "@courselit/components-library";

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

    const deleteProduct = async () => {
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
            <td className="py-4">
                <Link href={`/dashboard/product/${product.courseId}/reports`}>
                    <p>{product.title}</p>
                </Link>
            </td>
            <td>
                <p>{capitalize(product.type)}</p>
            </td>
            <td align="right">
                <Chip
                    className={
                        product.published
                            ? "!bg-black text-white !border-black"
                            : ""
                    }
                >
                    {product.published
                        ? PRODUCT_STATUS_PUBLISHED
                        : PRODUCT_STATUS_DRAFT}
                </Chip>
            </td>
            <td align="right">{product.customers}</td>
            <td align="right">
                {formatCurrency(product.sales, siteinfo.currencyISOCode)}
            </td>
            <td align="right">
                <Menu2 icon={<MoreVert />} variant="soft">
                    <MenuItem>
                        <Link
                            href={`/p/${product.pageId}`}
                            className="flex w-full"
                        >
                            {VIEW_PAGE_MENU_ITEM}
                        </Link>
                    </MenuItem>
                    <MenuItem>
                        <Link
                            href={`/dashboard/page/${product.pageId}/edit?redirectTo=/dashboard/products`}
                            className="flex w-full"
                        >
                            {PRODUCT_TABLE_CONTEXT_MENU_EDIT_PAGE}
                        </Link>
                    </MenuItem>
                    <MenuItem
                        component="dialog"
                        title={PRODUCT_TABLE_CONTEXT_MENU_DELETE_PRODUCT}
                        triggerChildren={DELETE_PRODUCT_POPUP_HEADER}
                        description={DELETE_PRODUCT_POPUP_TEXT}
                        onClick={deleteProduct}
                    ></MenuItem>
                </Menu2>
            </td>
        </TableRow>
    );
}

const mapStateToProps = (state: AppState) => ({
    siteinfo: state.siteinfo,
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(Product);

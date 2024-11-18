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
    PRODUCT_TABLE_CONTEXT_MENU_INVITE_A_CUSTOMER,
    VIEW_PAGE_MENU_ITEM,
} from "../../../ui-config/strings";
import { MoreVert } from "@courselit/icons";
import type { AppDispatch } from "@courselit/state-management";
import type { SiteInfo, Address } from "@courselit/common-models";
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
import { usePathname } from "next/navigation";

export type CourseDetails = Course & {
    published: boolean;
    sales: number;
    customers: number;
    pageId: string;
};

export default function Product({
    details,
    siteinfo,
    address,
    dispatch,
    position,
    onDelete,
    prefix,
}: {
    details: CourseDetails;
    siteinfo: SiteInfo;
    address: Address;
    dispatch?: AppDispatch;
    position: number;
    onDelete: (position: number) => void;
    prefix: string;
}) {
    const product = details;
    const path = usePathname();

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
            dispatch && dispatch(networkAction(true));
            const response = await fetch.exec();

            if (response.result) {
                onDelete(position);
            }
        } catch (err: any) {
            dispatch && dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch && dispatch(networkAction(false));
            dispatch &&
                dispatch(
                    setAppMessage(new AppMessage(APP_MESSAGE_COURSE_DELETED)),
                );
        }
    };

    return (
        <TableRow key={product.courseId}>
            <td className="py-4">
                <Link
                    href={`${prefix}/product/${product.courseId}${
                        prefix === "/dashboard" ? "/reports" : ""
                    }`}
                >
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
                            href={`/dashboard/page/${product.pageId}/edit?redirectTo=${prefix}/products`}
                            className="flex w-full"
                        >
                            {PRODUCT_TABLE_CONTEXT_MENU_EDIT_PAGE}
                        </Link>
                    </MenuItem>
                    <div className="flex w-full border-b border-slate-200 my-1"></div>
                    <MenuItem>
                        <Link
                            href={`${prefix}/product/${product.courseId}/customer/new`}
                        >
                            {PRODUCT_TABLE_CONTEXT_MENU_INVITE_A_CUSTOMER}
                        </Link>
                    </MenuItem>
                    <div className="flex w-full border-b border-slate-200 my-1"></div>
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

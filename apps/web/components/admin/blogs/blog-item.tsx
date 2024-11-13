import React from "react";
import { Course } from "@courselit/common-models";
import {
    DELETE_PRODUCT_POPUP_HEADER,
    DELETE_PRODUCT_POPUP_TEXT,
    PRODUCT_STATUS_DRAFT,
    PRODUCT_STATUS_PUBLISHED,
    PRODUCT_TABLE_CONTEXT_MENU_DELETE_PRODUCT,
} from "../../../ui-config/strings";
import { MoreVert } from "@courselit/icons";
import type { AppDispatch } from "@courselit/state-management";
import type { SiteInfo, Address } from "@courselit/common-models";
// import { connect } from "react-redux";
import { Chip, Menu2, MenuItem, Link } from "@courselit/components-library";
import { deleteProduct } from "./helpers";
import { TableRow } from "@courselit/components-library";
import { usePathname } from "next/navigation";

export default function BlogItem({
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
    dispatch?: AppDispatch;
    position: number;
    onDelete: (position: number) => void;
}) {
    const product = details;
    const path = usePathname();
    const pathPrefix = path?.startsWith("/dashboard2")
        ? "/dashboard2"
        : "/dashboard";

    return (
        <TableRow key={product.courseId}>
            <td className="py-4">
                <Link href={`${pathPrefix}/blog/${product.courseId}/details`}>
                    <p>{product.title}</p>
                </Link>
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
            <td align="right">
                <Menu2 icon={<MoreVert />} variant="soft">
                    <MenuItem
                        component="dialog"
                        title={DELETE_PRODUCT_POPUP_HEADER}
                        triggerChildren={
                            PRODUCT_TABLE_CONTEXT_MENU_DELETE_PRODUCT
                        }
                        description={DELETE_PRODUCT_POPUP_TEXT}
                        onClick={() =>
                            deleteProduct({
                                id: product.id,
                                backend: address.backend,
                                dispatch,
                                onDeleteComplete: () => {
                                    onDelete(position);
                                },
                            })
                        }
                    ></MenuItem>
                </Menu2>
            </td>
        </TableRow>
    );
}

// const mapStateToProps = (state: AppState) => ({
//     siteinfo: state.siteinfo,
//     address: state.address,
// });

// const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

// export default connect(mapStateToProps, mapDispatchToProps)(BlogItem);

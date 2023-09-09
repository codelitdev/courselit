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
import type { AppDispatch, AppState } from "@courselit/state-management";
import type { SiteInfo, Address } from "@courselit/common-models";
import { connect } from "react-redux";
import { Chip, Image, Menu2, MenuItem, Link } from "@courselit/components-library";
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

    return (
        <tr key={product.courseId} className="hover:!bg-slate-100">
            <td>
                <Link href={`/dashboard/blog/${product.courseId}/details`}>
                        <div className="flex items-center gap-2">
                            <Image
                                src={product.featuredImage?.thumbnail}
                                height={64}
                                width={64}
                                alt={product.featuredImage?.caption}
                            />
                            <div className="flex flex-col">
                                <p>{product.title}</p>
                                <p>{product.type}</p>
                            </div>
                    </div>
                </Link>
            </td>
            <td align="right">
                <Chip
                    className={
                        product.published ? "!bg-black" : ""
                    }
                >
                    {
                        product.published
                            ? PRODUCT_STATUS_PUBLISHED
                            : PRODUCT_STATUS_DRAFT
                    }</Chip>
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
        </tr>
    );
}

const mapStateToProps = (state: AppState) => ({
    siteinfo: state.siteinfo,
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(BlogItem);

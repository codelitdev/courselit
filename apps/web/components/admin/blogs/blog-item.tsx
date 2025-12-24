import React from "react";
import { Course } from "@courselit/common-models";
import {
    DELETE_PRODUCT_POPUP_HEADER,
    DELETE_PRODUCT_POPUP_TEXT,
    PRODUCT_STATUS_DRAFT,
    PRODUCT_STATUS_PUBLISHED,
    PRODUCT_TABLE_CONTEXT_MENU_DELETE_PRODUCT,
} from "@/ui-config/strings";
import { MoreVert } from "@courselit/icons";
import type { SiteInfo } from "@courselit/common-models";
import {
    Chip,
    Menu2,
    MenuItem,
    Link,
    useToast,
} from "@courselit/components-library";
import { deleteProduct } from "./helpers";
import { TableRow } from "@courselit/components-library";
import { AddressContext } from "@components/contexts";
import { useContext } from "react";

export default function BlogItem({
    details,
    position,
    onDelete,
}: {
    details: Course & {
        published: boolean;
    };
    siteinfo: SiteInfo;
    position: number;
    onDelete: (position: number) => void;
}) {
    const product = details;
    const address = useContext(AddressContext);
    const { toast } = useToast();

    return (
        <TableRow key={product.courseId}>
            <td className="py-4">
                <Link href={`/dashboard/blog/${product.courseId}`}>
                    <p>{product.title}</p>
                </Link>
            </td>
            <td align="right">
                <Chip
                    className={
                        product.published
                            ? "bg-black! text-white border-black!"
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
                                id: product.courseId,
                                backend: address.backend,
                                onDeleteComplete: () => {
                                    onDelete(position);
                                },
                                toast,
                            })
                        }
                    ></MenuItem>
                </Menu2>
            </td>
        </TableRow>
    );
}

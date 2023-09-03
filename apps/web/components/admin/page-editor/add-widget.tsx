import React from "react";
import {
    PageTypeProduct,
    PageTypeSite,
    PageTypeBlog,
} from "@courselit/common-models";
import { IconButton } from "@courselit/components-library";
import { Cross as Close } from "@courselit/icons";
import { EDIT_PAGE_ADD_WIDGET_TITLE } from "../../../ui-config/strings";
import widgets from "../../../ui-config/widgets";

interface WidgetsListProps {
    pageType: PageTypeProduct | PageTypeSite | PageTypeBlog;
    onSelection: (...args: any[]) => void;
    onClose: (...args: any[]) => void;
}

function AddWidget({ pageType, onSelection, onClose }: WidgetsListProps) {
    return (
        <ul>
            <li className="flex items-center px-2 py-3 justify-between">
                <h2 className="text-lg font-medium">
                    {EDIT_PAGE_ADD_WIDGET_TITLE}
                </h2>
                <IconButton onClick={onClose} variant="soft">
                    <Close fontSize="small" />
                </IconButton>
            </li>
            {Object.keys(widgets)
                .filter((widget) => !["header", "footer"].includes(widget))
                .map((item, index) =>
                    widgets[item].metadata.compatibleWith.includes(pageType) ? (
                        <li
                            className="flex items-center px-2 py-3 hover:!bg-slate-100 cursor-pointer justify-between"
                            key={index}
                            onClick={(e) => onSelection(item)}
                        >
                            {widgets[item].metadata.displayName}
                        </li>
                    ) : (
                        <></>
                    ),
                )}
        </ul>
    );
}

export default AddWidget;

import React from "react";
import {
    PageTypeProduct,
    PageTypeSite,
    PageTypeBlog,
    PageTypeCommunity,
} from "@courselit/common-models";
import widgets from "../../../ui-config/widgets";

interface WidgetsListProps {
    pageType: PageTypeProduct | PageTypeSite | PageTypeBlog | PageTypeCommunity;
    onSelection: (...args: any[]) => void;
    onClose: (...args: any[]) => void;
}

function AddWidget({ pageType, onSelection, onClose }: WidgetsListProps) {
    return (
        <ul>
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

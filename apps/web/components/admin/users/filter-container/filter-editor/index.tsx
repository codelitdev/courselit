import React, { useState } from "react";
import { ScrollArea } from "@courselit/components-library";
import { USER_FILTER_DROPDOWN_LABEL } from "@ui-config/strings";
import PopoverHeader from "../popover-header";
import dynamic from "next/dynamic";
import categoriesMap from "./categories-map";
const SignedUpFilterEditor = dynamic(() => import("./signed-up"));
const LastActiveFilterEditor = dynamic(() => import("./last-active"));
const PermissionFilterEditor = dynamic(() => import("./permission"));
const ProductFilterEditor = dynamic(() => import("./product"));
const EmailFilterEditor = dynamic(() => import("./email"));
const SubscriptionFilterEditor = dynamic(() => import("./subscription"));
const TaggedFilterEditor = dynamic(() => import("./tagged"));
import { Address, UserFilter as Filter } from "@courselit/common-models";
import { AppDispatch } from "@courselit/state-management";

interface FilterEditorProps {
    dismissPopover: (filter: Filter) => void;
    address: Address;
    dispatch?: AppDispatch;
}
export default function FilterEditor({
    dismissPopover,
    address,
    dispatch,
}: FilterEditorProps) {
    const [activeCategory, setActiveCategory] = useState<Filter["name"]>();

    const changeFilter = (
        value: Pick<Filter, "condition" | "value" | "valueLabel"> | undefined,
    ) => {
        dismissPopover(value ? { name: activeCategory, ...value } : undefined);
    };

    return (
        <div className="">
            {!activeCategory && (
                <ScrollArea>
                    <div className="p-2">
                        <PopoverHeader>
                            {USER_FILTER_DROPDOWN_LABEL}
                        </PopoverHeader>
                        <ul className="mt-2">
                            {Object.keys(categoriesMap).map((category) => (
                                <li
                                    key={category}
                                    className="cursor-pointer text-medium leading-none rounded-[3px] flex items-center h-8 relative select-none outline-none data-[disabled]:text-slate-200 data-[disabled]:pointer-events-none hover:bg-slate-200"
                                    onClick={() => setActiveCategory(category)}
                                >
                                    {categoriesMap[category]}
                                </li>
                            ))}
                        </ul>
                    </div>
                </ScrollArea>
            )}
            {activeCategory && activeCategory === "email" && (
                <EmailFilterEditor onApply={changeFilter} />
            )}
            {activeCategory && activeCategory === "product" && (
                <ProductFilterEditor
                    onApply={changeFilter}
                    address={address}
                    dispatch={dispatch}
                />
            )}
            {activeCategory && activeCategory === "lastActive" && (
                <LastActiveFilterEditor onApply={changeFilter} />
            )}
            {activeCategory && activeCategory === "signedUp" && (
                <SignedUpFilterEditor onApply={changeFilter} />
            )}
            {activeCategory && activeCategory === "subscription" && (
                <SubscriptionFilterEditor onApply={changeFilter} />
            )}
            {activeCategory && activeCategory === "permission" && (
                <PermissionFilterEditor onApply={changeFilter} />
            )}
            {activeCategory && activeCategory === "tag" && (
                <TaggedFilterEditor
                    onApply={changeFilter}
                    address={address}
                    dispatch={dispatch}
                />
            )}
        </div>
    );
}

import React, { useState } from "react";
import { USER_FILTER_DROPDOWN_LABEL } from "@ui-config/strings";
import dynamic from "next/dynamic";
import categoriesMap from "./categories-map";
const SignedUpFilterEditor = dynamic(() => import("./signed-up"));
const LastActiveFilterEditor = dynamic(() => import("./last-active"));
const PermissionFilterEditor = dynamic(() => import("./permission"));
const ProductFilterEditor = dynamic(() => import("./product"));
const CommunitiesFilterEditor = dynamic(() => import("./community"));
const EmailFilterEditor = dynamic(() => import("./email"));
const SubscriptionFilterEditor = dynamic(() => import("./subscription"));
const TaggedFilterEditor = dynamic(() => import("./tagged"));
import {
    Address,
    UserFilter as Filter,
    UserFilterType,
} from "@courselit/common-models";
import {
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
} from "@components/ui/dropdown-menu";

interface FilterEditorProps {
    dismissPopover: (filter?: Filter) => void;
    address: Address;
}
export default function FilterEditor({
    dismissPopover,
    address,
}: FilterEditorProps) {
    const [activeCategory, setActiveCategory] = useState<Filter["name"]>();

    const changeFilter = (
        value: Pick<Filter, "condition" | "value" | "valueLabel"> | undefined,
    ) => {
        if (value) {
            dismissPopover({
                name: activeCategory as UserFilterType,
                ...value,
            });
        } else {
            setActiveCategory(undefined);
        }
    };

    return (
        <DropdownMenuContent className="w-72">
            {!activeCategory && (
                <>
                    <DropdownMenuLabel>
                        {USER_FILTER_DROPDOWN_LABEL}
                    </DropdownMenuLabel>
                    {Object.keys(categoriesMap).map(
                        (category: UserFilterType) => (
                            <DropdownMenuItem
                                key={category}
                                onSelect={(e) => {
                                    e.preventDefault();
                                    setActiveCategory(category);
                                }}
                            >
                                {categoriesMap[category]}
                            </DropdownMenuItem>
                        ),
                    )}
                </>
            )}
            {activeCategory && activeCategory === "email" && (
                <EmailFilterEditor onApply={changeFilter} />
            )}
            {activeCategory && activeCategory === "product" && (
                <ProductFilterEditor onApply={changeFilter} address={address} />
            )}
            {activeCategory && activeCategory === "community" && (
                <CommunitiesFilterEditor
                    onApply={changeFilter}
                    address={address}
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
                <TaggedFilterEditor onApply={changeFilter} address={address} />
            )}
        </DropdownMenuContent>
    );
}

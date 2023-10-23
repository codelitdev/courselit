import { ScrollArea } from "@courselit/components-library";
import {
    Form,
    FormField,
    Select,
    Button,
    FormSubmit,
} from "@courselit/components-library";
import React, { useState, FormEvent } from "react";
import {
    POPUP_CANCEL_ACTION,
    USER_FILTER_APPLY_BTN,
    USER_FILTER_CATEGORY_EMAIL,
    USER_FILTER_CATEGORY_LAST_ACTIVE,
    USER_FILTER_CATEGORY_PERMISSION,
    USER_FILTER_CATEGORY_PRODUCT,
    USER_FILTER_CATEGORY_SIGNED_UP,
    USER_FILTER_CATEGORY_SUBSCRIPTION,
    USER_FILTER_CATEGORY_TAGGED,
    USER_FILTER_DROPDOWN_LABEL,
    USER_FILTER_EMAIL_CONTAINS,
    USER_FILTER_EMAIL_IS_EXACTLY,
    USER_FILTER_EMAIL_NOT_CONTAINS,
} from "../../../ui-config/strings";
import Filter from "../../../ui-models/filter";
import PopoverHeader from "./popover-header";

function EmailFilterEditor({ onApply }: { onApply: (...args: any[]) => any }) {
    const [condition, setCondition] = useState(USER_FILTER_EMAIL_IS_EXACTLY);
    const [value, setValue] = useState("");

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (value) {
            onApply({ condition, value });
        } else {
            onApply();
        }
    };

    return (
        <Form
            className="flex flex-col gap-2 p-2 max-w-[180px]"
            onSubmit={onSubmit}
        >
            <PopoverHeader>{USER_FILTER_CATEGORY_EMAIL}</PopoverHeader>
            <Select
                value={condition}
                onChange={setCondition}
                title=""
                options={[
                    {
                        label: USER_FILTER_EMAIL_IS_EXACTLY,
                        value: USER_FILTER_EMAIL_IS_EXACTLY,
                    },
                    {
                        label: USER_FILTER_EMAIL_CONTAINS,
                        value: USER_FILTER_EMAIL_CONTAINS,
                    },
                    {
                        label: USER_FILTER_EMAIL_NOT_CONTAINS,
                        value: USER_FILTER_EMAIL_NOT_CONTAINS,
                    },
                ]}
            />
            <FormField
                name="value"
                value={value}
                label=""
                onChange={(event: FormEvent) => setValue(event.target.value)}
            />
            <div className="flex justify-between">
                <Button
                    name="cancel"
                    variant="soft"
                    onClick={(e: FormEvent) => {
                        e.preventDefault();
                        onApply();
                    }}
                >
                    {POPUP_CANCEL_ACTION}
                </Button>
                <FormSubmit text={USER_FILTER_APPLY_BTN} />
            </div>
        </Form>
    );
}

interface FilterEditorProps {
    dismissPopover: (filter: Filter) => void;
}
export default function FilterEditor({ dismissPopover }: FilterEditorProps) {
    const [activeCategory, setActiveCategory] = useState("");
    const categories = [
        { label: USER_FILTER_CATEGORY_EMAIL, id: "email" },
        { label: USER_FILTER_CATEGORY_PRODUCT, id: "product" },
        { label: USER_FILTER_CATEGORY_LAST_ACTIVE, id: "last_active" },
        { label: USER_FILTER_CATEGORY_SIGNED_UP, id: "signed_up" },
        { label: USER_FILTER_CATEGORY_SUBSCRIPTION, id: "subscription" },
        { label: USER_FILTER_CATEGORY_TAGGED, id: "tagged" },
        { label: USER_FILTER_CATEGORY_PERMISSION, id: "permission" },
    ];

    const changeFilter = (
        value: Pick<Filter, "condition" | "value"> | undefined,
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
                            {categories.map((category) => (
                                <li
                                    key={category.id}
                                    className="cursor-pointer text-medium leading-none rounded-[3px] flex items-center h-8 relative select-none outline-none data-[disabled]:text-slate-200 data-[disabled]:pointer-events-none hover:bg-slate-200"
                                    onClick={() =>
                                        setActiveCategory(category.id)
                                    }
                                >
                                    {category.label}
                                </li>
                            ))}
                        </ul>
                    </div>
                </ScrollArea>
            )}
            {activeCategory && activeCategory === "email" && (
                <EmailFilterEditor onApply={changeFilter} />
            )}
        </div>
    );
}

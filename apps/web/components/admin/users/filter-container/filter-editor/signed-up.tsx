import React, { FormEvent, useState } from "react";
import {
    Button,
    Form,
    FormField,
    FormSubmit,
    Select,
} from "@courselit/components-library";
import {
    POPUP_CANCEL_ACTION,
    USER_FILTER_APPLY_BTN,
    USER_FILTER_CATEGORY_SIGNED_UP,
    USER_FILTER_DATE_RANGE_DROPDOWN_LABEL,
    USER_FILTER_LAST_ACTIVE_AFTER,
    USER_FILTER_SIGNED_UP_AFTER,
    USER_FILTER_SIGNED_UP_BEFORE,
    USER_FILTER_SIGNED_UP_ON,
} from "@ui-config/strings";
import PopoverHeader from "../popover-header";

interface SignedUpFilterEditorProps {
    onApply: (...args: any[]) => any;
}

export default function SignedUpFilterEditor({
    onApply,
}: SignedUpFilterEditorProps) {
    const [condition, setCondition] = useState(USER_FILTER_LAST_ACTIVE_AFTER);
    const [value, setValue] = useState("");

    const onSubmit = (e: any) => {
        e.preventDefault();
        const buttonName = e.nativeEvent.submitter.name;
        if (buttonName === "apply") {
            onApply({
                condition,
                value,
            });
        } else {
            onApply();
        }
    };

    return (
        <Form
            className="flex flex-col gap-2 p-2 max-w-[180px]"
            onSubmit={onSubmit}
        >
            <PopoverHeader>{USER_FILTER_CATEGORY_SIGNED_UP}</PopoverHeader>
            <Select
                value={condition}
                onChange={setCondition}
                title=""
                options={[
                    {
                        label: USER_FILTER_SIGNED_UP_AFTER,
                        value: USER_FILTER_SIGNED_UP_AFTER,
                    },
                    {
                        label: USER_FILTER_SIGNED_UP_BEFORE,
                        value: USER_FILTER_SIGNED_UP_BEFORE,
                    },
                    {
                        label: USER_FILTER_SIGNED_UP_ON,
                        value: USER_FILTER_SIGNED_UP_ON,
                    },
                ]}
            />
            <FormField
                type="date"
                label={USER_FILTER_DATE_RANGE_DROPDOWN_LABEL}
                value={value}
                onChange={(e: FormEvent) => setValue(e.target.value)}
            />
            <div className="flex justify-between">
                <FormSubmit
                    disabled={!value}
                    name="apply"
                    text={USER_FILTER_APPLY_BTN}
                />
                <Button name="cancel" variant="soft">
                    {POPUP_CANCEL_ACTION}
                </Button>
            </div>
        </Form>
    );
}

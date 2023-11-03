import React, { useState } from "react";
import {
    POPUP_CANCEL_ACTION,
    USER_FILTER_APPLY_BTN,
    USER_FILTER_CATEGORY_EMAIL,
    USER_FILTER_EMAIL_CONTAINS,
    USER_FILTER_EMAIL_IS_EXACTLY,
    USER_FILTER_EMAIL_NOT_CONTAINS,
} from "@ui-config/strings";
import {
    Button,
    Form,
    FormField,
    FormSubmit,
    Select,
} from "@courselit/components-library";
import PopoverHeader from "../popover-header";
import { FormEvent } from "react";

interface EmailFilterEditorProps {
    onApply: (...args: any[]) => any;
}

export default function EmailFilterEditor({ onApply }: EmailFilterEditorProps) {
    const [condition, setCondition] = useState(USER_FILTER_EMAIL_IS_EXACTLY);
    const [value, setValue] = useState("");

    const onSubmit = (e: any) => {
        e.preventDefault();
        const buttonName = e.nativeEvent.submitter.name;
        if (buttonName === "apply") {
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

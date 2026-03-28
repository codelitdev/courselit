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
    Form,
    FormField,
    FormSubmit,
    Select,
} from "@courselit/components-library";
import { FormEvent } from "react";
import { DropdownMenuLabel } from "@components/ui/dropdown-menu";
import { Button } from "@components/ui/button";

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
        <Form className="flex flex-col gap-2 p-2" onSubmit={onSubmit}>
            <DropdownMenuLabel>{USER_FILTER_CATEGORY_EMAIL}</DropdownMenuLabel>
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
                onChange={(event: FormEvent<HTMLInputElement>) => {
                    const target = event.target as HTMLInputElement;
                    setValue(target.value);
                }}
            />
            <div className="flex justify-between">
                <FormSubmit
                    disabled={!value}
                    name="apply"
                    text={USER_FILTER_APPLY_BTN}
                />
                <Button name="cancel" variant="secondary">
                    {POPUP_CANCEL_ACTION}
                </Button>
            </div>
        </Form>
    );
}

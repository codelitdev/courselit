import React, { useState } from "react";
import {
    Button,
    Form,
    FormSubmit,
    Select,
} from "@courselit/components-library";
import {
    POPUP_CANCEL_ACTION,
    USER_FILTER_APPLY_BTN,
    USER_FILTER_CATEGORY_PERMISSION,
    USER_FILTER_PERMISSION_DOES_NOT_HAVE,
    USER_FILTER_PERMISSION_DROPDOWN_LABEL,
    USER_FILTER_PERMISSION_HAS,
} from "@ui-config/strings";
import permissionToCaptionMap from "../../permissions-to-caption-map";
import PopoverHeader from "../popover-header";

interface PermissionFilterEditorProps {
    onApply: (...args: any[]) => any;
}

export default function PermissionFilterEditor({
    onApply,
}: PermissionFilterEditorProps) {
    const [condition, setCondition] = useState(USER_FILTER_PERMISSION_HAS);
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

    const options: { label: string; value: string; disabled?: boolean }[] =
        Object.keys(permissionToCaptionMap).map((permission) => ({
            label: permissionToCaptionMap[permission],
            value: permission,
        }));

    return (
        <Form
            className="flex flex-col gap-2 p-2 max-w-[180px]"
            onSubmit={onSubmit}
        >
            <PopoverHeader>{USER_FILTER_CATEGORY_PERMISSION}</PopoverHeader>
            <Select
                value={condition}
                onChange={setCondition}
                title=""
                options={[
                    {
                        label: USER_FILTER_PERMISSION_HAS,
                        value: USER_FILTER_PERMISSION_HAS,
                    },
                    {
                        label: USER_FILTER_PERMISSION_DOES_NOT_HAVE,
                        value: USER_FILTER_PERMISSION_DOES_NOT_HAVE,
                    },
                ]}
            />
            <Select
                options={options}
                value={value}
                title=""
                variant="without-label"
                onChange={setValue}
                placeholderMessage={USER_FILTER_PERMISSION_DROPDOWN_LABEL}
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

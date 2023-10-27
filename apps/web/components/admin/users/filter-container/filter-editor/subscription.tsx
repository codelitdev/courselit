import {
    Button,
    Form,
    FormSubmit,
    Select,
} from "@courselit/components-library";
import {
    POPUP_CANCEL_ACTION,
    USER_FILTER_APPLY_BTN,
    USER_FILTER_CATEGORY_SUBSCRIPTION,
    USER_FILTER_SUBSCRIPTION_NOT_SUBSCRIBED,
    USER_FILTER_SUBSCRIPTION_SUBSCRIBED,
} from "@ui-config/strings";
import { useState } from "react";
import PopoverHeader from "../popover-header";

interface SubscriptionFilterEditorProps {
    onApply: (...args: any[]) => any;
}

export default function SubscriptionFilterEditor({
    onApply,
}: SubscriptionFilterEditorProps) {
    const [condition, setCondition] = useState(
        USER_FILTER_SUBSCRIPTION_SUBSCRIBED,
    );

    const onSubmit = (e: any) => {
        e.preventDefault();
        const buttonName = e.nativeEvent.submitter.name;
        if (buttonName === "apply") {
            onApply({ condition, value: "dummy-value" });
        } else {
            onApply();
        }
    };

    return (
        <Form
            className="flex flex-col gap-2 p-2 max-w-[180px]"
            onSubmit={onSubmit}
        >
            <PopoverHeader>{USER_FILTER_CATEGORY_SUBSCRIPTION}</PopoverHeader>
            <Select
                value={condition}
                onChange={setCondition}
                title=""
                options={[
                    {
                        label: USER_FILTER_SUBSCRIPTION_SUBSCRIBED,
                        value: USER_FILTER_SUBSCRIPTION_SUBSCRIBED,
                    },
                    {
                        label: USER_FILTER_SUBSCRIPTION_NOT_SUBSCRIBED,
                        value: USER_FILTER_SUBSCRIPTION_NOT_SUBSCRIBED,
                    },
                ]}
            />
            <div className="flex justify-between">
                <FormSubmit name="apply" text={USER_FILTER_APPLY_BTN} />
                <Button name="cancel" variant="soft">
                    {POPUP_CANCEL_ACTION}
                </Button>
            </div>
        </Form>
    );
}

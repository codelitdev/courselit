import React, { useState, useMemo } from "react";
import {
    POPUP_CANCEL_ACTION,
    USER_FILTER_APPLY_BTN,
    USER_FILTER_CATEGORY_COMMUNITY,
    USER_FILTER_COMMUNITY_HAS,
    USER_FILTER_COMMUNITY_DOES_NOT_HAVE,
    USER_FILTER_COMMUNITY_DROPDOWN_LABEL,
} from "@ui-config/strings";
import { AppDispatch } from "@courselit/state-management";
import { DropdownMenuLabel } from "@components/ui/dropdown-menu";
import {
    Button,
    Form,
    FormSubmit,
    Select,
    useToast,
} from "@courselit/components-library";
import { Address } from "@courselit/common-models";
import { useCommunities } from "@/hooks/use-communities";

interface ProductFilterEditorProps {
    onApply: (...args: any[]) => any;
    address: Address;
    dispatch?: AppDispatch;
}

export default function CommunityFilterEditor({
    onApply,
    address,
    dispatch,
}: ProductFilterEditorProps) {
    const [condition, setCondition] = useState(USER_FILTER_COMMUNITY_HAS);
    const [value, setValue] = useState("");
    const { toast } = useToast();
    const { communities, loading } = useCommunities(1, 1_000_000);

    const onSubmit = (e: any) => {
        e.preventDefault();
        const buttonName = e.nativeEvent.submitter.name;
        if (buttonName === "apply") {
            onApply({
                condition,
                value,
                valueLabel: communities.find((x) => x.communityId === value)
                    ?.name,
            });
        } else {
            onApply();
        }
    };

    const communityOptions = useMemo(() => {
        const options: { label: string; value: string; disabled?: boolean }[] =
            communities.map((community) => ({
                label: community.name,
                value: community.communityId,
            }));
        return options;
    }, [communities]);

    return (
        <Form className="flex flex-col gap-2 p-2" onSubmit={onSubmit}>
            <DropdownMenuLabel>
                {USER_FILTER_CATEGORY_COMMUNITY}
            </DropdownMenuLabel>
            <Select
                value={condition}
                onChange={setCondition}
                title=""
                options={[
                    {
                        label: USER_FILTER_COMMUNITY_HAS,
                        value: USER_FILTER_COMMUNITY_HAS,
                    },
                    {
                        label: USER_FILTER_COMMUNITY_DOES_NOT_HAVE,
                        value: USER_FILTER_COMMUNITY_DOES_NOT_HAVE,
                    },
                ]}
            />
            <Select
                options={communityOptions}
                value={value}
                title=""
                variant="without-label"
                onChange={setValue}
                placeholderMessage={USER_FILTER_COMMUNITY_DROPDOWN_LABEL}
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

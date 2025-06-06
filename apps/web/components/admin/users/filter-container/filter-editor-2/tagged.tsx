import { Address } from "@courselit/common-models";
import {
    Button,
    Form,
    FormSubmit,
    Select,
    useToast,
} from "@courselit/components-library";
import { AppDispatch } from "@courselit/state-management";
import { FetchBuilder } from "@courselit/utils";
import {
    TOAST_TITLE_ERROR,
    POPUP_CANCEL_ACTION,
    USER_FILTER_APPLY_BTN,
    USER_FILTER_CATEGORY_TAGGED,
    USER_FILTER_PRODUCT_DOES_NOT_HAVE,
    USER_FILTER_PRODUCT_HAS,
    USER_FILTER_TAGGED_DROPDOWN_LABEL,
} from "@ui-config/strings";
import React, { useState } from "react";
import { useCallback } from "react";
import { useMemo } from "react";
import { DropdownMenuLabel } from "@components/ui/dropdown-menu";
import { useEffect } from "react";

interface TaggedFilterEditorProps {
    onApply: (...args: any[]) => any;
    address: Address;
    dispatch?: AppDispatch;
}

export default function TaggedFilterEditor({
    onApply,
    address,
    dispatch,
}: TaggedFilterEditorProps) {
    const [condition, setCondition] = useState(USER_FILTER_PRODUCT_HAS);
    const [value, setValue] = useState("");
    const [tags, setTags] = useState([]);
    const { toast } = useToast();

    const getTags = useCallback(async () => {
        const query = `
            query {
                tags
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            const response = await fetch.exec();
            if (response.tags) {
                setTags(response.tags);
            }
        } catch (err) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        }
    }, [address.backend, dispatch]);

    useEffect(() => {
        getTags();
    }, [getTags]);

    const onSubmit = (e: any) => {
        e.preventDefault();
        const buttonName = e.nativeEvent.submitter.name;
        if (buttonName === "apply") {
            onApply({ condition, value });
        } else {
            onApply();
        }
    };

    const tagOptions = useMemo(() => {
        const options: { label: string; value: string; disabled?: boolean }[] =
            tags.map((tag) => ({
                label: tag,
                value: tag,
            }));
        return options;
    }, [tags]);

    return (
        <Form className="flex flex-col gap-2 p-2" onSubmit={onSubmit}>
            <DropdownMenuLabel>{USER_FILTER_CATEGORY_TAGGED}</DropdownMenuLabel>
            <Select
                value={condition}
                onChange={setCondition}
                title=""
                options={[
                    {
                        label: USER_FILTER_PRODUCT_HAS,
                        value: USER_FILTER_PRODUCT_HAS,
                    },
                    {
                        label: USER_FILTER_PRODUCT_DOES_NOT_HAVE,
                        value: USER_FILTER_PRODUCT_DOES_NOT_HAVE,
                    },
                ]}
            />
            <Select
                options={tagOptions}
                value={value}
                title=""
                variant="without-label"
                onChange={setValue}
                placeholderMessage={USER_FILTER_TAGGED_DROPDOWN_LABEL}
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

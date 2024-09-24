"use client";

import { useState } from "react";
import { Item } from "../settings";
import {
    TextEditor,
    Button,
    Form,
    FormField,
    Tooltip,
    AdminWidgetPanel,
} from "@courselit/components-library";
import { Address } from "@courselit/common-models";
import { Checkbox } from "@courselit/components-library";

interface ItemProps {
    item: Item;
    index: number;
    onChange: (newItemData: Item) => void;
    onDelete: () => void;
    address: Address;
    pricingSwitcherEnabled?: boolean;
}

export default function ItemEditor({
    item,
    onChange,
    onDelete,
    address,
    pricingSwitcherEnabled = false,
}: ItemProps) {
    const [title, setTitle] = useState(item.title);
    const [description, setDescription] = useState(item.description);
    const [price, setPrice] = useState(item.price);
    const [priceYearly, setPriceYearly] = useState(item.priceYearly);
    const [features, setFeatures] = useState(item.features);
    const [action, setAction] = useState(item.action);
    const [primary, setPrimary] = useState(item.primary);

    const itemChanged = () =>
        onChange({
            title,
            description,
            price,
            priceYearly,
            features,
            action,
            primary,
        });

    return (
        <AdminWidgetPanel title="Edit item">
            <Form className="flex flex-col gap-4 mb-4">
                <FormField
                    label="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
                <div>
                    <p className="mb-1 font-medium">Description</p>
                    <TextEditor
                        initialContent={description}
                        onChange={(state: any) => setDescription(state)}
                        showToolbar={false}
                        url={address.backend}
                    />
                </div>
                <FormField
                    label="Price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                />
                {pricingSwitcherEnabled && (
                    <FormField
                        label="Yearly price"
                        value={priceYearly}
                        onChange={(e) => setPriceYearly(e.target.value)}
                    />
                )}
                <FormField
                    label="Features"
                    value={features}
                    onChange={(e) => setFeatures(e.target.value)}
                />
                <div className="flex justify-between">
                    <div className="flex grow items-center gap-1">
                        <p className="font-medium">Is recommended</p>
                    </div>
                    <Checkbox
                        checked={primary}
                        onChange={(value: boolean) => setPrimary(value)}
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <h2 className="text-lg font-medium">Call to action</h2>
                    <FormField
                        label="Label"
                        value={action.label}
                        onChange={(e) =>
                            setAction(
                                Object.assign({}, action, {
                                    label: e.target.value,
                                }),
                            )
                        }
                    />
                    <FormField
                        label="Href"
                        value={action.href}
                        onChange={(e) =>
                            setAction(
                                Object.assign({}, action, {
                                    href: e.target.value,
                                }),
                            )
                        }
                    />
                    {pricingSwitcherEnabled && (
                        <FormField
                            label="Href (Yearly)"
                            value={action.yearlyHref}
                            onChange={(e) =>
                                setAction(
                                    Object.assign({}, action, {
                                        yearlyHref: e.target.value,
                                    }),
                                )
                            }
                        />
                    )}
                </div>
                <div className="flex justify-between">
                    <Tooltip title="Delete">
                        <Button
                            component="button"
                            onClick={onDelete}
                            variant="soft"
                        >
                            Delete
                        </Button>
                    </Tooltip>
                    <Tooltip title="Go back">
                        <Button component="button" onClick={itemChanged}>
                            Done
                        </Button>
                    </Tooltip>
                </div>
            </Form>
        </AdminWidgetPanel>
    );
}

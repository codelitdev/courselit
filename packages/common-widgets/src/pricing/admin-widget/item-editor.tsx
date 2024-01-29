import React, { useState } from "react";
import { Item } from "../settings";
import {
    TextEditor,
    Button,
    Form,
    FormField,
    Tooltip,
    AdminWidgetPanel,
} from "@courselit/components-library";
import { Address, Auth, Profile } from "@courselit/common-models";
import { AppDispatch } from "@courselit/state-management";

interface ItemProps {
    item: Item;
    index: number;
    onChange: (newItemData: Item) => void;
    onDelete: () => void;
    address: Address;
    dispatch: AppDispatch;
    auth: Auth;
    profile: Profile;
}

export default function ItemEditor({
    item,
    onChange,
    onDelete,
    dispatch,
}: ItemProps) {
    const [title, setTitle] = useState(item.title);
    const [description, setDescription] = useState(item.description);
    const [price, setPrice] = useState(item.price);
    const [features, setFeatures] = useState(item.features);
    const [action, setAction] = useState(item.action);

    const itemChanged = () =>
        onChange({
            title,
            description,
            price,
            features,
            action,
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
                    />
                </div>
                <FormField
                    label="Price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                />
                <FormField
                    label="Features"
                    value={features}
                    onChange={(e) => setFeatures(e.target.value)}
                />
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
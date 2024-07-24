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
    address,
}: ItemProps) {
    const [title, setTitle] = useState(item.title);
    const [description, setDescription] = useState(item.description);

    const itemChanged = () =>
        onChange({
            title,
            description,
        });

    return (
        <div className="flex flex-col">
            <Form>
                <AdminWidgetPanel title="Edit item">
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
                </AdminWidgetPanel>
            </Form>
        </div>
    );
}

"use client";

import React, { useEffect, useState } from "react";
import Settings, { Item } from "../settings";
import ItemEditor from "./item-editor";
import { Address, Auth, Profile, Alignment } from "@courselit/common-models";
import { AppDispatch } from "@courselit/state-management";
import {
    AdminWidgetPanel,
    ColorSelector,
    Select,
    TextEditor,
    Button,
    Form,
    FormField,
    ContentPaddingSelector,
    CssIdField,
} from "@courselit/components-library";
import {
    verticalPadding as defaultVerticalPadding,
    horizontalPadding as defaultHorizontalPadding,
} from "../defaults";

export interface AdminWidgetProps {
    settings: Settings;
    onChange: (...args: any[]) => void;
    address: Address;
    dispatch: AppDispatch;
    auth: Auth;
    profile: Profile;
    hideActionButtons: (
        e: boolean,
        preservedStateAcrossRerender: Record<string, unknown>,
    ) => void;
    preservedStateAcrossRerender: Record<string, unknown>;
}

export default function AdminWidget({
    settings,
    onChange,
    auth,
    profile,
    dispatch,
    address,
    hideActionButtons,
    preservedStateAcrossRerender,
}: AdminWidgetProps) {
    const dummyDescription: Record<string, unknown> = {
        type: "doc",
        content: [
            {
                type: "paragraph",
                content: [
                    {
                        type: "text",
                        text: "Optional text goes here. You can use rich text here.",
                    },
                ],
            },
        ],
    };
    const dummyItemDescription: Record<string, unknown> = {
        type: "doc",
        content: [
            {
                type: "paragraph",
                content: [
                    {
                        type: "text",
                        text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
                    },
                ],
            },
        ],
    };
    const dummyItem: Item = {
        title: "Item",
        description: dummyItemDescription,
    };
    const [title, setTitle] = useState(settings.title || "FAQs");
    const [description, setDescription] = useState(
        settings.description || dummyDescription,
    );
    const [backgroundColor, setBackgroundColor] = useState(
        settings.backgroundColor,
    );
    const [foregroundColor, setForegroundColor] = useState(
        settings.foregroundColor,
    );
    const [items, setItems] = useState<Item[]>(
        settings.items || [dummyItem, dummyItem, dummyItem],
    );
    const [headerAlignment, setHeaderAlignment] = useState<Alignment>(
        settings.headerAlignment || "center",
    );
    const [itemBeingEditedIndex, setItemBeingEditedIndex] = useState(-1);
    const [horizontalPadding, setHorizontalPadding] = useState<number>(
        settings.horizontalPadding || defaultHorizontalPadding,
    );
    const [verticalPadding, setVerticalPadding] = useState<number>(
        settings.verticalPadding || defaultVerticalPadding,
    );
    const [cssId, setCssId] = useState(settings.cssId);

    const onSettingsChanged = () =>
        onChange({
            title,
            description,
            headerAlignment,
            backgroundColor,
            foregroundColor,
            items,
            horizontalPadding,
            verticalPadding,
            cssId,
        });

    useEffect(() => {
        onSettingsChanged();
    }, [
        title,
        description,
        headerAlignment,
        backgroundColor,
        foregroundColor,
        items,
        horizontalPadding,
        verticalPadding,
        cssId,
    ]);

    const onItemChange = (newItemData: Item) => {
        items[itemBeingEditedIndex] = newItemData;
        setItems([...items]);
        setItemBeingEditedIndex(-1);
        hideActionButtons(false, {});
    };

    const onDelete = () => {
        items.splice(itemBeingEditedIndex, 1);
        setItems([...items]);
        setItemBeingEditedIndex(-1);
        hideActionButtons(false, {});
    };

    useEffect(() => {
        if (typeof preservedStateAcrossRerender.selectedItem === "number") {
            if (preservedStateAcrossRerender.selectedItem === items.length) {
                setItems([...items, dummyItem]);
            }
            setItemBeingEditedIndex(preservedStateAcrossRerender.selectedItem);
        }
    }, [preservedStateAcrossRerender]);

    const addNewItem = () => {
        hideActionButtons(true, { selectedItem: items.length });
    };

    if (itemBeingEditedIndex !== -1) {
        return (
            <ItemEditor
                item={items[itemBeingEditedIndex]}
                index={itemBeingEditedIndex}
                onChange={onItemChange}
                onDelete={onDelete}
                auth={auth}
                profile={profile}
                dispatch={dispatch}
                address={address}
            />
        );
    }

    return (
        <div className="flex flex-col gap-4 mb-4">
            <AdminWidgetPanel title="Header">
                <Form>
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
                </Form>
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Items">
                <ul className="flex flex-col gap-2">
                    {items.map((item: Item, index: number) => (
                        <li
                            key={item.title}
                            onClick={() => {
                                hideActionButtons(true, {
                                    selectedItem: index,
                                });
                            }}
                            className="p-1 border border-transparent hover:border-slate-300 rounded"
                        >
                            {item.title}
                        </li>
                    ))}
                </ul>
                <div>
                    <Button component="button" onClick={addNewItem}>
                        Add new item
                    </Button>
                </div>
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Design">
                <ColorSelector
                    title="Background color"
                    value={backgroundColor || "inherit"}
                    onChange={(value?: string) => setBackgroundColor(value)}
                />
                <ColorSelector
                    title="Text color"
                    value={foregroundColor || "inherit"}
                    onChange={(value?: string) => setForegroundColor(value)}
                />
                <Select
                    title="Header alignment"
                    value={headerAlignment}
                    options={[
                        { label: "Left", value: "left" },
                        { label: "Center", value: "center" },
                    ]}
                    onChange={(value: Alignment) => setHeaderAlignment(value)}
                />
                <ContentPaddingSelector
                    className="mb-2"
                    value={horizontalPadding}
                    min={50}
                    onChange={setHorizontalPadding}
                />
                <ContentPaddingSelector
                    variant="vertical"
                    className="mb-2"
                    value={verticalPadding}
                    onChange={setVerticalPadding}
                />
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Advanced">
                <CssIdField value={cssId} onChange={setCssId} />
            </AdminWidgetPanel>
        </div>
    );
}

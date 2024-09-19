"use client";

import React, { useEffect, useState } from "react";
import Settings, { Item } from "../settings";
import ItemEditor from "./item-editor";
import { Address, Profile, Alignment } from "@courselit/common-models";
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
    PageBuilderSlider,
} from "@courselit/components-library";
import {
    verticalPadding as defaultVerticalPadding,
    horizontalPadding as defaultHorizontalPadding,
    columns as defaultColumns,
} from "../defaults";

export interface AdminWidgetProps {
    settings: Settings;
    onChange: (...args: any[]) => void;
    address: Address;
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
    profile,
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
                        text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
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
    const [title, setTitle] = useState(settings.title || "Grid");
    const [description, setDescription] = useState(
        settings.description || dummyDescription,
    );
    const [buttonAction, setButtonAction] = useState(settings.buttonAction);
    const [buttonCaption, setButtonCaption] = useState(settings.buttonCaption);
    const [backgroundColor, setBackgroundColor] = useState(
        settings.backgroundColor,
    );
    const [foregroundColor, setForegroundColor] = useState(
        settings.foregroundColor,
    );
    const [buttonBackground, setButtonBackground] = useState(
        settings.buttonBackground,
    );
    const [buttonForeground, setButtonForeground] = useState(
        settings.buttonForeground,
    );
    const [items, setItems] = useState<Item[]>(
        settings.items || [dummyItem, dummyItem, dummyItem],
    );
    const [headerAlignment, setHeaderAlignment] = useState<Alignment>(
        settings.headerAlignment || "center",
    );
    const [itemsAlignment, setItemsAlignment] = useState<Alignment>(
        settings.itemsAlignment || "center",
    );
    const [itemBeingEditedIndex, setItemBeingEditedIndex] = useState(-1);
    const [horizontalPadding, setHorizontalPadding] = useState<number>(
        settings.horizontalPadding || defaultHorizontalPadding,
    );
    const [verticalPadding, setVerticalPadding] = useState<number>(
        settings.verticalPadding || defaultVerticalPadding,
    );
    const [itemBackgroundColor, setItemBackgroundColor] = useState(
        settings.itemBackgroundColor,
    );
    const [itemForegroundColor, setItemForegroundColor] = useState(
        settings.itemForegroundColor,
    );
    const [itemBorderColor, setItemBorderColor] = useState(
        settings.itemBorderColor,
    );
    const [itemBorderRadius, setItemBorderRadius] = useState(
        settings.itemBorderRadius || 8,
    );
    const [cssId, setCssId] = useState(settings.cssId);
    const [columns, setColumns] = useState(settings.columns || defaultColumns);

    const onSettingsChanged = () =>
        onChange({
            title,
            description,
            headerAlignment,
            buttonAction,
            buttonCaption,
            backgroundColor,
            foregroundColor,
            buttonBackground,
            buttonForeground,
            items,
            itemsAlignment,
            horizontalPadding,
            verticalPadding,
            itemBackgroundColor,
            itemForegroundColor,
            itemBorderColor,
            itemBorderRadius,
            cssId,
            columns,
        });

    useEffect(() => {
        onSettingsChanged();
    }, [
        title,
        description,
        headerAlignment,
        buttonAction,
        buttonCaption,
        backgroundColor,
        foregroundColor,
        buttonBackground,
        buttonForeground,
        items,
        itemsAlignment,
        horizontalPadding,
        verticalPadding,
        itemBackgroundColor,
        itemForegroundColor,
        itemBorderColor,
        itemBorderRadius,
        cssId,
        columns,
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
                profile={profile}
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
                </Form>
                <div>
                    <p className="mb-1 font-medium">Description</p>
                    <TextEditor
                        initialContent={description}
                        onChange={(state: any) => setDescription(state)}
                        showToolbar={false}
                        url={address.backend}
                    />
                </div>
                <Select
                    title="Header alignment"
                    value={headerAlignment}
                    options={[
                        { label: "Left", value: "left" },
                        { label: "Center", value: "center" },
                    ]}
                    onChange={(value: Alignment) => setHeaderAlignment(value)}
                />
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Call to action">
                <Form>
                    <FormField
                        label="Button Text"
                        value={buttonCaption}
                        onChange={(e) => setButtonCaption(e.target.value)}
                    />
                    <FormField
                        label="Button Action"
                        value={buttonAction}
                        onChange={(e) => setButtonAction(e.target.value)}
                        fullWidth
                    />
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
                <Select
                    title="Items alignment"
                    value={itemsAlignment}
                    options={[
                        { label: "Left", value: "left" },
                        { label: "Center", value: "center" },
                    ]}
                    onChange={(value: Alignment) => setItemsAlignment(value)}
                />
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
                <ColorSelector
                    title="Item background color"
                    value={itemBackgroundColor || "inherit"}
                    onChange={(value?: string) => setItemBackgroundColor(value)}
                />
                <ColorSelector
                    title="Item text color"
                    value={itemForegroundColor || "inherit"}
                    onChange={(value?: string) => setItemForegroundColor(value)}
                />
                <ColorSelector
                    title="Item border color"
                    value={itemBorderColor || "inherit"}
                    onChange={(value?: string) => setItemBorderColor(value)}
                />
                <ColorSelector
                    title="CTA button background color"
                    value={buttonBackground || "inherit"}
                    onChange={(value?: string) => setButtonBackground(value)}
                />
                <ColorSelector
                    title="CTA button text color"
                    value={buttonForeground || "inherit"}
                    onChange={(value?: string) => setButtonForeground(value)}
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
                    min={32}
                    onChange={setVerticalPadding}
                />
                <PageBuilderSlider
                    title="Item border radius"
                    max={40}
                    min={0}
                    value={itemBorderRadius}
                    onChange={setItemBorderRadius}
                />
                <PageBuilderSlider
                    title="Columns"
                    min={2}
                    max={3}
                    value={columns}
                    onChange={setColumns}
                />
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Advanced">
                <CssIdField value={cssId} onChange={setCssId} />
            </AdminWidgetPanel>
        </div>
    );
}

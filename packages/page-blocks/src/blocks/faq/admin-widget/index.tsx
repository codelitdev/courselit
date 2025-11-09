import React, { useEffect, useState } from "react";
import Settings, { Item } from "../settings";
import ItemEditor from "./item-editor";
import { Address, Auth, Profile, Alignment } from "@courselit/common-models";
import { Theme, ThemeStyle } from "@courselit/page-models";
import {
    AdminWidgetPanel,
    AdminWidgetPanelContainer,
    Select,
    TextEditor,
    Button,
    Form,
    FormField,
    CssIdField,
    MaxWidthSelector,
    VerticalPaddingSelector,
    DragAndDrop,
    IconButton,
} from "@courselit/components-library";
import { Edit } from "@courselit/icons";
import { generateUniqueId } from "@courselit/utils";

export interface AdminWidgetProps {
    settings: Settings;
    onChange: (...args: any[]) => void;
    address: Address;
    auth: Auth;
    profile: Profile;
    hideActionButtons: (
        e: boolean,
        preservedStateAcrossRerender: Record<string, unknown>,
    ) => void;
    preservedStateAcrossRerender: Record<string, unknown>;
    theme: Theme;
}

export default function AdminWidget({
    settings,
    onChange,
    auth,
    profile,
    address,
    hideActionButtons,
    preservedStateAcrossRerender,
    theme,
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
    const [items, setItems] = useState<Item[]>(
        settings.items || [dummyItem, dummyItem, dummyItem],
    );
    const [headerAlignment, setHeaderAlignment] = useState<Alignment>(
        settings.headerAlignment || "center",
    );
    const [itemBeingEditedIndex, setItemBeingEditedIndex] =
        useState<number>(-1);
    const [maxWidth, setMaxWidth] = useState<
        ThemeStyle["structure"]["page"]["width"]
    >(settings.maxWidth);
    const [verticalPadding, setVerticalPadding] = useState<
        ThemeStyle["structure"]["section"]["padding"]["y"]
    >(settings.verticalPadding);
    const [cssId, setCssId] = useState(settings.cssId);
    const [layout, setLayout] = useState(settings.layout || "vertical");

    const onSettingsChanged = () =>
        onChange({
            title,
            description,
            headerAlignment,
            items,
            maxWidth,
            verticalPadding,
            cssId,
            itemBeingEditedIndex,
            layout,
        });

    useEffect(() => {
        onSettingsChanged();
    }, [
        title,
        description,
        headerAlignment,
        items,
        maxWidth,
        verticalPadding,
        cssId,
        itemBeingEditedIndex,
        layout,
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
                address={address}
            />
        );
    }

    return (
        <AdminWidgetPanelContainer
            type="multiple"
            defaultValue={["header", "items", "design"]}
        >
            <AdminWidgetPanel title="Header" value="header">
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
                            mediaType="page"
                        />
                    </div>
                </Form>
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Items" value="items">
                <DragAndDrop
                    items={items.map((item: Item) => ({
                        item,
                        id: generateUniqueId(),
                    }))}
                    Renderer={({ item }) => (
                        <div className="flex justify-between items-center w-full">
                            <p>{item.title}</p>
                            <IconButton
                                variant="soft"
                                onClick={() => {
                                    hideActionButtons(true, {
                                        selectedItem: items.findIndex(
                                            (i) => i.title === item.title,
                                        ),
                                    });
                                }}
                            >
                                <Edit />
                            </IconButton>
                        </div>
                    )}
                    onChange={(newItems: { item: Item }[]) => {
                        const itemsInNewOrder: Item[] = [];
                        for (const item of newItems) {
                            itemsInNewOrder.push(Object.assign({}, item.item));
                        }
                        setItems(itemsInNewOrder);
                    }}
                />
                <div>
                    <Button component="button" onClick={addNewItem}>
                        Add new item
                    </Button>
                </div>
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Design" value="design">
                <Select
                    title="Header alignment"
                    value={headerAlignment}
                    options={[
                        { label: "Left", value: "left" },
                        { label: "Center", value: "center" },
                    ]}
                    onChange={(value: Alignment) => setHeaderAlignment(value)}
                />
                <Select
                    title="Layout"
                    value={layout}
                    options={[
                        { label: "Horizontal", value: "horizontal" },
                        { label: "Vertical", value: "vertical" },
                    ]}
                    onChange={(value: "horizontal" | "vertical") =>
                        setLayout(value)
                    }
                />
                <MaxWidthSelector
                    value={maxWidth || theme.theme.structure.page.width}
                    onChange={setMaxWidth}
                />
                <VerticalPaddingSelector
                    value={
                        verticalPadding ||
                        theme.theme.structure.section.padding.y
                    }
                    onChange={setVerticalPadding}
                />
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Advanced" value="advanced">
                <CssIdField value={cssId} onChange={setCssId} />
            </AdminWidgetPanel>
        </AdminWidgetPanelContainer>
    );
}

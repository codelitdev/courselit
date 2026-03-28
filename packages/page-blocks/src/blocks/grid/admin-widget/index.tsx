import React, { useEffect, useState } from "react";
import Settings, { Item, SvgStyle } from "../settings";
import ItemEditor from "./item-editor";
import {
    Address,
    Profile,
    Alignment,
    TextEditorContent,
} from "@courselit/common-models";
import {
    AdminWidgetPanel,
    AdminWidgetPanelContainer,
    Select,
    Button,
    Form,
    FormField,
    CssIdField,
    PageBuilderSlider,
    MaxWidthSelector,
    VerticalPaddingSelector,
    Button2,
    Checkbox,
    Tooltip,
} from "@courselit/components-library";
import { columns as defaultColumns } from "../defaults";
import { Theme, ThemeStyle } from "@courselit/page-models";
import { PencilIcon, WandSparkles, HelpCircle } from "lucide-react";
import SvgStyleEditor from "./svg-style-editor";
import { Editor } from "@courselit/text-editor";

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
    theme: Theme;
}

export default function AdminWidget({
    settings,
    onChange,
    profile,
    address,
    hideActionButtons,
    preservedStateAcrossRerender,
    theme,
}: AdminWidgetProps): JSX.Element {
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
    const dummyItemDescription: TextEditorContent = {
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
    const [maxWidth, setMaxWidth] = useState<
        ThemeStyle["structure"]["page"]["width"]
    >(settings.maxWidth);
    const [verticalPadding, setVerticalPadding] = useState<
        ThemeStyle["structure"]["section"]["padding"]["y"]
    >(settings.verticalPadding);
    const [cssId, setCssId] = useState(settings.cssId);
    const [columns, setColumns] = useState(settings.columns || defaultColumns);
    const [svgStyle, setSvgStyle] = useState<SvgStyle>(
        settings.svgStyle || {
            width: 36,
            height: 36,
            svgColor: "#000000",
            backgroundColor: "#ffffff",
            borderRadius: 8,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "#e2e8f0",
        },
    );
    const [svgInline, setSvgInline] = useState(settings.svgInline || false);
    const [editingSvgStyle, setEditingSvgStyle] = useState(false);

    const onSettingsChanged = () =>
        onChange({
            title,
            description,
            headerAlignment,
            buttonAction,
            buttonCaption,
            items,
            itemsAlignment,
            maxWidth,
            verticalPadding,
            cssId,
            columns,
            svgStyle,
            svgInline,
        });

    useEffect(() => {
        onSettingsChanged();
    }, [
        title,
        description,
        headerAlignment,
        buttonAction,
        buttonCaption,
        items,
        itemsAlignment,
        maxWidth,
        verticalPadding,
        cssId,
        columns,
        svgStyle,
        svgInline,
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
                svgStyle={svgStyle}
            />
        );
    }

    if (editingSvgStyle) {
        return (
            <SvgStyleEditor
                svgStyle={svgStyle}
                onChange={(style: SvgStyle) => {
                    setSvgStyle(style);
                    setEditingSvgStyle(false);
                    hideActionButtons(false, {});
                }}
            />
        );
    }

    return (
        <AdminWidgetPanelContainer
            type="multiple"
            defaultValue={["header", "call-to-action", "items", "design"]}
        >
            <AdminWidgetPanel title="Header" value="header">
                <Form>
                    <FormField
                        label="Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </Form>
                <div>
                    <p className="mb-1 font-medium">Description</p>
                    <Editor
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
            <AdminWidgetPanel title="Call to action" value="call-to-action">
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
                    />
                </Form>
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Items" value="items">
                <div className="flex flex-col gap-4">
                    {items.map((item, index) => (
                        <div
                            key={index}
                            className="flex flex-col gap-2 p-2 border rounded"
                        >
                            <div className="flex justify-between items-center">
                                <h3 className="font-medium">
                                    {item.title || "Untitled"}
                                </h3>
                                <Button2
                                    size="icon"
                                    variant="outline"
                                    onClick={() => {
                                        setItemBeingEditedIndex(index);
                                        hideActionButtons(true, {});
                                    }}
                                >
                                    <PencilIcon className="w-4 h-4" />
                                </Button2>
                            </div>
                        </div>
                    ))}
                    <Button component="button" onClick={addNewItem}>
                        Add new item
                    </Button>
                </div>
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Design" value="design">
                <Select
                    title="Items alignment"
                    value={itemsAlignment}
                    options={[
                        { label: "Left", value: "left" },
                        { label: "Center", value: "center" },
                    ]}
                    onChange={(value: Alignment) => setItemsAlignment(value)}
                />
                <PageBuilderSlider
                    title="Columns"
                    value={columns}
                    onChange={setColumns}
                    min={2}
                    max={3}
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
                <div className="flex justify-between mt-2">
                    <div className="flex grow items-center gap-1">
                        <p>Icon inline</p>
                        <Tooltip title="The icon (if used) will show inline with the item header">
                            <HelpCircle className="w-4 h-4" />
                        </Tooltip>
                    </div>
                    <Checkbox
                        checked={svgInline}
                        onChange={(value: boolean) => setSvgInline(value)}
                    />
                </div>
                <div className="flex justify-between mt-2">
                    <div className="flex grow items-center gap-1">
                        <p>Icon style</p>
                    </div>
                    <Button2
                        size="icon"
                        variant="outline"
                        onClick={() => {
                            setEditingSvgStyle(true);
                            hideActionButtons(true, {});
                        }}
                    >
                        <WandSparkles className="w-4 h-4" />
                    </Button2>
                </div>
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Advanced" value="advanced">
                <CssIdField value={cssId} onChange={setCssId} />
            </AdminWidgetPanel>
        </AdminWidgetPanelContainer>
    );
}

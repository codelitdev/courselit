import React, { useEffect, useState } from "react";
import Settings, { Item } from "../settings";
import ItemEditor from "./item-editor";
import { Address, Alignment } from "@courselit/common-models";
import {
    AdminWidgetPanel,
    AdminWidgetPanelContainer,
    Select,
    TextEditor,
    Form,
    FormField,
    CssIdField,
    Checkbox,
    VerticalPaddingSelector,
    MaxWidthSelector,
    Button,
    Button2,
} from "@courselit/components-library";
import { columns as defaultColumns } from "../defaults";
import { PageBuilderSlider } from "@courselit/components-library";
import { Theme, ThemeStyle } from "@courselit/page-models";
import { PencilIcon } from "lucide-react";

export interface AdminWidgetProps {
    settings: Settings;
    onChange: (...args: any[]) => void;
    address: Address;
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
                        text: "Optional text goes here. You can use rich text here.",
                    },
                ],
            },
        ],
    };
    const dummyItem: Item = {
        title: "Plan",
        description: dummyItemDescription,
        price: "$10",
        features: "Feature 1, Feature 2, Feature 3",
        primary: false,
        action: {
            label: "Buy now",
            href: "https://courselit.com",
        },
    };
    const [title, setTitle] = useState(settings.title || "Pricing");
    const [description, setDescription] = useState(
        settings.description || dummyDescription,
    );
    const [items, setItems] = useState<Item[]>(
        settings.items || [
            dummyItem,
            Object.assign({}, dummyItem, { primary: true }),
            dummyItem,
        ],
    );
    const [headerAlignment, setHeaderAlignment] = useState<Alignment>(
        settings.headerAlignment || "center",
    );
    const [itemBeingEditedIndex, setItemBeingEditedIndex] = useState(-1);
    const [maxWidth, setMaxWidth] = useState<
        ThemeStyle["structure"]["page"]["width"]
    >(settings.maxWidth);
    const [verticalPadding, setVerticalPadding] = useState<
        ThemeStyle["structure"]["section"]["padding"]["y"]
    >(settings.verticalPadding);
    const [pricingSwitcher, setPricingSwitcher] = useState(
        typeof settings.pricingSwitcher !== "undefined"
            ? settings.pricingSwitcher
            : false,
    );
    const [cssId, setCssId] = useState(settings.cssId);
    const [columns, setColumns] = useState(settings.columns || defaultColumns);
    const [monthlyPriceCaption, setMonthlyPriceCaption] = useState(
        settings.monthlyPriceCaption || "Monthly",
    );
    const [yearlyPriceCaption, setYearlyPriceCaption] = useState(
        settings.yearlyPriceCaption || "Yearly",
    );

    const onSettingsChanged = () =>
        onChange({
            title,
            description,
            headerAlignment,
            items,
            maxWidth,
            verticalPadding,
            cssId,
            columns,
            pricingSwitcher,
            monthlyPriceCaption,
            yearlyPriceCaption,
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
        columns,
        pricingSwitcher,
        monthlyPriceCaption,
        yearlyPriceCaption,
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
                address={address}
                pricingSwitcherEnabled={pricingSwitcher}
            />
        );
    }

    return (
        <AdminWidgetPanelContainer
            type="multiple"
            defaultValue={["header", "plans", "design"]}
        >
            <AdminWidgetPanel title="Header" value="header">
                <Form className="flex flex-col gap-4">
                    <FormField
                        label="Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                    <div className="mb-4">
                        <p className="mb-1 font-medium">Description</p>
                        <TextEditor
                            initialContent={description}
                            onChange={(state: any) => setDescription(state)}
                            showToolbar={false}
                            url={address.backend}
                            mediaType="page"
                        />
                    </div>
                    <div className="flex justify-between">
                        <div className="flex grow items-center gap-1">
                            <p>Show pricing switcher</p>
                        </div>
                        <Checkbox
                            checked={pricingSwitcher}
                            onChange={(value: boolean) =>
                                setPricingSwitcher(value)
                            }
                        />
                    </div>
                    {pricingSwitcher && (
                        <>
                            <FormField
                                label="Monthly price caption"
                                value={monthlyPriceCaption}
                                onChange={(e) =>
                                    setMonthlyPriceCaption(e.target.value)
                                }
                            />
                            <FormField
                                label="Yearly price caption"
                                value={yearlyPriceCaption}
                                onChange={(e) =>
                                    setYearlyPriceCaption(e.target.value)
                                }
                            />
                        </>
                    )}
                </Form>
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Plans" value="plans">
                <div className="flex flex-col gap-4">
                    {items.map((item: Item, index: number) => (
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
                        Add new plan
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
                <PageBuilderSlider
                    title="Number of columns"
                    value={columns}
                    min={2}
                    max={3}
                    onChange={setColumns}
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

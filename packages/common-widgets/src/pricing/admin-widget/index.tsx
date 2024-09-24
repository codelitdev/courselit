"use client";

import React, { useEffect, useState } from "react";
import Settings, { Item } from "../settings";
import ItemEditor from "./item-editor";
import { Address, Alignment } from "@courselit/common-models";
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
    Checkbox,
} from "@courselit/components-library";
import {
    verticalPadding as defaultVerticalPadding,
    horizontalPadding as defaultHorizontalPadding,
    columns as defaultColumns,
} from "../defaults";
import { PageBuilderSlider } from "@courselit/components-library";

export interface AdminWidgetProps {
    settings: Settings;
    onChange: (...args: any[]) => void;
    address: Address;
    hideActionButtons: (
        e: boolean,
        preservedStateAcrossRerender: Record<string, unknown>,
    ) => void;
    preservedStateAcrossRerender: Record<string, unknown>;
}

export default function AdminWidget({
    settings,
    onChange,
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
    const [backgroundColor, setBackgroundColor] = useState(
        settings.backgroundColor,
    );
    const [foregroundColor, setForegroundColor] = useState(
        settings.foregroundColor,
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
    const [horizontalPadding, setHorizontalPadding] = useState<number>(
        settings.horizontalPadding || defaultHorizontalPadding,
    );
    const [verticalPadding, setVerticalPadding] = useState<number>(
        settings.verticalPadding || defaultVerticalPadding,
    );
    const [buttonBackground, setButtonBackground] = useState(
        settings.buttonBackground,
    );
    const [buttonForeground, setButtonForeground] = useState(
        settings.buttonForeground,
    );
    const [primaryButtonBackground, setPrimaryButtonBackground] = useState(
        settings.primaryButtonBackground,
    );
    const [planTitleColor, setPlanTitleColor] = useState(
        settings.planTitleColor,
    );
    const [cardBorderColor, setCardBorderColor] = useState(
        settings.cardBorderColor,
    );
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
            backgroundColor,
            foregroundColor,
            items,
            horizontalPadding,
            verticalPadding,
            buttonBackground,
            buttonForeground,
            primaryButtonBackground,
            cardBorderColor,
            cssId,
            columns,
            planTitleColor,
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
        backgroundColor,
        foregroundColor,
        items,
        horizontalPadding,
        verticalPadding,
        buttonBackground,
        buttonForeground,
        primaryButtonBackground,
        cardBorderColor,
        cssId,
        columns,
        planTitleColor,
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
        <div className="flex flex-col gap-4 mb-4">
            <AdminWidgetPanel title="Header">
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
            <AdminWidgetPanel title="Plans">
                <ul className="flex flex-col gap-2">
                    {items.map((item: Item, index: number) => (
                        <li
                            key={index}
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
                        Add new plan
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
                <ColorSelector
                    title="Button background color"
                    value={buttonBackground || "inherit"}
                    onChange={(value?: string) => setButtonBackground(value)}
                />
                <ColorSelector
                    title="Button text color"
                    value={buttonForeground || "inherit"}
                    onChange={(value?: string) => setButtonForeground(value)}
                />
                <ColorSelector
                    title="Primary button background color"
                    value={primaryButtonBackground || "inherit"}
                    onChange={(value?: string) =>
                        setPrimaryButtonBackground(value)
                    }
                />
                <ColorSelector
                    title="Card border color"
                    value={cardBorderColor || "inherit"}
                    onChange={(value?: string) => setCardBorderColor(value)}
                />
                <ColorSelector
                    title="Plan title color"
                    value={planTitleColor || "inherit"}
                    onChange={(value?: string) => setPlanTitleColor(value)}
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

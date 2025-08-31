import React, { useEffect, useState } from "react";
import Settings, { Item } from "../settings";
import {
    direction as defaultDirection,
    speed as defaultSpeed,
    pauseOnHover as defaultPauseOnHover,
    fadeWidth as defaultFadeWidth,
    itemBorderWidth as defaultItemBorderWidth,
    itemBorderRadius as defaultItemBorderRadius,
    itemBorderStyle as defaultItemBorderStyle,
} from "../defaults";
import {
    CssIdField,
    AdminWidgetPanel,
    AdminWidgetPanelContainer,
    ColorSelector,
    Select,
    PageBuilderSlider,
    Tooltip,
    Checkbox,
    Button,
    MaxWidthSelector,
    VerticalPaddingSelector,
} from "@courselit/components-library";
import { Help } from "@courselit/icons";
import ItemEditor from "./item-editor";
import { Theme, ThemeStyle } from "@courselit/page-models";
import { truncate } from "@courselit/utils";

export default function AdminWidget({
    settings,
    onChange,
    hideActionButtons,
    preservedStateAcrossRerender,
    theme,
}: {
    settings: Settings;
    onChange: (...args: any[]) => void;
    hideActionButtons: (
        e: boolean,
        preservedStateAcrossRerender: Record<string, unknown>,
    ) => void;
    preservedStateAcrossRerender: Record<string, unknown>;
    theme: Theme;
}) {
    const [items, setItems] = useState(
        settings.items || [
            {
                // title: "Item 1",
                href: "https://courselit.app",
                text: "Add text",
            },
            {
                // title: "Item 2",
                svgText: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-armchair-icon lucide-armchair"><path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"/><path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z"/><path d="M5 18v2"/><path d="M19 18v2"/></svg>`,
            },
            {
                // title: "Item 3",
                text: "Or SVG icons",
            },
            {
                // title: "Item 4",
                svgText: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-apple-icon lucide-apple"><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/><path d="M10 2c1 .5 2 2 2 5"/></svg>`,
            },
        ],
    );
    const [scrollEffect, setScrollEffect] = useState(
        settings.scrollEffect || {
            direction: defaultDirection,
            speed: defaultSpeed,
            pauseOnHover: defaultPauseOnHover,
        },
    );
    const [itemStyle, setItemStyle] = useState(
        settings.itemStyle || {
            backgroundColor: undefined,
            foregroundColor: undefined,
            borderColor: undefined,
            borderRadius: defaultItemBorderRadius,
            borderWidth: defaultItemBorderWidth,
            borderStyle: defaultItemBorderStyle,
        },
    );
    const [fadeEffect, setFadeEffect] = useState(
        settings.fadeEffect || {
            width: defaultFadeWidth,
        },
    );
    const [maxWidth, setMaxWidth] = useState<
        ThemeStyle["structure"]["page"]["width"]
    >(settings.maxWidth);
    const [verticalPadding, setVerticalPadding] = useState<
        ThemeStyle["structure"]["section"]["padding"]["y"]
    >(settings.verticalPadding);
    const [cssId, setCssId] = useState(settings.cssId);
    const [itemBeingEditedIndex, setItemBeingEditedIndex] = useState(-1);

    useEffect(() => {
        onChange({
            items,
            scrollEffect,
            itemStyle,
            fadeEffect,
            maxWidth,
            verticalPadding,
            cssId,
        });
    }, [
        items,
        scrollEffect,
        itemStyle,
        fadeEffect,
        maxWidth,
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
                setItems([...items, { text: `Item ${items.length + 1}` }]);
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
            />
        );
    }

    return (
        <AdminWidgetPanelContainer
            type="multiple"
            defaultValue={["content", "scroll-effect", "fade-effect", "design"]}
        >
            <AdminWidgetPanel title="Content" value="content">
                <p className="text-sm text-muted-foreground mb-2">
                    Add text or SVG Icons.
                </p>
                <ul className="flex flex-col gap-2 mb-2">
                    {items.map((item: Item, index: number) => (
                        <li
                            key={item.text || item.svgText}
                            onClick={() => {
                                hideActionButtons(true, {
                                    selectedItem: index,
                                });
                            }}
                            className="p-1 border border-transparent hover:border-slate-300 rounded"
                        >
                            {item.svgText ? (
                                <div
                                    dangerouslySetInnerHTML={{
                                        __html: item.svgText,
                                    }}
                                    className="w-4 h-4"
                                />
                            ) : (
                                truncate(item.text, 20)
                            )}
                        </li>
                    ))}
                </ul>
                <div>
                    <Button onClick={addNewItem}>Add new item</Button>
                </div>
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Scroll Effect" value="scroll-effect">
                <p className="text-sm text-muted-foreground">
                    Control how the marquee scrolls.
                </p>
                <Select
                    title="Direction"
                    value={scrollEffect.direction}
                    onChange={(value?: string) =>
                        setScrollEffect({ ...scrollEffect, direction: value })
                    }
                    options={[
                        { label: "Left to Right", value: "left" },
                        { label: "Right to Left", value: "right" },
                    ]}
                />
                <PageBuilderSlider
                    title="Speed"
                    max={100}
                    min={10}
                    value={scrollEffect.speed}
                    onChange={(value?: number) =>
                        setScrollEffect({ ...scrollEffect, speed: value })
                    }
                />
                <div className="flex justify-between mt-2">
                    <div className="flex grow items-center gap-1">
                        <p>Pause on hover</p>
                        <Tooltip title="The marquee will pause when the mouse is over it">
                            <Help className="w-4 h-4" />
                        </Tooltip>
                    </div>
                    <Checkbox
                        checked={scrollEffect.pauseOnHover}
                        onChange={(value: boolean) =>
                            setScrollEffect({
                                ...scrollEffect,
                                pauseOnHover: value,
                            })
                        }
                    />
                </div>
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Fade Effect" value="fade-effect">
                <p className="text-sm text-muted-foreground">
                    The marquee will fade out on the sides.
                </p>
                <PageBuilderSlider
                    title="Fade width"
                    max={200}
                    min={0}
                    value={fadeEffect.width}
                    onChange={(value?: number) =>
                        setFadeEffect({ ...fadeEffect, width: value })
                    }
                />
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Design" value="design">
                <ColorSelector
                    title="Item background color"
                    value={itemStyle.backgroundColor || "inherit"}
                    onChange={(value?: string) =>
                        setItemStyle({ ...itemStyle, backgroundColor: value })
                    }
                />
                <ColorSelector
                    title="Item foreground color"
                    value={itemStyle.foregroundColor || "inherit"}
                    onChange={(value?: string) =>
                        setItemStyle({ ...itemStyle, foregroundColor: value })
                    }
                />
                <ColorSelector
                    title="Border color"
                    value={itemStyle.borderColor || "inherit"}
                    onChange={(value?: string) =>
                        setItemStyle({ ...itemStyle, borderColor: value })
                    }
                />
                <PageBuilderSlider
                    title="Border radius"
                    min={0}
                    max={50}
                    value={itemStyle.borderRadius}
                    onChange={(value?: number) =>
                        setItemStyle({ ...itemStyle, borderRadius: value })
                    }
                />
                <PageBuilderSlider
                    title="Border width"
                    min={0}
                    max={10}
                    value={itemStyle.borderWidth}
                    onChange={(value?: number) =>
                        setItemStyle({ ...itemStyle, borderWidth: value })
                    }
                />
                <Select
                    title="Border style"
                    value={itemStyle.borderStyle}
                    options={[
                        { label: "Solid", value: "solid" },
                        { label: "Dashed", value: "dashed" },
                        { label: "Dotted", value: "dotted" },
                        { label: "Double", value: "double" },
                        { label: "None", value: "none" },
                    ]}
                    onChange={(
                        value:
                            | "solid"
                            | "dashed"
                            | "dotted"
                            | "double"
                            | "none",
                    ) =>
                        setItemStyle({
                            ...itemStyle,
                            borderStyle: value,
                        })
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

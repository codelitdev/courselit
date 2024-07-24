"use client";

import React, { useEffect, useState } from "react";
import {
    AdminWidgetPanel,
    ColorSelector,
    Select,
    TextEditor,
    ContentPaddingSelector,
    PageBuilderSlider,
} from "@courselit/components-library";
import Settings from "./settings";
import { Address, HorizontalAlignment } from "@courselit/common-models";
import {
    verticalPadding as defaultVerticalPadding,
    horizontalPadding as defaultHorizontalPadding,
    fontSize as defaultFontSize,
} from "./defaults";
import { CssIdField } from "@courselit/components-library";

export interface AboutWidgetProps {
    onChange: (...args: any[]) => void;
    settings: Settings;
    address: Address;
}

const AdminWidget = ({ settings, onChange, address }: AboutWidgetProps) => {
    const dummyText: Record<string, unknown> = {
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
    const [content, setContent] = useState(settings.text || dummyText);
    const [alignment, setAlignment] = useState<HorizontalAlignment>(
        settings.alignment || "left",
    );
    const [backgroundColor, setBackgroundColor] = useState(
        settings.backgroundColor,
    );
    const [color, setColor] = useState(settings.color);
    const [horizontalPadding, setHorizontalPadding] = useState<number>(
        settings.horizontalPadding || defaultHorizontalPadding,
    );
    const [verticalPadding, setVerticalPadding] = useState<number>(
        settings.verticalPadding || defaultVerticalPadding,
    );
    const [cssId, setCssId] = useState(settings.cssId);
    const [fontSize, setFontSize] = useState(
        settings.fontSize || defaultFontSize,
    );

    useEffect(() => {
        onChange({
            text: content,
            alignment,
            color,
            backgroundColor,
            horizontalPadding,
            verticalPadding,
            cssId,
            fontSize,
        });
    }, [
        content,
        alignment,
        color,
        backgroundColor,
        horizontalPadding,
        verticalPadding,
        cssId,
        fontSize,
    ]);

    return (
        <div className="flex flex-col gap-4 mb-4">
            <AdminWidgetPanel title="Basic">
                <div>
                    <p className="mb-1 font-medium">Text</p>
                    <TextEditor
                        initialContent={content}
                        onChange={(state: any) => setContent(state)}
                        showToolbar={false}
                        url={address.backend}
                    />
                </div>
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Design">
                <ColorSelector
                    title="Text color"
                    value={color || "inherit"}
                    onChange={(value?: string) => setColor(value)}
                />
                <ColorSelector
                    title="Background color"
                    value={backgroundColor || ""}
                    onChange={(value?: string) => setBackgroundColor(value)}
                />
                <Select
                    title="Alignment"
                    value={alignment}
                    options={[
                        { label: "Left", value: "left" },
                        { label: "Center", value: "center" },
                        { label: "Right", value: "right" },
                    ]}
                    onChange={(value: HorizontalAlignment) =>
                        setAlignment(value)
                    }
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
                    title="Font size"
                    min={1}
                    max={12}
                    value={fontSize}
                    onChange={setFontSize}
                />
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Advanced">
                <CssIdField value={cssId} onChange={setCssId} />
            </AdminWidgetPanel>
        </div>
    );
};

export default AdminWidget;

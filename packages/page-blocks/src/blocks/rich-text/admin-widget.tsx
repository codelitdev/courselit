import React, { useEffect, useState } from "react";
import {
    AdminWidgetPanel,
    ColorSelector,
    Select,
    TextEditor,
    PageBuilderSlider,
    VerticalPaddingSelector,
    MaxWidthSelector,
} from "@courselit/components-library";
import Settings from "./settings";
import { Address, HorizontalAlignment } from "@courselit/common-models";
import { fontSize as defaultFontSize } from "./defaults";
import { CssIdField } from "@courselit/components-library";
import type { Theme, ThemeStyle } from "@courselit/page-models";

export interface AboutWidgetProps {
    onChange: (...args: any[]) => void;
    settings: Settings;
    address: Address;
    theme: Theme;
}

const AdminWidget = ({
    settings,
    onChange,
    address,
    theme,
}: AboutWidgetProps) => {
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
    const [maxWidth, setMaxWidth] = useState<
        ThemeStyle["structure"]["page"]["width"]
    >(settings.maxWidth);
    const [verticalPadding, setVerticalPadding] = useState<
        ThemeStyle["structure"]["section"]["verticalPadding"]
    >(settings.verticalPadding);
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
            verticalPadding,
            maxWidth,
            cssId,
            fontSize,
        });
    }, [
        content,
        alignment,
        color,
        backgroundColor,
        maxWidth,
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
                {/* <ContentPaddingSelector
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
                /> */}
                <PageBuilderSlider
                    title="Font size"
                    min={1}
                    max={12}
                    value={fontSize}
                    onChange={setFontSize}
                />
                <MaxWidthSelector
                    value={maxWidth || theme.theme.structure.page.width}
                    onChange={setMaxWidth}
                />
                <VerticalPaddingSelector
                    value={
                        verticalPadding ||
                        theme.theme.structure.section.verticalPadding
                    }
                    onChange={setVerticalPadding}
                />
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Advanced">
                <CssIdField value={cssId} onChange={setCssId} />
            </AdminWidgetPanel>
        </div>
    );
};

export default AdminWidget;

import React, { useEffect, useState } from "react";
import {
    AdminWidgetPanel,
    ColorSelector,
    Select,
    TextEditor,
} from "@courselit/components-library";
import Settings from "./settings";
import { Alignment } from "@courselit/common-models";

export interface AboutWidgetProps {
    onChange: (...args: any[]) => void;
    settings: Settings;
}

const AdminWidget = ({ settings, onChange }: AboutWidgetProps) => {
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
    const [alignment, setAlignment] = useState<Alignment | "right">(
        settings.alignment || "left",
    );
    const [backgroundColor, setBackgroundColor] = useState(
        settings.backgroundColor,
    );
    const [color, setColor] = useState(settings.color);

    useEffect(() => {
        onChange({
            text: content,
            alignment,
            color,
            backgroundColor,
        });
    }, [content, alignment, color, backgroundColor]);

    return (
        <div className="flex flex-col">
            <div className="mb-4">
                <AdminWidgetPanel title="Basic">
                    <div>
                        <p className="mb-1 font-medium">Text</p>
                        <TextEditor
                            initialContent={content}
                            onChange={(state: any) => setContent(state)}
                            showToolbar={false}
                        />
                    </div>
                </AdminWidgetPanel>
            </div>
            <div className="mb-4">
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
                        onChange={(value: Alignment) => setAlignment(value)}
                    />
                </AdminWidgetPanel>
            </div>
        </div>
    );
};

export default AdminWidget;

import * as React from "react";
import { Alignment } from "@courselit/common-models";
import { useEffect, useState } from "react";
import Settings from "./settings";
import {
    AdminWidgetPanel,
    ColorSelector,
    Select,
    TextEditor,
    Form,
    FormField,
} from "@courselit/components-library";

interface AdminWidgetProps {
    settings: Settings;
    onChange: (...args: any[]) => void;
}
export default function AdminWidget({ settings, onChange }: AdminWidgetProps) {
    const [title, setTitle] = useState(settings.title || "Content");
    const [description, setDescription] = useState(settings.description);
    const [headerAlignment, setHeaderAlignment] = useState<Alignment>(
        settings.headerAlignment || "center",
    );
    const [backgroundColor, setBackgroundColor] = useState(
        settings.backgroundColor,
    );
    const [foregroundColor, setForegroundColor] = useState(
        settings.foregroundColor,
    );
    const [badgeBackgroundColor, setBadgeBackgroundColor] = useState(
        settings.badgeBackgroundColor,
    );
    const [badgeForegroundColor, setBadgeForegroundColor] = useState(
        settings.badgeForegroundColor,
    );

    useEffect(() => {
        onChange({
            title,
            description,
            headerAlignment,
            backgroundColor,
            foregroundColor,
            badgeBackgroundColor,
            badgeForegroundColor,
        });
    }, [
        title,
        description,
        headerAlignment,
        backgroundColor,
        foregroundColor,
        badgeBackgroundColor,
        badgeForegroundColor,
    ]);

    return (
        <div className="flex flex-col">
            <div className="mb-4">
                <Form>
                    <AdminWidgetPanel title="Header">
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
                            />
                        </div>
                        <Select
                            title="Header alignment"
                            value={headerAlignment}
                            options={[
                                { label: "Left", value: "left" },
                                { label: "Center", value: "center" },
                            ]}
                            onChange={(value: Alignment) =>
                                setHeaderAlignment(value)
                            }
                        />
                    </AdminWidgetPanel>
                </Form>
            </div>
            <div className="mb-4">
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
                        title="Badge color"
                        value={badgeBackgroundColor || "inherit"}
                        onChange={(value?: string) =>
                            setBadgeBackgroundColor(value)
                        }
                    />
                    <ColorSelector
                        title="Badge text color"
                        value={badgeForegroundColor || "inherit"}
                        onChange={(value?: string) =>
                            setBadgeForegroundColor(value)
                        }
                    />
                </AdminWidgetPanel>
            </div>
        </div>
    );
}

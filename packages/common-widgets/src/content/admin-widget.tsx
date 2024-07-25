"use client";

import * as React from "react";
import { Address, Alignment } from "@courselit/common-models";
import { useEffect, useState } from "react";
import Settings from "./settings";
import {
    AdminWidgetPanel,
    ColorSelector,
    Select,
    TextEditor,
    Form,
    FormField,
    ContentPaddingSelector,
    CssIdField,
} from "@courselit/components-library";
import {
    verticalPadding as defaultVerticalPadding,
    horizontalPadding as defaultHorizontalPadding,
} from "./defaults";

interface AdminWidgetProps {
    settings: Settings;
    onChange: (...args: any[]) => void;
    address: Address;
}
export default function AdminWidget({
    settings,
    onChange,
    address,
}: AdminWidgetProps) {
    const [title, setTitle] = useState(settings.title || "Curriculum");
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
    const [horizontalPadding, setHorizontalPadding] = useState<number>(
        settings.horizontalPadding || defaultHorizontalPadding,
    );
    const [verticalPadding, setVerticalPadding] = useState<number>(
        settings.verticalPadding || defaultVerticalPadding,
    );
    const [cssId, setCssId] = useState(settings.cssId);

    useEffect(() => {
        onChange({
            title,
            description,
            headerAlignment,
            backgroundColor,
            foregroundColor,
            badgeBackgroundColor,
            badgeForegroundColor,
            horizontalPadding,
            verticalPadding,
            cssId,
        });
    }, [
        title,
        description,
        headerAlignment,
        backgroundColor,
        foregroundColor,
        badgeBackgroundColor,
        badgeForegroundColor,
        horizontalPadding,
        verticalPadding,
        cssId,
    ]);

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
                <ContentPaddingSelector
                    value={horizontalPadding}
                    min={50}
                    onChange={setHorizontalPadding}
                />
                <ContentPaddingSelector
                    variant="vertical"
                    value={verticalPadding}
                    onChange={setVerticalPadding}
                />
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Advanced">
                <CssIdField value={cssId} onChange={setCssId} />
            </AdminWidgetPanel>
        </div>
    );
}

import * as React from "react";
import { Address, Alignment } from "@courselit/common-models";
import { useEffect, useState } from "react";
import Settings from "./settings";
import {
    AdminWidgetPanel,
    Select,
    TextEditor,
    Form,
    FormField,
    CssIdField,
    MaxWidthSelector,
    VerticalPaddingSelector,
} from "@courselit/components-library";
import { Theme, ThemeStyle } from "@courselit/page-models";

interface AdminWidgetProps {
    settings: Settings;
    onChange: (...args: any[]) => void;
    address: Address;
    theme: Theme;
}
export default function AdminWidget({
    settings,
    onChange,
    address,
    theme,
}: AdminWidgetProps): JSX.Element {
    const [title, setTitle] = useState(settings.title || "Curriculum");
    const [description, setDescription] = useState(settings.description);
    const [headerAlignment, setHeaderAlignment] = useState<Alignment>(
        settings.headerAlignment || "center",
    );
    const [maxWidth, setMaxWidth] = useState<
        ThemeStyle["structure"]["page"]["width"]
    >(settings.maxWidth);
    const [verticalPadding, setVerticalPadding] = useState<
        ThemeStyle["structure"]["section"]["padding"]["y"]
    >(settings.verticalPadding);
    const [cssId, setCssId] = useState(settings.cssId);

    useEffect(() => {
        onChange({
            title,
            description,
            headerAlignment,
            maxWidth,
            verticalPadding,
            cssId,
        });
    }, [title, description, headerAlignment, maxWidth, verticalPadding, cssId]);

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
                <MaxWidthSelector value={maxWidth} onChange={setMaxWidth} />
                <VerticalPaddingSelector
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

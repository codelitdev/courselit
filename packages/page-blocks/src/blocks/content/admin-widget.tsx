import * as React from "react";
import { Address, Alignment } from "@courselit/common-models";
import { useEffect, useState } from "react";
import Settings from "./settings";
import {
    AdminWidgetPanel,
    AdminWidgetPanelContainer,
    Select,
    Form,
    FormField,
    CssIdField,
    MaxWidthSelector,
    VerticalPaddingSelector,
    Tooltip,
    Checkbox,
} from "@courselit/components-library";
import { Theme, ThemeStyle } from "@courselit/page-models";
import { Editor } from "@courselit/text-editor";
import { Help } from "@courselit/icons";

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
    const [openByDefault, setOpenByDefault] = useState(
        settings.openByDefault || false,
    );

    useEffect(() => {
        onChange({
            title,
            description,
            headerAlignment,
            maxWidth,
            verticalPadding,
            openByDefault,
            cssId,
        });
    }, [
        title,
        description,
        headerAlignment,
        maxWidth,
        verticalPadding,
        openByDefault,
        cssId,
    ]);

    return (
        <AdminWidgetPanelContainer
            type="multiple"
            defaultValue={["header", "design"]}
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
            <AdminWidgetPanel title="Design" value="design">
                <MaxWidthSelector value={maxWidth} onChange={setMaxWidth} />
                <VerticalPaddingSelector
                    value={verticalPadding}
                    onChange={setVerticalPadding}
                />
                <div className="flex justify-between">
                    <div className="flex grow items-center gap-1">
                        <p>Open by default</p>
                        <Tooltip title="All the sections will be expanded by default">
                            <Help />
                        </Tooltip>
                    </div>
                    <Checkbox
                        checked={openByDefault}
                        onChange={(value: boolean) => setOpenByDefault(value)}
                    />
                </div>
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Advanced" value="advanced">
                <CssIdField value={cssId} onChange={setCssId} />
            </AdminWidgetPanel>
        </AdminWidgetPanelContainer>
    );
}

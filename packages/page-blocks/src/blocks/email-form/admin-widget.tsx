import React, { useEffect, useState } from "react";
import type { Address } from "@courselit/common-models";
import { AppDispatch } from "@courselit/state-management";
import type Settings from "./settings";
import {
    AdminWidgetPanel,
    ColorSelector,
    Select,
    Form,
    FormField,
    CssIdField,
    MaxWidthSelector,
    VerticalPaddingSelector,
} from "@courselit/components-library";
import {
    DEFAULT_BTN_TEXT,
    DEFAULT_FAILURE_MESSAGE,
    DEFAULT_SUCCESS_MESSAGE,
    DEFAULT_TITLE,
} from "./defaults";
import { Theme, ThemeStyle } from "@courselit/page-models";

interface AdminWidgetProps {
    name: string;
    settings: Settings;
    onChange: (...args: any[]) => void;
    address: Address;
    networkAction: boolean;
    dispatch: AppDispatch;
    theme: Theme;
}

export default function AdminWidget({
    settings,
    onChange,
    theme,
}: AdminWidgetProps): JSX.Element {
    const [title, setTitle] = useState(settings.title);
    const [subtitle, setSubtitle] = useState(settings.subtitle);
    const [btnText, setBtnText] = useState(settings.btnText);
    const [successMessage, setSuccessMessage] = useState(
        settings.successMessage,
    );
    const [failureMessage, setFailureMessage] = useState(
        settings.failureMessage,
    );
    const [backgroundColor, setBackgroundColor] = useState(
        settings.backgroundColor,
    );
    const [foregroundColor, setForegroundColor] = useState(
        settings.foregroundColor,
    );
    const [btnBackgroundColor, setBtnBackgroundColor] = useState(
        settings.btnBackgroundColor,
    );
    const [btnForegroundColor, setBtnForegroundColor] = useState(
        settings.btnForegroundColor,
    );
    const [alignment, setAlignment] = useState(settings.alignment || "left");
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
            subtitle,
            btnText,
            backgroundColor,
            foregroundColor,
            btnBackgroundColor,
            btnForegroundColor,
            alignment,
            successMessage,
            failureMessage,
            maxWidth,
            verticalPadding,
            cssId,
        });
    }, [
        title,
        subtitle,
        btnText,
        backgroundColor,
        foregroundColor,
        btnBackgroundColor,
        btnForegroundColor,
        alignment,
        successMessage,
        failureMessage,
        maxWidth,
        verticalPadding,
        cssId,
    ]);

    return (
        <div className="flex flex-col gap-4 mb-4">
            <AdminWidgetPanel title="Basic">
                <Form>
                    <FormField
                        label="Title"
                        value={title}
                        placeholder={DEFAULT_TITLE}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                    <FormField
                        label="Subtitle"
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                    />
                    <FormField
                        label="Success message"
                        value={successMessage}
                        placeholder={DEFAULT_SUCCESS_MESSAGE}
                        onChange={(e) => setSuccessMessage(e.target.value)}
                    />
                    <FormField
                        label="Failure message"
                        value={failureMessage}
                        placeholder={DEFAULT_FAILURE_MESSAGE}
                        onChange={(e) => setFailureMessage(e.target.value)}
                    />
                </Form>
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Call to action">
                <Form
                    onSubmit={(e) => {
                        e.preventDefault();
                    }}
                >
                    <FormField
                        label="Button text"
                        value={btnText}
                        placeholder={DEFAULT_BTN_TEXT}
                        onChange={(e) => setBtnText(e.target.value)}
                    />
                </Form>
                <ColorSelector
                    title="Button color"
                    value={btnBackgroundColor || "inherit"}
                    onChange={(value?: string) => setBtnBackgroundColor(value)}
                />
                <ColorSelector
                    title="Button text"
                    value={btnForegroundColor || "inherit"}
                    onChange={(value?: string) => setBtnForegroundColor(value)}
                />
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Design">
                <ColorSelector
                    title="Text color"
                    value={foregroundColor || "inherit"}
                    onChange={(value?: string) => setForegroundColor(value)}
                />
                <ColorSelector
                    title="Background color"
                    value={backgroundColor || "inherit"}
                    onChange={(value?: string) => setBackgroundColor(value)}
                />
                <Select
                    value={alignment}
                    title="Alignment"
                    onChange={(value: Settings["alignment"]) =>
                        setAlignment(value)
                    }
                    options={[
                        { label: "Left", value: "left" },
                        { label: "Center", value: "center" },
                        { label: "Right", value: "right" },
                    ]}
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
            <AdminWidgetPanel title="Advanced">
                <CssIdField value={cssId} onChange={setCssId} />
            </AdminWidgetPanel>
        </div>
    );
}

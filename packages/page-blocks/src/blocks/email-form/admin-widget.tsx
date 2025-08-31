import React, { useEffect, useState } from "react";
import type { Address } from "@courselit/common-models";
import { AppDispatch } from "@courselit/state-management";
import type Settings from "./settings";
import {
    AdminWidgetPanel,
    AdminWidgetPanelContainer,
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
        alignment,
        successMessage,
        failureMessage,
        maxWidth,
        verticalPadding,
        cssId,
    ]);

    return (
        <AdminWidgetPanelContainer
            type="multiple"
            defaultValue={["basic", "call-to-action", "design"]}
        >
            <AdminWidgetPanel title="Basic" value="basic">
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
            <AdminWidgetPanel title="Call to action" value="call-to-action">
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
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Design" value="design">
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
                <MaxWidthSelector value={maxWidth} onChange={setMaxWidth} />
                <VerticalPaddingSelector
                    value={verticalPadding}
                    onChange={setVerticalPadding}
                />
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Advanced" value="advanced">
                <CssIdField value={cssId} onChange={setCssId} />
            </AdminWidgetPanel>
        </AdminWidgetPanelContainer>
    );
}

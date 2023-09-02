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
} from "@courselit/components-library";
import {
    DEFAULT_BTN_TEXT,
    DEFAULT_FAILURE_MESSAGE,
    DEFAULT_SUCCESS_MESSAGE,
    DEFAULT_TITLE,
} from "./constants";

interface AdminWidgetProps {
    name: string;
    settings: Settings;
    onChange: (...args: any[]) => void;
    address: Address;
    networkAction: boolean;
    dispatch: AppDispatch;
}

export default function AdminWidget({ settings, onChange }: AdminWidgetProps) {
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
    ]);

    return (
        <div className="flex flex-col">
            <div className="mb-4">
                <Form>
                    <AdminWidgetPanel title="Basic">
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
                    </AdminWidgetPanel>
                </Form>
            </div>
            <div className="mb-4">
                <Form>
                    <AdminWidgetPanel title="Call to action">
                        <FormField
                            label="Button text"
                            value={btnText}
                            placeholder={DEFAULT_BTN_TEXT}
                            onChange={(e) => setBtnText(e.target.value)}
                        />
                        <ColorSelector
                            title="Button color"
                            value={btnBackgroundColor || "inherit"}
                            onChange={(value?: string) =>
                                setBtnBackgroundColor(value)
                            }
                        />
                        <ColorSelector
                            title="Button text"
                            value={btnForegroundColor || "inherit"}
                            onChange={(value?: string) =>
                                setBtnForegroundColor(value)
                            }
                        />
                    </AdminWidgetPanel>
                </Form>
            </div>
            <div className="mb-4">
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
                </AdminWidgetPanel>
            </div>
        </div>
    );
}

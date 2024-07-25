"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import Settings from "../settings";
import {
    TextEditor,
    Select,
    ColorSelector,
    AdminWidgetPanel,
    Form,
    FormField,
} from "@courselit/components-library";
import { Address, Alignment } from "@courselit/common-models";
import { DEFAULT_FAILURE_MESSAGE, DEFAULT_SUCCESS_MESSAGE } from "../constants";

interface CustomSettingsProps {
    name: string;
    settings: Settings;
    pageData: Record<string, unknown>;
    onChange: (...args: any[]) => void;
    address: Address;
}

export default function CustomSettings({
    settings,
    onChange,
    pageData,
    address,
}: CustomSettingsProps) {
    const defaultSuccessMessage: Record<string, unknown> = {
        type: "doc",
        content: [
            {
                type: "paragraph",
                content: [
                    {
                        type: "text",
                        text: DEFAULT_SUCCESS_MESSAGE,
                    },
                ],
            },
        ],
    };
    const [title, setTitle] = useState(settings.title);
    const [description, setDescription] = useState(settings.description);
    const [buttonCaption, setButtonCaption] = useState(settings.buttonCaption);
    const [buttonAction, setButtonAction] = useState(settings.buttonAction);
    const [alignment, setAlignment] = useState(settings.alignment || "left");
    const [backgroundColor, setBackgroundColor] = useState(
        settings.backgroundColor,
    );
    const [color, setColor] = useState(settings.color);
    const [buttonBackground, setButtonBackground] = useState(
        settings.buttonBackground,
    );
    const [buttonForeground, setButtonForeground] = useState(
        settings.buttonForeground,
    );
    const [textAlignment, setTextAlignment] = useState<Alignment>(
        settings.textAlignment || "left",
    );
    const [successMessage, setSuccessMessage] = useState(
        settings.successMessage || defaultSuccessMessage,
    );
    const [failureMessage, setFailureMessage] = useState(
        settings.failureMessage || DEFAULT_FAILURE_MESSAGE,
    );
    const [editingViewShowSuccess, setEditingViewShowSuccess] = useState<
        "1" | "0"
    >(settings.editingViewShowSuccess || "0");
    const type = Object.keys(pageData).length === 0 ? "site" : "product";

    useEffect(() => {
        onChange({
            title,
            description,
            buttonCaption,
            alignment,
            buttonAction,
            backgroundColor,
            color,
            buttonBackground,
            buttonForeground,
            textAlignment,
            successMessage,
            failureMessage,
            editingViewShowSuccess,
        });
    }, [
        title,
        description,
        buttonCaption,
        alignment,
        buttonAction,
        backgroundColor,
        color,
        buttonBackground,
        buttonForeground,
        textAlignment,
        successMessage,
        failureMessage,
        editingViewShowSuccess,
    ]);

    return (
        <div className="flex flex-col">
            <div className="mb-4">
                <Form
                    onSubmit={(e: React.FormEvent) => {
                        e.preventDefault();
                    }}
                >
                    <AdminWidgetPanel title="Basic">
                        <FormField
                            value={title}
                            label="Custom title"
                            onChange={(e) => setTitle(e.target.value)}
                        />
                        <div>
                            <p className="mb-1 font-medium">
                                Custom description
                            </p>
                            <TextEditor
                                initialContent={description}
                                onChange={(state: any) => setDescription(state)}
                                showToolbar={false}
                                url={address.backend}
                            />
                        </div>
                    </AdminWidgetPanel>
                </Form>
            </div>
            <div className="mb-4">
                <Form>
                    <AdminWidgetPanel title="Call to action">
                        <FormField
                            value={buttonCaption}
                            label="Button caption"
                            onChange={(e) => setButtonCaption(e.target.value)}
                        />
                        {type === "site" && (
                            <FormField
                                value={buttonAction}
                                label="Button Action (URL)"
                                onChange={(e) =>
                                    setButtonAction(e.target.value)
                                }
                            />
                        )}
                        <ColorSelector
                            title="Button color"
                            value={buttonBackground || "inherit"}
                            onChange={(value?: string) =>
                                setButtonBackground(value)
                            }
                        />
                        <ColorSelector
                            title="Button text color"
                            value={buttonForeground || "inherit"}
                            onChange={(value?: string) =>
                                setButtonForeground(value)
                            }
                        />
                        {pageData.costType === "email" && (
                            <>
                                <div>
                                    <p className="mb-1 font-medium">
                                        Success message
                                    </p>
                                    <TextEditor
                                        initialContent={successMessage}
                                        onChange={(state: any) =>
                                            setSuccessMessage(state)
                                        }
                                        showToolbar={false}
                                        url={address.backend}
                                    />
                                </div>
                                <FormField
                                    label="Failure message"
                                    value={failureMessage}
                                    placeholder={DEFAULT_FAILURE_MESSAGE}
                                    onChange={(e) =>
                                        setFailureMessage(e.target.value)
                                    }
                                />
                                <Select
                                    title="Editing view"
                                    value={editingViewShowSuccess}
                                    options={[
                                        { label: "Before submit", value: "0" },
                                        { label: "After submit", value: "1" },
                                    ]}
                                    onChange={(value: "1" | "0") =>
                                        setEditingViewShowSuccess(value)
                                    }
                                />
                            </>
                        )}
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
                        value={color || "inherit"}
                        onChange={(value?: string) => setColor(value)}
                    />
                    <Select
                        title="Text content position"
                        value={alignment}
                        options={[
                            { label: "Top", value: "top" },
                            { label: "Bottom", value: "bottom" },
                            { label: "Left", value: "left" },
                            { label: "Right", value: "right" },
                        ]}
                        onChange={(value) => setAlignment(value)}
                    />
                    <Select
                        title="Text alignment"
                        value={textAlignment}
                        options={[
                            { label: "Left", value: "left" },
                            { label: "Center", value: "center" },
                        ]}
                        onChange={(value: Alignment) => setTextAlignment(value)}
                    />
                </AdminWidgetPanel>
            </div>
        </div>
    );
}

import * as React from "react";
import { useState, useEffect } from "react";
import Settings from "../settings";
import {
    TextEditor,
    Select,
    AdminWidgetPanel,
    Form,
    FormField,
    VerticalPaddingSelector,
    MaxWidthSelector,
    PageBuilderSlider,
} from "@courselit/components-library";
import {
    Address,
    Alignment,
    Constants,
    PaymentPlan,
} from "@courselit/common-models";
import { DEFAULT_FAILURE_MESSAGE, DEFAULT_SUCCESS_MESSAGE } from "../constants";
import { ThemeStyle } from "@courselit/page-models";

interface CustomSettingsProps {
    name: string;
    settings: Settings;
    pageData: Record<string, unknown>;
    onChange: (...args: any[]) => void;
    address: Address;
    theme: ThemeStyle;
}

export default function CustomSettings({
    settings,
    onChange,
    pageData,
    address,
    theme,
}: CustomSettingsProps): JSX.Element {
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
    const [maxWidth, setMaxWidth] = useState<
        ThemeStyle["structure"]["page"]["width"]
    >(settings.maxWidth);
    const [verticalPadding, setVerticalPadding] = useState<
        ThemeStyle["structure"]["section"]["padding"]["y"]
    >(settings.verticalPadding);
    const [mediaBorderRadius, setMediaBorderRadius] = useState(
        settings.mediaRadius || 2,
    );
    const type = Object.keys(pageData).length === 0 ? "site" : "product";
    const isLeadMagnet =
        type === Constants.PageType.PRODUCT &&
        pageData.leadMagnet &&
        (pageData.paymentPlans as PaymentPlan[]).length === 1 &&
        (pageData.paymentPlans as PaymentPlan[])[0].type ===
            Constants.PaymentPlanType.FREE;

    useEffect(() => {
        onChange({
            title,
            description,
            buttonCaption,
            alignment,
            buttonAction,
            textAlignment,
            successMessage,
            failureMessage,
            editingViewShowSuccess,
            maxWidth,
            verticalPadding,
            mediaRadius: mediaBorderRadius,
        });
    }, [
        title,
        description,
        buttonCaption,
        alignment,
        buttonAction,
        textAlignment,
        successMessage,
        failureMessage,
        editingViewShowSuccess,
        maxWidth,
        verticalPadding,
        mediaBorderRadius,
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
                        {isLeadMagnet && (
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
                    <Select
                        title="Text content position"
                        value={alignment}
                        options={[
                            { label: "Top", value: "top" },
                            { label: "Bottom", value: "bottom" },
                            { label: "Left", value: "left" },
                            { label: "Right", value: "right" },
                        ]}
                        onChange={(
                            value: "top" | "bottom" | "left" | "right",
                        ) => setAlignment(value)}
                    />
                    <Select
                        title="Text alignment"
                        value={textAlignment}
                        options={[
                            { label: "Left", value: "left" },
                            { label: "Center", value: "center" },
                            { label: "Right", value: "right" },
                        ]}
                        onChange={(value: Alignment) => setTextAlignment(value)}
                    />
                    <MaxWidthSelector value={maxWidth} onChange={setMaxWidth} />
                    <VerticalPaddingSelector
                        value={verticalPadding}
                        onChange={setVerticalPadding}
                    />
                    <PageBuilderSlider
                        title="Media border radius"
                        value={mediaBorderRadius}
                        min={0}
                        max={8}
                        onChange={setMediaBorderRadius}
                    />
                </AdminWidgetPanel>
            </div>
        </div>
    );
}

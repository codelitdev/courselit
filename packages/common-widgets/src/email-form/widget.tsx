import React, { FormEvent, useState } from "react";
import { AppMessage } from "@courselit/common-models";
import Settings from "./settings";
import { actionCreators } from "@courselit/state-management";
import { FetchBuilder } from "@courselit/utils";
import { setAppMessage } from "@courselit/state-management/dist/action-creators";
import {
    DEFAULT_BTN_TEXT,
    DEFAULT_FAILURE_MESSAGE,
    DEFAULT_SUCCESS_MESSAGE,
    DEFAULT_TITLE,
} from "./constants";
import type { AppState, AppDispatch } from "@courselit/state-management";
import { Form, FormField, Button2 } from "@courselit/components-library";
import {
    verticalPadding as defaultVerticalPadding,
    horizontalPadding as defaultHorizontalPadding,
} from "./defaults";

export interface WidgetProps {
    settings: Settings;
    state: AppState;
    dispatch: AppDispatch;
}

const Widget = ({
    settings: {
        title,
        subtitle = "Sign up here to get the latest articles, news and updates.",
        btnText,
        backgroundColor,
        foregroundColor,
        btnBackgroundColor,
        btnForegroundColor,
        alignment = "left",
        successMessage,
        failureMessage,
        horizontalPadding = defaultHorizontalPadding,
        verticalPadding = defaultVerticalPadding,
        cssId,
    },
    state,
    dispatch,
}: WidgetProps) => {
    const [email, setEmail] = useState("");
    const justifyContent =
        alignment === "center"
            ? "center"
            : alignment === "right"
            ? "flex-end"
            : "flex-start";

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const mutation = `
            mutation {
                response: createSubscription(email: "${email}")
            }
        `;

        const fetch = new FetchBuilder()
            .setUrl(`${state.address.backend}/api/graph`)
            .setPayload(mutation)
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            dispatch(actionCreators.networkAction(true));
            const response = await fetch.exec();
            if (response.response) {
                dispatch(
                    setAppMessage(
                        new AppMessage(
                            successMessage || DEFAULT_SUCCESS_MESSAGE,
                        ),
                    ),
                );
                setEmail("");
            } else {
                dispatch(
                    setAppMessage(
                        new AppMessage(
                            failureMessage || DEFAULT_FAILURE_MESSAGE,
                        ),
                    ),
                );
            }
        } catch (e) {
            console.error(e.message);
        } finally {
            dispatch(actionCreators.networkAction(false));
        }
    };

    return (
        <section
            className={`py-[${verticalPadding}px]`}
            style={{
                backgroundColor,
                color: foregroundColor,
            }}
            id={cssId}
        >
            <div className="mx-auto lg:max-w-[1200px]">
                <Form
                    onSubmit={onSubmit}
                    className={`flex flex-col px-4 w-full mx-auto lg:max-w-[${horizontalPadding}%]`}
                    style={{
                        alignItems: justifyContent,
                    }}
                >
                    <h2 className="text-4xl mb-4">{title || DEFAULT_TITLE}</h2>
                    {subtitle && <h3 className="mb-4">{subtitle}</h3>}
                    <div className="flex gap-2 items-end">
                        <FormField
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            type="email"
                            required
                            messages={[
                                {
                                    match: "valueMissing",
                                    text: "Your email is required",
                                },
                                {
                                    match: "typeMismatch",
                                    text: "Invalid email",
                                },
                            ]}
                        />
                        <Button2
                            style={{
                                backgroundColor: btnBackgroundColor,
                                color: btnForegroundColor,
                            }}
                            disabled={state.networkAction}
                            type="submit"
                        >
                            {btnText || DEFAULT_BTN_TEXT}
                        </Button2>
                    </div>
                    {/* <FormSubmit
                    style={{
                        backgroundColor: btnBackgroundColor,
                        color: btnForegroundColor,
                    }}
                    disabled={state.networkAction}
                /> */}
                </Form>
            </div>
        </section>
    );
};

export default Widget;

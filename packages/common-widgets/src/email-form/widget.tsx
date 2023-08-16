import React, { FormEvent, useState } from "react";
import { AppMessage } from "@courselit/common-models";
import { Button, TextField } from "@mui/material";
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
        backgroundColor = "#eee",
        foregroundColor,
        btnBackgroundColor,
        btnForegroundColor,
        alignment = "left",
        successMessage,
        failureMessage,
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
                            successMessage || DEFAULT_SUCCESS_MESSAGE
                        )
                    )
                );
                setEmail("");
            } else {
                dispatch(
                    setAppMessage(
                        new AppMessage(
                            failureMessage || DEFAULT_FAILURE_MESSAGE
                        )
                    )
                );
            }
        } catch (e) {
            console.error(e.message);
        } finally {
            dispatch(actionCreators.networkAction(false));
        }
    };

    return (
        <form onSubmit={onSubmit}>
            <div
                className="flex flex-col p-4"
                style={{
                    backgroundColor,
                    color: foregroundColor,
                    alignItems: justifyContent,
                }}
            >
                <h2 className="text-4xl mb-4">{title || DEFAULT_TITLE}</h2>
                {subtitle && <h3 className="mb-4">{subtitle}</h3>}
                <div className="mb-4">
                    <TextField
                        label="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        type="email"
                        required
                    />
                </div>
                <Button
                    sx={{
                        backgroundColor: btnBackgroundColor,
                        color: btnForegroundColor,
                    }}
                    type="submit"
                    disabled={state.networkAction}
                    size="large"
                    variant="contained"
                >
                    {btnText || DEFAULT_BTN_TEXT}
                </Button>
            </div>
        </form>
    );
};

export default Widget;
